const TILE = 32;
const TAU = Math.PI * 2;
const C = {
  ink: '#102d31', deep: '#153d3b', shadow: '#153a35', grass: '#476c47',
  moss: '#668352', leaf: '#417650', light: '#8aa55e', gold: '#e7b76b',
  cream: '#f6e3af', orange: '#db714b', blue: '#79c2c6',
};

function noise(x, y, seed = 0) {
  let n = Math.imul(x + seed * 1297, 374761393) + Math.imul(y + 837, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function rect(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function poly(ctx, color, points) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(Math.round(x), Math.round(y)) : ctx.moveTo(Math.round(x), Math.round(y)));
  ctx.closePath(); ctx.fill();
}
function oval(ctx, color, x, y, rx, ry) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
}
function pixelOval(ctx, color, x, y, rx, ry, step = 3) {
  for (let dy = -ry; dy < ry; dy += step) {
    const half = Math.sqrt(Math.max(0, 1 - ((dy + step / 2) / ry) ** 2)) * rx;
    rect(ctx, color, x - half, y + dy, half * 2, step);
  }
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    canvas.width = 960;
    canvas.height = 540;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.terrain = null;
    this.worldId = null;
    this.camX = 0;
    this.camY = 0;
    this.time = 0;
  }

  render(game, dt = 1 / 60) {
    if (!game.world || !game.player) return;
    this.game = game;
    this.time = game.time || 0;
    const ctx = this.ctx, world = game.world, p = game.player;
    if (this.tiles !== world.tiles || this.worldId !== world.id) {
      this.makeTerrain(world);
      this.camX = p.x; this.camY = p.y;
      this.worldId = world.id;
    }
    const targetX = world.w * TILE < 960 ? world.w * TILE / 2 : Math.max(480, Math.min(world.w * TILE - 480, p.x));
    const targetY = world.h * TILE < 540 ? world.h * TILE / 2 : Math.max(270, Math.min(world.h * TILE - 270, p.y));
    const smooth = 1 - Math.exp(-Math.min(dt, 0.05) * 8);
    this.camX += (targetX - this.camX) * smooth;
    this.camY += (targetY - this.camY) * smooth;
    const shake = game.camera?.shake || 0;
    this.left = Math.round(this.camX - 480 + Math.sin(this.time * 91) * Math.min(shake, 8));
    this.top = Math.round(this.camY - 270 + Math.cos(this.time * 113) * Math.min(shake, 8));
    if (game.camera) { game.camera.x = this.camX; game.camera.y = this.camY; }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    rect(ctx, world.id === 'temple' ? '#0b1f29' : '#173c3b', 0, 0, 960, 540);
    ctx.save(); ctx.translate(-this.left, -this.top);
    ctx.drawImage(this.terrain, 0, 0);
    this.water(world);
    for (const prop of world.props || []) if (this.visible(prop, 120)) this.propShadow(prop);
    for (const enemy of game.enemies || []) if (!enemy.dead && this.visible(enemy)) this.telegraph(enemy);
    this.groundEffects(game.effects || []);
    for (const item of game.pickups || []) if (this.visible(item)) this.pickup(item);
    if (game.nearby) {
      const n = game.nearby;
      ctx.globalAlpha = 0.35 + Math.sin(this.time * 3) * 0.08;
      pixelOval(ctx, '#f1d598', n.x, n.y + 7, 18, 7, 2);
      ctx.globalAlpha = 1;
    }
    const objects = (world.props || []).filter(o => !o.broken && this.visible(o, 120)).map(o => ({ y: o.y + (o.sortOffset || 0), kind: 'prop', obj: o }));
    for (const e of game.enemies || []) if (!e.dead && this.visible(e, 100)) objects.push({ y: e.y, kind: 'enemy', obj: e });
    objects.push({ y: p.y, kind: 'player', obj: p });
    objects.sort((a, b) => a.y - b.y);
    for (const item of objects) {
      if (item.kind === 'prop') this.prop(item.obj);
      else if (item.kind === 'enemy') this.enemy(item.obj);
      else this.player(item.obj);
    }
    for (const projectile of game.projectiles || []) if (this.visible(projectile)) this.projectile(projectile);
    this.airEffects(game.effects || []);
    for (const particle of game.particles || []) {
      if (!this.visible(particle)) continue;
      ctx.globalAlpha = Math.max(0, Math.min(1, particle.life / (particle.maxLife || 0.5)));
      const s = particle.size || 3;
      rect(ctx, particle.color || C.gold, particle.x - s / 2, particle.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    for (const prop of world.props || []) if (this.visible(prop, 120)) this.propLight(prop);
    ctx.restore();
    this.atmosphere(world);
    if (game.transition > 0) {
      ctx.globalAlpha = Math.min(1, game.transition); rect(ctx, '#0b2229', 0, 0, 960, 540); ctx.globalAlpha = 1;
    }
  }

  visible(o, margin = 50) {
    return o.x > this.left - margin && o.x < this.left + 960 + margin && o.y > this.top - margin && o.y < this.top + 540 + margin;
  }

  makeTerrain(world) {
    this.tiles = world.tiles;
    this.terrain = document.createElement('canvas');
    this.terrain.width = world.w * TILE; this.terrain.height = world.h * TILE;
    const ctx = this.terrain.getContext('2d');
    const at = (x, y) => x < 0 || y < 0 || x >= world.w || y >= world.h ? -1 : world.tiles[y * world.w + x];
    for (let y = 0; y < world.h; y++) for (let x = 0; x < world.w; x++) {
      const tile = at(x, y), px = x * TILE, py = y * TILE, n = noise(x, y);
      if (tile === 4) { rect(ctx, '#0b2029', px, py, 32, 32); continue; }
      if (tile === 7 || tile === 8) {
        if (tile === 8) {
          rect(ctx, '#162e37', px, py, 32, 32);
          rect(ctx, '#355057', px + 1, py + 1, 30, 12);
          rect(ctx, '#456266', px + 2, py + 1, 28, 2);
          rect(ctx, '#293f49', px + 2, py + 13, 28, 15);
          rect(ctx, '#1b303b', px, py + 28, 32, 4);
          rect(ctx, '#344d52', px + 15, py + 15, 1, 12);
          if (n > 0.65) { rect(ctx, '#547163', px + 2, py + 2, 11, 3); rect(ctx, '#3a5b53', px + 2, py + 5, 5, 4); }
        } else {
          const colors = ['#2b4248', '#2c444a', '#2e464c', '#2c4148'];
          rect(ctx, colors[Math.floor(n * 4)], px, py, 32, 32);
          rect(ctx, '#233b43', px, py + 30, 32, 2); rect(ctx, '#233b43', px + 30, py, 2, 32);
          rect(ctx, '#3a5155', px + 1, py + 1, 28, 1);
          if (n > 0.7) {
            poly(ctx, '#1f3940', [[px + 8, py], [px + 10, py + 9], [px + 6, py + 15], [px + 13, py + 22], [px + 9, py + 13], [px + 12, py + 8]]);
          }
          if (n < 0.1) { rect(ctx, '#37554f', px + 3, py + 25, 12, 3); rect(ctx, '#466453', px + 3, py + 25, 4, 2); }
        }
        continue;
      }
      if (tile === 2) {
        const colors = ['#285e63', '#2b6569', '#306a6b', '#2c6368'];
        rect(ctx, colors[Math.floor(n * 4)], px, py, 32, 32);
        for (let j = 0; j < 3; j++) {
          const nx = noise(x, y, j + 9), ny = noise(x, y, j + 45);
          rect(ctx, '#38767a', px + 3 + nx * 21, py + 3 + ny * 25, 4 + nx * 7, 1);
        }
        if (at(x, y - 1) !== 2 && at(x, y - 1) !== 6) {
          rect(ctx, '#1b4847', px, py, 32, 7); rect(ctx, '#70a08b', px, py + 6, 32, 2);
        }
        if (at(x - 1, y) !== 2 && at(x - 1, y) !== 6) { rect(ctx, '#1b4948', px, py, 5, 32); rect(ctx, '#65958b', px + 5, py + 5, 2, 27); }
        if (at(x + 1, y) !== 2 && at(x + 1, y) !== 6) { rect(ctx, '#83a48c', px + 29, py, 3, 32); }
        if (at(x, y + 1) !== 2 && at(x, y + 1) !== 6) { rect(ctx, '#83a48c', px, py + 29, 32, 3); rect(ctx, '#376c64', px, py + 26, 32, 2); }
        continue;
      }
      if (tile === 6) {
        rect(ctx, '#304843', px, py, 32, 32);
        for (let j = 0; j < 4; j++) {
          rect(ctx, j % 2 ? '#9d815a' : '#ae8c60', px + 1, py + j * 8, 30, 7);
          rect(ctx, '#c9a773', px + 2, py + j * 8, 28, 1);
          rect(ctx, '#4c5142', px + 4, py + j * 8 + 3, 2, 2); rect(ctx, '#4c5142', px + 26, py + j * 8 + 3, 2, 2);
          if (j % 2) rect(ctx, '#816b4e', px + 11, py + j * 8 + 4, 12, 1);
        }
        continue;
      }
      if (tile === 3) {
        rect(ctx, '#697466', px, py, 32, 32);
        const stones = [[1, 1, 15, 12], [18, 2, 13, 14], [2, 16, 11, 14], [15, 18, 16, 12]];
        for (let i = 0; i < stones.length; i++) {
          const [sx, sy, sw, sh] = stones[i];
          rect(ctx, ['#969681', '#92917c', '#a09c85'][Math.floor(noise(x, y, i + 5) * 3)], px + sx, py + sy, sw, sh);
          rect(ctx, '#b0aa8b', px + sx + 1, py + sy, sw - 2, 2);
          rect(ctx, '#7c8570', px + sx, py + sy + sh - 2, sw, 2);
        }
        continue;
      }
      const path = tile === 1;
      const base = path ? ['#b8a079', '#bba37b', '#b6a077', '#b9a27a'] : ['#4b704c', '#4d714c', '#50754e', '#4e724d'];
      rect(ctx, base[Math.floor(n * 4)], px, py, 32, 32);
      for (let j = 0; j < 11; j++) {
        const nx = noise(x, y, j + 30), ny = noise(x, y, j + 88);
        const tx = px + 2 + nx * 27, ty = py + 2 + ny * 27;
        if (path) {
          rect(ctx, j % 3 === 0 ? '#cfb78b' : '#a58f6c', tx, ty, j % 3 ? 2 : 4, 1);
          if (j === 0 && n > 0.75) { rect(ctx, '#867f61', tx, ty, 4, 3); rect(ctx, '#c4b38a', tx, ty, 3, 1); }
        } else {
          rect(ctx, j % 2 ? '#608252' : '#436848', tx, ty, 3, 2);
          if (j < 4) { rect(ctx, '#779156', tx + 1, ty - 2, 1, 3); rect(ctx, '#628551', tx - 1, ty - 1, 1, 2); }
          if (tile === 5 && j % 3 === 0) {
            rect(ctx, '#324f3d', tx, ty, 1, 5);
            rect(ctx, j % 2 ? '#e2c486' : '#d6cda1', tx - 1, ty - 1, 3, 3);
            rect(ctx, '#ebd8a1', tx, ty - 1, 1, 1);
          }
        }
      }
    }
    // Broken grass margins make the paths feel laid into the meadow.
    for (let y = 0; y < world.h; y++) for (let x = 0; x < world.w; x++) {
      if (at(x, y) !== 1) continue;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const neighbor = at(x + dx, y + dy);
        if (neighbor !== 0 && neighbor !== 5) continue;
        for (let k = 0; k < 8; k++) {
          const depth = Math.floor(noise(x + k, y, dx * 31 + dy * 11) * 5) + 2;
          const px = x * TILE + (dx < 0 ? 0 : dx > 0 ? 32 - depth : k * 4);
          const py = y * TILE + (dy < 0 ? 0 : dy > 0 ? 32 - depth : k * 4);
          rect(ctx, '#53784c', px, py, dx ? depth : 4, dy ? depth : 4);
          if (k % 2 === 0) rect(ctx, '#78915a', px + 1, py, 2, 2);
        }
      }
    }
  }

  water(world) {
    const ctx = this.ctx;
    const minX = Math.max(0, Math.floor(this.left / TILE)), maxX = Math.min(world.w, Math.ceil((this.left + 960) / TILE));
    const minY = Math.max(0, Math.floor(this.top / TILE)), maxY = Math.min(world.h, Math.ceil((this.top + 540) / TILE));
    for (let y = minY; y < maxY; y++) for (let x = minX; x < maxX; x++) {
      if (world.tiles[y * world.w + x] !== 2) continue;
      const n = noise(x, y, 32), a = Math.sin(this.time * 1.4 + n * 16);
      if (n > 0.5) {
        ctx.globalAlpha = 0.12 + Math.max(0, a) * 0.27;
        const dx = Math.sin(this.time * 0.6 + y) * 3;
        rect(ctx, '#b8d3b3', x * 32 + 6 + dx, y * 32 + 10 + n * 12, 12, 1);
        rect(ctx, '#87b4a7', x * 32 + 10 + dx, y * 32 + 13 + n * 12, 8, 1);
      }
      if (n < 0.065) {
        pixelOval(ctx, '#447c5b', x * 32 + 16, y * 32 + 18, 7, 4, 2);
        rect(ctx, '#70a471', x * 32 + 12, y * 32 + 15, 5, 2);
        rect(ctx, '#2e6766', x * 32 + 16, y * 32 + 14, 2, 5);
      }
    }
    ctx.globalAlpha = 1;
  }

  propShadow(p) {
    if (p.broken) return;
    const ctx = this.ctx;
    if (p.type === 'tree') {
      ctx.globalAlpha = 0.18;
      poly(ctx, '#102f31', [[p.x - 15, p.y + 3], [p.x + 13, p.y + 2], [p.x + 61, p.y + 34], [p.x + 35, p.y + 45], [p.x + 6, p.y + 22]]);
      pixelOval(ctx, '#143634', p.x + 39, p.y + 30, 38, 18, 4);
    } else if (['pillar', 'portal', 'shrine', 'altar', 'crystal', 'well'].includes(p.type)) {
      ctx.globalAlpha = 0.2;
      poly(ctx, '#122b30', [[p.x - 16, p.y + 1], [p.x + 15, p.y + 1], [p.x + 41, p.y + 22], [p.x + 8, p.y + 22]]);
    } else {
      ctx.globalAlpha = 0.2;
      pixelOval(ctx, '#18382f', p.x + 3, p.y + 6, p.type === 'bush' ? 19 : 13, 6, 2);
    }
    ctx.globalAlpha = 1;
  }

  prop(p) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y));
    const seed = p.variant ?? Math.floor(noise(Math.floor(p.x), Math.floor(p.y)) * 100);
    switch (p.type) {
      case 'tree': this.tree(seed, p); break;
      case 'bush': this.bush(seed); break;
      case 'keeper': this.keeper(); break;
      case 'mushroom':
        rect(ctx, '#3c5740', -3, -1, 6, 9); rect(ctx, '#c5b58d', -2, -4, 4, 11);
        rect(ctx, '#e5d4aa', -2, -4, 2, 9);
        pixelOval(ctx, '#573d35', 0, -4, 12, 6, 2); pixelOval(ctx, '#b96748', -1, -6, 11, 6, 2);
        pixelOval(ctx, '#d78c5d', -4, -8, 7, 3, 2);
        rect(ctx, '#f0c995', -5, -9, 3, 2); rect(ctx, '#e3b589', 3, -6, 3, 2); rect(ctx, '#e3b589', -8, -5, 2, 2);
        rect(ctx, '#9fac72', 9, 2, 2, 5); pixelOval(ctx, '#b18a59', 10, 0, 5, 3, 2); break;
      case 'rock':
        poly(ctx, '#354d43', [[-17, 6], [-16, -4], [-9, -15], [6, -19], [16, -8], [17, 4], [9, 9], [-9, 9]]);
        poly(ctx, '#83917a', [[-14, -4], [-7, -14], [5, -16], [13, -7], [4, 0], [-11, 1]]);
        poly(ctx, '#647764', [[-12, 2], [4, 1], [13, -6], [14, 3], [7, 7], [-8, 7]]);
        poly(ctx, '#a2aa8d', [[-7, -13], [5, -15], [10, -9], [0, -7], [-8, -6]]);
        rect(ctx, '#47674b', -15, 4, 9, 3); rect(ctx, '#6d8a55', -13, 2, 8, 3); break;
      case 'flower':
        for (let i = 0; i < 5; i++) {
          const x = Math.floor(noise(seed, i) * 22) - 11, y = Math.floor(noise(i, seed) * 12) - 7;
          rect(ctx, '#325641', x, y, 2, 8); rect(ctx, '#9ea865', x + 2, y + 3, 3, 2);
          rect(ctx, i % 2 ? '#f2d29a' : '#c6b4c0', x - 2, y - 3, 5, 3);
          rect(ctx, '#fff0bc', x, y - 3, 2, 2);
        } break;
      case 'grass':
        for (let i = 0; i < 7; i++) {
          const x = i * 3 - 9, h = 5 + noise(i, seed) * 9;
          poly(ctx, i % 2 ? '#789455' : '#3c6545', [[x, 5], [x - 3, 3 - h], [x + 1, -h / 3], [x + 3, 5]]);
        } break;
      case 'log':
        rect(ctx, '#343e31', -22, -7, 44, 15); rect(ctx, '#65543b', -21, -9, 41, 12);
        rect(ctx, '#8b724d', -19, -10, 36, 3); rect(ctx, '#4a4634', -16, -3, 34, 2);
        pixelOval(ctx, '#b39664', 21, -2, 6, 8, 2); pixelOval(ctx, '#776245', 21, -2, 3, 5, 2);
        rect(ctx, '#6e8b50', -17, -11, 18, 4); rect(ctx, '#93a361', -13, -12, 9, 2); break;
      case 'lantern':
        rect(ctx, '#283a34', -3, -34, 6, 39); rect(ctx, '#826c45', -1, -35, 2, 37);
        rect(ctx, '#283a34', -8, -38, 16, 5); rect(ctx, '#3f4d38', -7, -34, 14, 15);
        rect(ctx, '#df994d', -4, -31, 8, 10); rect(ctx, '#ffe5a1', -2, -29, 4, 7);
        rect(ctx, '#a89157', -7, -21, 14, 2); rect(ctx, '#283a34', -9, -39, 18, 2); break;
      case 'well': this.well(); break;
      case 'campfire': this.campfire(); break;
      case 'tent':
        poly(ctx, '#243e37', [[-33, 9], [-24, -22], [0, -39], [29, -16], [36, 10]]);
        poly(ctx, '#bf9970', [[-30, 5], [-21, -21], [0, -35], [7, 5]]);
        poly(ctx, '#8f7556', [[0, -35], [26, -16], [32, 6], [7, 5]]);
        poly(ctx, '#e0b889', [[-27, -20], [0, -39], [31, -16], [27, -13], [0, -34], [-24, -17]]);
        poly(ctx, '#293c32', [[-12, 5], [0, -23], [11, 5]]);
        rect(ctx, '#d7b281', -2, -40, 3, 44); rect(ctx, '#5a5038', -34, 3, 3, 9); rect(ctx, '#5a5038', 33, 4, 3, 9); break;
      case 'sign':
        rect(ctx, '#354436', -3, -13, 6, 20); rect(ctx, '#95754e', -1, -13, 3, 19);
        rect(ctx, '#304033', -17, -29, 34, 19); rect(ctx, '#b38d5a', -15, -27, 30, 15);
        rect(ctx, '#d0a86d', -14, -27, 28, 2); rect(ctx, '#6d6041', -10, -21, 17, 2);
        poly(ctx, '#675a3e', [[7, -24], [11, -20], [7, -16]]); break;
      case 'shrine': this.shrine(p); break;
      case 'portal': this.portal(p); break;
      case 'chest': this.chest(p.opened); break;
      case 'gate': this.gate(p); break;
      case 'switch':
        pixelOval(ctx, '#172f35', 0, 2, 14, 8, 2); pixelOval(ctx, '#738378', 0, 0, 13, 7, 2);
        pixelOval(ctx, '#435e59', 0, -1, 10, 5, 2); pixelOval(ctx, p.active ? '#e1b765' : '#658b80', 0, -2, 7, 4, 2);
        rect(ctx, p.active ? '#fff0b2' : '#a2b09b', -3, -4, 6, 2); break;
      case 'altar': this.altar(p); break;
      case 'crystal':
        pixelOval(ctx, '#213b41', 0, 4, 14, 7, 2);
        poly(ctx, '#315558', [[-14, 4], [-10, -4], [9, -5], [14, 4], [6, 8], [-7, 8]]);
        this.crystal(0, -15 + Math.sin(this.time * 2 + seed) * 2, p.active === false ? '#5c8f91' : '#8be0cf', 12); break;
      case 'pillar': this.pillar(seed); break;
      default: break;
    }
    ctx.restore();
  }

  tree(seed, p) {
    const ctx = this.ctx;
    const autumn = seed % 13 === 0;
    const palette = autumn ? ['#34483a', '#655e3e', '#8f7d46', '#baa35c', '#c8b66d'] : ['#183d35', '#275a40', '#39734b', '#578953', '#80a25f'];
    poly(ctx, '#273e31', [[-16, 9], [-9, -7], [-8, -41], [7, -43], [9, -9], [18, 10], [7, 7], [0, 11], [-7, 6]]);
    rect(ctx, '#675d3d', -6, -35, 12, 40); rect(ctx, '#8a7950', -5, -31, 4, 34);
    rect(ctx, '#4d5034', 3, -29, 3, 34); rect(ctx, '#ab9360', -5, -17, 2, 13);
    poly(ctx, '#786b45', [[-5, 1], [-12, 9], [-7, 8], [1, 1], [8, 9], [13, 9], [5, 0]]);
    poly(ctx, '#655d3e', [[-5, -24], [-18, -36], [-16, -41], [-2, -32], [10, -48], [14, -43], [5, -24]]);
    const player = this.game.player;
    if (Math.abs(player.x - p.x) < 32 && player.y < p.y + 4 && player.y > p.y - 70) ctx.globalAlpha = 0.64;
    const clusters = [[-17, -40, 24, 20], [16, -43, 25, 22], [1, -59, 30, 26], [-22, -57, 21, 18], [22, -61, 19, 19], [0, -76, 21, 17]];
    for (let i = 0; i < clusters.length; i++) {
      const [x, y, rx, ry] = clusters[i];
      pixelOval(ctx, palette[0], x, y + 4, rx + 2, ry, 4);
      pixelOval(ctx, palette[1], x, y, rx, ry, 4);
      pixelOval(ctx, palette[2], x - 3, y - 4, rx - 3, ry - 4, 4);
      pixelOval(ctx, palette[3], x - 6, y - 8, rx - 8, ry - 9, 3);
      for (let j = 0; j < 5; j++) {
        const nx = noise(seed + i * 31, j + 9), ny = noise(seed + j * 41, i + 17);
        const fx = x - rx * 0.7 + nx * rx * 1.4, fy = y - ry * 0.65 + ny * ry;
        rect(ctx, j % 3 === 0 ? palette[4] : palette[2], fx, fy, 4 + nx * 5, 3);
      }
    }
    ctx.globalAlpha = 1;
    rect(ctx, '#69874a', -15, 8, 8, 3); rect(ctx, '#9baa61', -12, 5, 2, 5);
    if (seed % 3 === 0) { rect(ctx, '#d0bea0', 11, 4, 2, 5); rect(ctx, '#b56748', 8, 1, 8, 4); rect(ctx, '#edb78a', 10, 1, 2, 1); }
  }

  bush(seed) {
    const ctx = this.ctx;
    pixelOval(ctx, '#244d39', 0, -3, 19, 11, 3);
    pixelOval(ctx, '#396b43', -1, -7, 17, 11, 3);
    pixelOval(ctx, '#5b8b50', -5, -10, 11, 7, 3);
    pixelOval(ctx, '#6e9958', -8, -13, 7, 3, 2);
    rect(ctx, '#416f44', 6, -13, 8, 4); rect(ctx, '#86a65e', -12, -13, 5, 2);
    rect(ctx, '#4c7b48', -11, -3, 7, 3); rect(ctx, '#4d7d48', 4, -5, 6, 3);
    if (seed % 3 === 0) {
      rect(ctx, '#dc9576', 6, -9, 3, 3); rect(ctx, '#b86955', -9, -4, 3, 3); rect(ctx, '#eac496', 6, -9, 1, 1);
    }
  }

  keeper() {
    const ctx = this.ctx, bob = Math.sin(this.time * 2) * 0.4;
    ctx.translate(0, bob);
    rect(ctx, '#273d35', -7, 3, 6, 8); rect(ctx, '#273d35', 2, 3, 6, 8);
    rect(ctx, '#67563d', -7, 8, 6, 3); rect(ctx, '#67563d', 2, 8, 7, 3);
    poly(ctx, '#283f38', [[-8, -19], [8, -19], [11, -7], [13, 5], [6, 9], [-10, 8], [-13, 3], [-10, -8]]);
    poly(ctx, '#637b57', [[-7, -17], [6, -17], [8, -6], [10, 4], [5, 7], [-9, 5], [-10, 2], [-8, -7]]);
    poly(ctx, '#8b9866', [[-6, -17], [0, -16], [-3, -4], [-6, 3], [-9, 2], [-8, -8]]);
    rect(ctx, '#b29c64', -8, -2, 16, 3); rect(ctx, '#e1c387', 0, -2, 3, 3);
    rect(ctx, '#415a44', -12, -12, 5, 12); rect(ctx, '#829060', -11, -12, 3, 9);
    rect(ctx, '#d4b18b', -11, -3, 4, 4); rect(ctx, '#d4b18b', 8, -3, 5, 4);
    rect(ctx, '#263e3b', -8, -29, 16, 16); rect(ctx, '#d7b592', -6, -27, 12, 13);
    rect(ctx, '#edd1a7', -5, -25, 8, 7); rect(ctx, '#263e3b', -4, -22, 2, 2); rect(ctx, '#263e3b', 3, -22, 2, 2);
    poly(ctx, '#afbcaa', [[-7, -21], [-4, -17], [3, -17], [7, -22], [7, -14], [3, -9], [-3, -10], [-7, -15]]);
    poly(ctx, '#e1dfbc', [[-5, -20], [-2, -18], [3, -18], [5, -20], [4, -13], [0, -10], [-4, -14]]);
    rect(ctx, '#839985', -7, -25, 2, 7); rect(ctx, '#aabb9e', 5, -25, 2, 6);
    poly(ctx, '#273f38', [[-15, -27], [-11, -32], [-7, -34], [-4, -42], [1, -47], [3, -41], [7, -33], [14, -31], [16, -27], [8, -24], [-7, -24]]);
    poly(ctx, '#8a8f5a', [[-12, -28], [-8, -31], [-4, -33], [-2, -40], [1, -44], [3, -38], [6, -31], [12, -29], [8, -27], [-6, -26]]);
    poly(ctx, '#b1ad70', [[-5, -32], [-2, -39], [1, -43], [1, -35], [4, -31]]);
    rect(ctx, '#485d42', -7, -32, 13, 3); rect(ctx, '#d2bd7a', -2, -32, 3, 3);
    rect(ctx, '#304637', 13, -33, 4, 44); rect(ctx, '#b29867', 14, -33, 2, 43);
    poly(ctx, '#b6a571', [[13, -29], [10, -35], [12, -40], [18, -41], [21, -37], [19, -33], [16, -33], [18, -37], [15, -38], [13, -35], [16, -30]]);
    rect(ctx, '#94b282', 11, -32, 5, 3);
  }

  chest(opened) {
    const ctx = this.ctx;
    rect(ctx, '#253c32', -15, -12, 30, 22); rect(ctx, '#815c39', -13, -10, 26, 18);
    rect(ctx, '#bd8750', -12, -6, 24, 10); rect(ctx, '#694e35', -12, 4, 24, 3);
    rect(ctx, '#d9b66b', -11, -9, 3, 16); rect(ctx, '#d9b66b', 8, -9, 3, 16);
    if (opened) {
      poly(ctx, '#324438', [[-15, -13], [-13, -27], [13, -27], [15, -13]]);
      rect(ctx, '#a77d49', -11, -24, 22, 10); rect(ctx, '#624c33', -9, -22, 18, 6);
      rect(ctx, '#243731', -10, -10, 20, 6); rect(ctx, '#d2b365', -12, -13, 24, 2);
    } else {
      poly(ctx, '#d09b57', [[-13, -11], [-11, -18], [10, -18], [13, -11], [13, -6], [-13, -6]]);
      rect(ctx, '#edc97c', -10, -18, 20, 2); rect(ctx, '#dbb768', -11, -16, 3, 10); rect(ctx, '#dbb768', 8, -16, 3, 10);
      rect(ctx, '#4e5037', -4, -8, 8, 9); rect(ctx, '#f2d68d', -3, -8, 6, 7); rect(ctx, '#6b6243', -1, -5, 2, 3);
    }
  }

  well() {
    const ctx = this.ctx;
    pixelOval(ctx, '#293e37', 0, 1, 23, 13, 3); rect(ctx, '#64766a', -21, -9, 42, 12);
    pixelOval(ctx, '#98a18a', 0, -10, 23, 12, 3); pixelOval(ctx, '#344e4a', 0, -10, 16, 7, 2);
    pixelOval(ctx, '#2e6467', 0, -9, 12, 4, 2); rect(ctx, '#78958a', -8, -11, 10, 1);
    rect(ctx, '#435b51', -10, 1, 2, 7); rect(ctx, '#435b51', 8, 0, 2, 8);
    rect(ctx, '#34463a', -20, -40, 5, 37); rect(ctx, '#34463a', 15, -40, 5, 37);
    rect(ctx, '#a68b59', -19, -38, 2, 29); rect(ctx, '#8c7750', 16, -38, 2, 29);
    poly(ctx, '#2a453c', [[-28, -33], [-4, -52], [7, -52], [29, -33], [26, -28], [-26, -28]]);
    poly(ctx, '#6e8b58', [[-26, -34], [-4, -49], [7, -49], [27, -34]]);
    rect(ctx, '#9cac69', -8, -46, 17, 3); rect(ctx, '#4f734b', -21, -36, 39, 3);
    rect(ctx, '#a99765', -1, -30, 2, 15); rect(ctx, '#886c48', -5, -18, 10, 8);
  }

  campfire() {
    const ctx = this.ctx;
    pixelOval(ctx, '#334537', 0, 4, 19, 10, 2);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU;
      pixelOval(ctx, '#89917a', Math.cos(a) * 16, Math.sin(a) * 7 + 3, 5, 3, 2);
    }
    poly(ctx, '#866345', [[-12, 3], [-9, -1], [13, 5], [10, 9]]);
    poly(ctx, '#b58a55', [[-12, 5], [10, -2], [13, 1], [-9, 9]]);
    const flicker = Math.sin(this.time * 11) * 3;
    poly(ctx, '#c4633e', [[-9, 2], [-10, -8], [-5, -5], [-3, -20 + flicker], [2, -14], [6, -25 - flicker], [8, -10], [12, -7], [9, 3], [0, 8]]);
    poly(ctx, '#f0ae56', [[-6, 2], [-5, -8], [-1, -5], [4, -17 + flicker], [5, -7], [8, -3], [5, 5], [-1, 6]]);
    poly(ctx, '#ffe7a0', [[-3, 3], [0, -8], [4, -1], [4, 4], [0, 6]]);
    for (let i = 0; i < 3; i++) {
      const rise = (this.time * (12 + i * 3) + i * 13) % 37;
      ctx.globalAlpha = 1 - rise / 37;
      rect(ctx, '#ffd589', Math.sin(rise * 0.2 + i) * 7, -10 - rise, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  shrine(p) {
    const ctx = this.ctx;
    pixelOval(ctx, '#314b40', 0, 8, 30, 13, 3);
    poly(ctx, '#7d8c74', [[-25, 6], [-18, -1], [18, -1], [25, 6], [21, 11], [-22, 11]]);
    rect(ctx, '#4c6557', -19, -2, 38, 8); rect(ctx, '#a4aa89', -18, -3, 36, 3);
    poly(ctx, '#526e60', [[-14, 0], [-13, -31], [-8, -44], [8, -44], [14, -31], [15, 0]]);
    poly(ctx, '#819780', [[-11, -1], [-10, -30], [-6, -40], [5, -40], [8, -30], [8, -1]]);
    rect(ctx, '#afbaa0', -9, -29, 3, 26); rect(ctx, '#3b5f53', 7, -30, 5, 29);
    const glow = p.active === false ? '#627f72' : '#dcca85';
    poly(ctx, '#3c6257', [[0, -32], [7, -24], [0, -15], [-7, -24]]);
    poly(ctx, glow, [[0, -29], [4, -24], [0, -19], [-4, -24]]);
    rect(ctx, '#a0b08a', -5, -11, 9, 2); rect(ctx, '#526f58', -21, 1, 9, 5);
    rect(ctx, '#729251', -21, -1, 8, 3); rect(ctx, '#729251', 9, -40, 7, 3);
    if (p.active !== false) this.crystal(0, -54 + Math.sin(this.time * 1.8) * 2, '#d9e4aa', 6);
  }

  portal(p) {
    const ctx = this.ctx;
    pixelOval(ctx, '#172f32', 0, 6, 37, 15, 3);
    poly(ctx, '#304d48', [[-32, 7], [-32, -41], [-22, -63], [-10, -72], [12, -72], [27, -61], [34, -41], [34, 7]]);
    poly(ctx, '#829580', [[-28, 5], [-28, -42], [-18, -61], [-7, -68], [10, -68], [24, -58], [30, -39], [30, 5]]);
    poly(ctx, '#173938', [[-17, 5], [-17, -37], [-12, -51], [-4, -56], [6, -56], [17, -48], [20, -35], [20, 5]]);
    const active = p.active !== false;
    if (active) {
      const g = ctx.createLinearGradient(0, -55, 0, 6); g.addColorStop(0, '#387573'); g.addColorStop(0.5, '#255655'); g.addColorStop(1, '#92b793');
      poly(ctx, g, [[-15, 4], [-15, -36], [-9, -49], [0, -54], [7, -53], [16, -43], [18, -31], [18, 4]]);
      for (let i = 0; i < 8; i++) {
        const y = -((this.time * 12 + i * 7) % 49);
        ctx.globalAlpha = 0.18 + i % 3 * 0.1;
        rect(ctx, '#d1dbaa', -12 + noise(i, 91) * 25, y, 2, 3);
      }
      ctx.globalAlpha = 1;
    }
    rect(ctx, '#b2bb95', -26, -41, 5, 33); rect(ctx, '#5a776a', 22, -40, 6, 42);
    for (const y of [-35, -19, -3]) { rect(ctx, '#3f5d55', -28, y, 12, 2); rect(ctx, '#3f5d55', 19, y, 11, 2); }
    poly(ctx, '#abb591', [[-7, -67], [8, -67], [7, -57], [-5, -57]]);
    rect(ctx, active ? '#eed39a' : '#5d7769', -1, -64, 3, 5);
    rect(ctx, '#52794c', -31, -41, 9, 13); rect(ctx, '#769554', -29, -43, 8, 4);
    rect(ctx, '#477146', 14, -63, 12, 5); rect(ctx, '#719153', 13, -65, 8, 4);
    rect(ctx, '#869978', -33, 6, 67, 5); rect(ctx, '#b2b58c', -29, 5, 59, 2);
  }

  gate(p) {
    const ctx = this.ctx, width = p.w || 74;
    if (p.active || p.opened) {
      rect(ctx, '#2c3d37', -width / 2, 2, width, 4);
      for (let x = -width / 2 + 4; x < width / 2; x += 9) rect(ctx, '#a78b58', x, 1, 3, 4);
      return;
    }
    rect(ctx, '#1c3638', -width / 2, -42, width, 46);
    rect(ctx, '#3e5651', -width / 2 + 3, -36, width - 6, 37);
    for (let x = -width / 2 + 5; x < width / 2; x += 9) {
      rect(ctx, '#273e3e', x, -39, 7, 43); rect(ctx, '#a28e61', x + 1, -36, 3, 38);
      rect(ctx, '#d3b67a', x + 1, -36, 1, 37); poly(ctx, '#c8aa70', [[x, -35], [x + 3, -44], [x + 6, -35]]);
    }
    rect(ctx, '#5b6651', -width / 2, -28, width, 5); rect(ctx, '#bb9c65', -width / 2, -28, width, 2);
    rect(ctx, '#5b6651', -width / 2, -9, width, 5); rect(ctx, '#bb9c65', -width / 2, -9, width, 2);
    rect(ctx, '#243b3c', -width / 2 - 5, -44, 10, 49); rect(ctx, '#728474', -width / 2 - 4, -45, 7, 45);
    rect(ctx, '#243b3c', width / 2 - 5, -44, 10, 49); rect(ctx, '#728474', width / 2 - 4, -45, 7, 45);
  }

  altar(p) {
    const ctx = this.ctx;
    pixelOval(ctx, '#193239', 0, 7, 31, 14, 3);
    rect(ctx, '#3f5960', -25, -3, 50, 12); rect(ctx, '#789083', -25, -4, 50, 3);
    rect(ctx, '#2b464e', -19, -24, 38, 21); rect(ctx, '#56716d', -17, -23, 34, 20);
    rect(ctx, '#7b9281', -16, -22, 5, 19); rect(ctx, '#36575b', 11, -22, 5, 19);
    rect(ctx, '#a5af8f', -23, -28, 46, 6); rect(ctx, '#516e68', -23, -22, 46, 3);
    rect(ctx, '#b8b893', -20, -29, 40, 2);
    poly(ctx, '#263f48', [[0, -20], [6, -13], [0, -6], [-6, -13]]);
    poly(ctx, p.active ? '#f1cf81' : '#718c85', [[0, -18], [4, -13], [0, -8], [-4, -13]]);
    if (p.active !== false) this.crystal(0, -47 + Math.sin(this.time * 1.7) * 3, '#f4cd85', 12);
  }

  pillar(seed) {
    const ctx = this.ctx, height = seed % 5 === 0 ? 27 : 54;
    rect(ctx, '#1a333b', -16, -3, 32, 12); rect(ctx, '#627c75', -15, -4, 30, 10);
    rect(ctx, '#8d9d85', -15, -5, 30, 3); rect(ctx, '#345359', -11, -height, 22, height - 3);
    rect(ctx, '#657f77', -10, -height, 17, height - 4); rect(ctx, '#8a9c86', -9, -height, 4, height - 5);
    rect(ctx, '#3c5c5e', 3, -height, 3, height - 4);
    rect(ctx, '#82957f', -15, -height - 6, 30, 8); rect(ctx, '#a5ac8d', -15, -height - 7, 30, 2);
    rect(ctx, '#345052', -12, -height + 2, 24, 2);
    if (height > 30) {
      rect(ctx, '#c6b57b', -3, -36, 2, 10); rect(ctx, '#c6b57b', 0, -33, 3, 2); rect(ctx, '#c6b57b', -5, -28, 3, 2);
      rect(ctx, '#31594d', -14, -height - 5, 9, 5); rect(ctx, '#598052', -13, -height - 7, 9, 3);
    }
  }

  crystal(x, y, color, size) {
    const ctx = this.ctx;
    poly(ctx, '#23464a', [[x, y - size - 2], [x + size * 0.65 + 2, y], [x, y + size + 3], [x - size * 0.65 - 2, y]]);
    poly(ctx, color, [[x, y - size], [x + size * 0.65, y], [x, y + size], [x - size * 0.65, y]]);
    poly(ctx, '#eff2cf', [[x, y - size], [x, y + size * 0.5], [x - size * 0.65, y]]);
    ctx.globalAlpha = 0.32; poly(ctx, '#173d48', [[x, y], [x + size * 0.65, y], [x, y + size]]); ctx.globalAlpha = 1;
  }

  player(p) {
    const ctx = this.ctx, t = this.time;
    const moving = p.moving && !p.dashTimer;
    const walk = moving ? Math.sin(t * 14) : 0, bob = moving ? Math.abs(walk) * 1.5 : Math.sin(t * 2.5) * 0.35;
    if (p.dashTimer > 0) {
      for (let i = 3; i > 0; i--) {
        ctx.globalAlpha = 0.06 + (3 - i) * 0.06;
        const x = p.x - Math.cos(p.facing) * i * 12, y = p.y - Math.sin(p.facing) * i * 12;
        pixelOval(ctx, '#f3cca0', x, y - 5, 9, 14, 2);
      }
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = 0.3; pixelOval(ctx, '#183730', p.x + 1, p.y + 10, 12, 5, 2); ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y - bob));
    if (p.hurtTimer > 0 && Math.floor(p.hurtTimer * 18) % 2 === 0) ctx.globalAlpha = 0.55;
    const back = Math.sin(p.facing) < -0.55;
    const left = Math.cos(p.facing) < -0.3;
    // Heavy, readable silhouette; the two-pixel details are deliberately hand placed.
    const bootL = moving ? Math.round(walk * 2) : 0, bootR = -bootL;
    rect(ctx, '#17343a', -7, 2 + bootL, 6, 10); rect(ctx, '#17343a', 2, 2 + bootR, 6, 10);
    rect(ctx, '#56635b', -6, 3 + bootL, 4, 5); rect(ctx, '#56635b', 3, 3 + bootR, 4, 5);
    rect(ctx, '#403e36', -7, 9 + bootL, 6, 3); rect(ctx, '#403e36', 2, 9 + bootR, 7, 3);
    poly(ctx, '#20393a', [[-8, -16], [6, -16], [10, -9], [12, 4], [5, 8], [-7, 7], [-12, 3], [-10, -7]]);
    poly(ctx, '#a34437', [[-7, -14], [6, -14], [8, -6], [10, 3], [4, 6], [-8, 5], [-9, 1], [-8, -6]]);
    poly(ctx, '#db704a', [[-6, -15], [3, -15], [7, -8], [6, 3], [-3, 5], [-8, 2], [-6, -5]]);
    poly(ctx, '#ee9960', [[-6, -13], [-2, -15], [0, -8], [-4, -3], [-7, -1]]);
    rect(ctx, '#bd583e', 2, -5, 3, 8); rect(ctx, '#ed9c64', -7, 2, 9, 2);
    if (!back) {
      rect(ctx, '#544b3b', -7, -2, 14, 3); rect(ctx, '#efcf8c', 0, -2, 3, 3);
      rect(ctx, '#263f40', -10, -10, 5, 8); rect(ctx, '#d67c52', -9, -9, 4, 6); rect(ctx, '#e5c096', -9, -3, 4, 4);
      rect(ctx, '#263f40', 6, -10, 5, 9); rect(ctx, '#b9523c', 7, -9, 3, 7); rect(ctx, '#e5c096', 7, -3, 4, 4);
    }
    // Ivory hair and a green travelling scarf.
    rect(ctx, '#213b3d', -8, -25, 15, 14); rect(ctx, '#20383c', -6, -28, 11, 4);
    rect(ctx, '#eed8ad', -6, -23, 12, 11); rect(ctx, '#c99e7a', 3, -20, 3, 8);
    poly(ctx, '#c9cbb0', [[-8, -25], [-5, -28], [3, -28], [7, -24], [8, -17], [5, -16], [3, -23], [-3, -22], [-7, -17], [-9, -20]]);
    rect(ctx, '#f4eed1', -5, -27, 8, 4); rect(ctx, '#e7e4c5', -8, -24, 7, 4);
    rect(ctx, '#b6c5ae', -8, -20, 3, 5);
    if (back) {
      rect(ctx, '#d6dbc0', -6, -22, 11, 8); rect(ctx, '#a5b9a3', -6, -15, 11, 3);
      rect(ctx, '#52654e', -5, -10, 10, 9); rect(ctx, '#7e8058', -4, -10, 8, 6); rect(ctx, '#a3a073', -3, -10, 6, 2);
      rect(ctx, '#243e3c', 5, -15, 3, 16); rect(ctx, '#c1bd91', 6, -20, 2, 15);
    } else {
      rect(ctx, '#243e3d', left ? -5 : 0, -18, 2, 3); rect(ctx, '#243e3d', left ? 0 : 4, -18, 2, 3);
      rect(ctx, '#f7e4b9', left ? -5 : -1, -20, 2, 1); rect(ctx, '#b87e66', 0, -13, 3, 1);
    }
    rect(ctx, '#254c44', -7, -12, 14, 4); rect(ctx, '#659675', -6, -12, 11, 2);
    poly(ctx, '#386e58', [[-7, -11], [-10, -8], [-13 - walk * 2, -10], [-11, -4], [-7, -7]]);
    if (!p.attackTimer && !back) {
      ctx.save(); ctx.translate(left ? -10 : 10, 0); ctx.rotate(left ? 0.4 : -0.4);
      rect(ctx, '#213b3e', -2, -5, 5, 20); rect(ctx, '#c6dbd0', -1, 1, 3, 11); rect(ctx, '#f3eed0', -1, 1, 1, 10);
      poly(ctx, '#c6dbd0', [[-1, 12], [2, 12], [0, 15]]); rect(ctx, '#d6b675', -4, -1, 9, 3); rect(ctx, '#746147', -1, -5, 3, 4);
      ctx.restore();
    }
    ctx.restore();
    if (p.attackTimer > 0) this.swordArc(p);
    if (p.magic) {
      ctx.globalAlpha = 0.55 + Math.sin(t * 3) * 0.1;
      rect(ctx, '#b2e6cb', p.x - 16 + Math.sin(t * 1.5) * 3, p.y - 14 + Math.cos(t * 2) * 4, 2, 2);
      ctx.globalAlpha = 1;
    }
  }

  swordArc(p) {
    const ctx = this.ctx;
    const progress = Math.max(0, Math.min(1, 1 - p.attackTimer / 0.28));
    const angle = p.facing - 1.05 + progress * 2.1;
    ctx.save(); ctx.translate(p.x, p.y - 3);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#fff0ba'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 57, p.facing - 1.05, angle + 0.15); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.85;
    ctx.strokeStyle = '#fff5cd'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, 54, angle - 0.8, angle + 0.1); ctx.stroke();
    ctx.strokeStyle = '#e7bb77'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 60, angle - 0.5, angle); ctx.stroke();
    ctx.globalAlpha = 1; ctx.rotate(angle);
    rect(ctx, '#244047', 8, -3, 28, 6); rect(ctx, '#aaccc7', 13, -2, 21, 4); rect(ctx, '#fff0ca', 13, -2, 21, 2);
    poly(ctx, '#e8e8cc', [[34, -2], [40, 0], [34, 2]]); rect(ctx, '#deb778', 11, -6, 3, 12); rect(ctx, '#e7bf99', 6, -2, 6, 4);
    ctx.restore();
  }

  enemy(e) {
    const ctx = this.ctx;
    const t = this.time + noise(Math.floor(e.x), Math.floor(e.y)) * 0.1;
    ctx.globalAlpha = 0.25; pixelOval(ctx, '#15332f', e.x + 1, e.y + 9, e.type === 'boss' ? 37 : 13, e.type === 'boss' ? 13 : 5, 2); ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y));
    if (e.hurtTimer > 0) ctx.globalAlpha = Math.floor(e.hurtTimer * 30) % 2 ? 0.6 : 1;
    if (e.type === 'slime') this.slime(e, t);
    else if (e.type === 'wisp') this.wisp(e, t);
    else if (e.type === 'knight') this.knight(e, t);
    else if (e.type === 'boss') this.boss(e, t);
    ctx.restore();
    if (e.type !== 'boss' && e.hp < e.maxHp && e.hp > 0) {
      const y = e.y - (e.type === 'wisp' ? 39 : e.type === 'knight' ? 42 : 29);
      rect(ctx, '#182f32', e.x - 13, y, 26, 4); rect(ctx, '#be7957', e.x - 12, y + 1, 24 * Math.max(0, e.hp / e.maxHp), 2);
    }
  }

  slime(e, t) {
    const ctx = this.ctx, bob = Math.sin(t * 4 + (e.id?.length || 0));
    const angry = e.state === 'windup' || e.state === 'attack';
    const w = 14 + bob * 1.2, h = 12 - bob * 1.4;
    pixelOval(ctx, '#25463b', 0, -h / 2 + 2, w + 1, h, 2);
    pixelOval(ctx, angry ? '#b88750' : '#68955c', -1, -h / 2, w - 1, h - 1, 2);
    pixelOval(ctx, angry ? '#d4ab65' : '#9abb73', -4, -h / 2 - 4, w - 5, h - 5, 2);
    rect(ctx, angry ? '#f1d795' : '#d6dca0', -7, -h - 1, 5, 3); rect(ctx, '#adca82', -9, -h + 2, 2, 3);
    rect(ctx, '#2a4037', -6, -5, 3, 4); rect(ctx, '#2a4037', 4, -5, 3, 4);
    rect(ctx, '#fff0b7', -6, -5, 1, 1); rect(ctx, '#fff0b7', 4, -5, 1, 1);
    rect(ctx, '#53744c', -2, 0, 5, 2); rect(ctx, '#8cad68', -8, 5, 16, 2);
    poly(ctx, '#456e44', [[-2, -h - 1], [-8, -h - 8], [-2, -h - 6], [0, -h - 2], [4, -h - 9], [8, -h - 9], [4, -h - 3]]);
    rect(ctx, '#98b46b', 2, -h - 7, 3, 2);
  }

  wisp(e, t) {
    const ctx = this.ctx, bob = Math.sin(t * 3) * 3;
    ctx.translate(0, bob - 9);
    this.glow(0, -3, 35, '#7cc4c0', 0.14);
    poly(ctx, '#244a53', [[-11, 0], [-10, -11], [-5, -18], [6, -18], [12, -10], [10, 2], [5, 10], [1, 7], [-4, 13], [-5, 6], [-11, 8]]);
    poly(ctx, '#71b4af', [[-9, -1], [-8, -10], [-3, -15], [5, -15], [9, -9], [8, 1], [3, 7], [0, 4], [-4, 8], [-5, 3], [-9, 5]]);
    pixelOval(ctx, '#c0ddd0', -2, -9, 7, 7, 2);
    rect(ctx, '#e7ebc6', -5, -13, 5, 3); rect(ctx, '#356571', -5, -7, 3, 4); rect(ctx, '#356571', 3, -7, 3, 4);
    rect(ctx, '#eff0c5', -5, -7, 1, 2); rect(ctx, '#eff0c5', 3, -7, 1, 2);
    rect(ctx, '#3d8589', -1, -1, 3, 3);
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.6 - i * 0.15;
      rect(ctx, '#9dd5c7', Math.sin(t * 2 + i * 2) * 13, 11 + i * 4, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  knight(e, t) {
    const ctx = this.ctx, walk = e.state === 'chase' || e.state === 'attack' ? Math.sin(t * 10) * 2 : 0;
    rect(ctx, '#172e34', -10, 0, 7, 12 + walk); rect(ctx, '#172e34', 3, 0, 7, 12 - walk);
    rect(ctx, '#5a716b', -9, 2, 5, 7 + walk); rect(ctx, '#5a716b', 4, 2, 5, 7 - walk);
    poly(ctx, '#412f33', [[-10, -20], [10, -20], [15, 6], [8, 10], [0, 7], [-13, 9]]);
    poly(ctx, '#874c40', [[-9, -18], [8, -18], [11, 6], [4, 8], [-10, 6]]);
    rect(ctx, '#18353a', -10, -19, 20, 23); rect(ctx, '#607a72', -8, -18, 16, 18);
    rect(ctx, '#8c9c81', -8, -18, 7, 15); rect(ctx, '#3d5d59', 3, -15, 5, 15);
    rect(ctx, '#b3a371', -9, -6, 18, 3); rect(ctx, '#d4bd80', -2, -6, 4, 3);
    pixelOval(ctx, '#233d3d', 0, -23, 11, 12, 2); pixelOval(ctx, '#8e9476', -1, -24, 9, 10, 2);
    rect(ctx, '#b8b38a', -7, -30, 9, 3); rect(ctx, '#657b68', 4, -29, 5, 13);
    rect(ctx, '#213a3a', -8, -23, 16, 5); rect(ctx, '#f1bd76', -6, -22, 4, 2); rect(ctx, '#f1bd76', 2, -22, 4, 2);
    rect(ctx, '#9daa83', -1, -28, 3, 12);
    rect(ctx, '#b78e5a', -2, -39, 4, 8); poly(ctx, '#a76145', [[-2, -39], [5, -38], [10, -33], [6, -32], [3, -35], [-2, -35]]);
    // Round, battered shield and a bronze-tipped spear.
    pixelOval(ctx, '#243c39', -12, -6, 9, 13, 2); pixelOval(ctx, '#927b50', -13, -7, 7, 11, 2);
    pixelOval(ctx, '#547567', -13, -7, 5, 8, 2); rect(ctx, '#c2aa6c', -15, -10, 4, 6);
    rect(ctx, '#223c3b', 13, -28, 4, 35); rect(ctx, '#b9a071', 14, -25, 2, 31);
    poly(ctx, '#d0d2aa', [[15, -37], [19, -25], [15, -22], [11, -25]]);
    rect(ctx, '#e1c99c', 11, -7, 5, 5);
  }

  boss(e, t) {
    const ctx = this.ctx, bob = Math.sin(t * 2) * 1.5;
    ctx.translate(0, bob);
    const fury = e.state === 'windup' || e.state === 'attack';
    // The Hollow Warden is a fallen, antlered stone guardian, inhabited by amber light.
    poly(ctx, '#122e35', [[-31, 8], [-28, -11], [-18, -28], [-27, -54], [-18, -72], [17, -72], [28, -54], [19, -29], [31, -11], [34, 8], [18, 13], [5, 5], [-6, 5], [-19, 14]]);
    poly(ctx, '#405d58', [[-28, 8], [-25, -10], [-14, -24], [-7, -11], [-10, 4], [-19, 11]]);
    poly(ctx, '#6a7c67', [[-25, 5], [-22, -9], [-15, -16], [-13, -10], [-17, 5]]);
    poly(ctx, '#405d58', [[8, -20], [19, -26], [28, -10], [31, 8], [19, 10], [10, 3]]);
    poly(ctx, '#859078', [[17, -18], [23, -10], [26, 4], [19, 6], [14, -5]]);
    poly(ctx, '#354d49', [[-25, -40], [-37, -36], [-46, -15], [-42, -1], [-29, -2], [-27, -14], [-19, -22]]);
    poly(ctx, '#74826a', [[-29, -37], [-35, -33], [-40, -16], [-33, -9], [-27, -23], [-20, -25]]);
    poly(ctx, '#354d49', [[23, -40], [37, -36], [46, -17], [43, -3], [28, -3], [26, -18], [17, -23]]);
    poly(ctx, '#6a7e68', [[30, -35], [34, -33], [41, -17], [34, -10], [27, -23], [21, -25]]);
    poly(ctx, '#5c7463', [[-22, -54], [-15, -64], [14, -64], [22, -52], [17, -30], [7, -20], [-9, -20], [-19, -32]]);
    poly(ctx, '#8b9578', [[-20, -52], [-12, -61], [1, -61], [-2, -48], [-9, -36], [-16, -34]]);
    poly(ctx, '#314f4d', [[2, -61], [15, -59], [20, -50], [15, -31], [6, -23], [-4, -23], [-7, -34], [0, -43]]);
    poly(ctx, '#c3b480', [[-7, -46], [0, -54], [8, -46], [10, -35], [0, -26], [-9, -35]]);
    poly(ctx, fury ? '#ffdea0' : '#e7a763', [[-4, -45], [0, -50], [5, -45], [7, -36], [0, -30], [-6, -36]]);
    poly(ctx, '#fff0bc', [[-3, -42], [0, -47], [2, -39], [0, -33], [-3, -36]]);
    this.glow(0, -40, fury ? 59 : 38, '#e9ac65', fury ? 0.22 : 0.1);
    // Crown branches.
    poly(ctx, '#283f3c', [[-12, -69], [-22, -78], [-30, -80], [-40, -94], [-39, -101], [-35, -92], [-28, -86], [-31, -98], [-29, -103], [-25, -88], [-15, -80], [-17, -94], [-14, -98], [-10, -79], [-5, -71]]);
    poly(ctx, '#a4a077', [[-13, -71], [-21, -81], [-29, -83], [-36, -93], [-31, -88], [-24, -85], [-27, -96], [-23, -85], [-14, -77], [-14, -89], [-11, -77], [-8, -71]]);
    poly(ctx, '#283f3c', [[9, -69], [20, -80], [29, -83], [38, -96], [37, -103], [34, -94], [29, -89], [31, -100], [28, -104], [24, -87], [15, -80], [17, -95], [14, -98], [10, -80], [4, -71]]);
    poly(ctx, '#8e9572', [[10, -72], [19, -83], [26, -86], [34, -95], [29, -87], [24, -83], [28, -97], [23, -84], [13, -75], [14, -91], [11, -76], [7, -71]]);
    poly(ctx, '#223e3d', [[-15, -77], [-10, -86], [9, -86], [16, -77], [12, -63], [5, -58], [-7, -59], [-13, -67]]);
    poly(ctx, '#b0ac81', [[-12, -77], [-8, -83], [7, -83], [12, -76], [9, -65], [3, -61], [-6, -63], [-10, -68]]);
    poly(ctx, '#737e62', [[2, -82], [8, -80], [10, -75], [7, -66], [2, -64]]);
    poly(ctx, '#273e39', [[-10, -76], [-3, -73], [-4, -68], [-9, -70]]);
    poly(ctx, '#273e39', [[3, -73], [10, -76], [8, -69], [3, -68]]);
    rect(ctx, fury ? '#ffe6a5' : '#e4ae66', -9, -73, 5, 2); rect(ctx, fury ? '#ffe6a5' : '#e4ae66', 4, -73, 5, 2);
    poly(ctx, '#d1c391', [[-1, -76], [2, -76], [3, -67], [0, -62], [-3, -67]]);
    // Moss growing through broken armor.
    pixelOval(ctx, '#355e44', -23, -48, 13, 8, 3); pixelOval(ctx, '#638552', -27, -52, 9, 5, 2);
    rect(ctx, '#9da965', -29, -54, 7, 2); pixelOval(ctx, '#315942', 26, -32, 9, 6, 2);
    rect(ctx, '#779252', 21, -37, 8, 3); rect(ctx, '#456c45', -21, 6, 12, 3);
    if (fury) {
      ctx.globalAlpha = 0.8; rect(ctx, '#f1bd72', -32, -17, 3, 9); rect(ctx, '#f1bd72', 33, -21, 3, 9); ctx.globalAlpha = 1;
    }
  }

  telegraph(e) {
    const ctx = this.ctx;
    const g = e.telegraph;
    if (g) {
      ctx.save(); ctx.globalAlpha = 0.2 + Math.sin(this.time * 16) * 0.05;
      if (g.shape === 'circle') {
        oval(ctx, '#f2a65f', g.x ?? e.x, g.y ?? e.y, g.r || 60, g.r || 60);
        ctx.globalAlpha = 0.75; ctx.strokeStyle = '#edb477'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(g.x ?? e.x, g.y ?? e.y, g.r || 60, 0, TAU); ctx.stroke();
      } else {
        ctx.translate(g.x ?? e.x, g.y ?? e.y); ctx.rotate(g.angle ?? e.facing ?? 0);
        rect(ctx, '#f2a65f', 0, -14, g.length || 180, 28); ctx.globalAlpha = 0.7;
        rect(ctx, '#ecc384', 0, -15, g.length || 180, 2); rect(ctx, '#ecc384', 0, 13, g.length || 180, 2);
      }
      ctx.restore();
    } else if (e.state === 'windup') {
      const radius = e.type === 'boss' ? 76 : e.type === 'knight' ? 35 : 24;
      ctx.globalAlpha = 0.2 + Math.sin(this.time * 15) * 0.04;
      pixelOval(ctx, '#f1b074', e.x, e.y + 3, radius, radius * 0.6, 2);
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = '#e4b778'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(e.x, e.y + 3, radius, radius * 0.6, 0, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  pickup(p) {
    const ctx = this.ctx, bob = Math.sin(this.time * 4 + (p.bob || p.x)) * 2;
    ctx.globalAlpha = 0.18; pixelOval(ctx, '#14342f', p.x, p.y + 5, 6, 3, 2); ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y - 3 + bob));
    if (p.type === 'heart') {
      poly(ctx, '#6d433c', [[-7, -4], [-4, -7], [0, -4], [4, -7], [7, -4], [7, 0], [0, 7], [-7, 0]]);
      poly(ctx, '#dc8166', [[-5, -3], [-3, -5], [0, -2], [3, -5], [5, -3], [5, 0], [0, 5], [-5, 0]]);
      rect(ctx, '#f3b291', -4, -4, 3, 2);
    } else if (p.type === 'mana') this.crystal(0, 0, '#82ccbe', 7);
    else {
      const width = 3 + Math.abs(Math.sin(this.time * 2 + p.x)) * 3;
      pixelOval(ctx, '#806940', 0, 0, width + 1, 8, 2); pixelOval(ctx, '#e2b865', 0, -1, width, 7, 2);
      rect(ctx, '#fff0aa', -width + 1, -5, 2, 6); rect(ctx, '#a98046', 1, -3, 1, 6);
    }
    ctx.restore();
  }

  projectile(p) {
    const ctx = this.ctx, player = p.owner === 'player';
    const color = player ? '#b6e6d0' : '#eeb075';
    this.glow(p.x, p.y, 24, player ? '#94d7c6' : '#e9a368', 0.2);
    const angle = Math.atan2(p.vy || 0, p.vx || 1);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(angle);
    ctx.globalAlpha = 0.35; poly(ctx, color, [[-21, 0], [-4, -4], [4, -3], [7, 0], [4, 3], [-4, 4]]);
    ctx.globalAlpha = 1; rect(ctx, player ? '#659f95' : '#a3694d', -5, -4, 10, 8);
    rect(ctx, color, -3, -3, 9, 6); rect(ctx, '#fff0ca', 0, -2, 6, 4); rect(ctx, '#fff8df', 3, -1, 5, 2);
    ctx.restore();
  }

  groundEffects(effects) {
    const ctx = this.ctx;
    for (const e of effects) {
      if (e.type !== 'ring' || !this.visible(e, 160)) continue;
      const progress = 1 - e.life / (e.maxLife || 0.5), r = (e.r || 60) * (0.35 + progress * 0.65);
      ctx.globalAlpha = Math.max(0, 1 - progress) * 0.8; ctx.strokeStyle = e.color || '#ead09a'; ctx.lineWidth = 3 - progress * 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, TAU); ctx.stroke();
      ctx.globalAlpha *= 0.25; oval(ctx, e.color || '#ead09a', e.x, e.y, r, r);
    }
    ctx.globalAlpha = 1;
  }

  airEffects(effects) {
    const ctx = this.ctx;
    for (const e of effects) {
      if (e.type === 'ring' || !this.visible(e, 150)) continue;
      const progress = Math.max(0, Math.min(1, 1 - e.life / (e.maxLife || 0.5)));
      ctx.globalAlpha = Math.min(1, (1 - progress) * 2);
      if (e.type === 'text') {
        ctx.font = 'bold 13px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#173135'; ctx.fillText(e.text || '', Math.round(e.x) + 1, Math.round(e.y - progress * 25) + 1);
        ctx.fillStyle = e.color || '#f2d5a0'; ctx.fillText(e.text || '', Math.round(e.x), Math.round(e.y - progress * 25));
      } else if (e.type === 'burst') {
        const r = (e.r || 25) * (0.25 + progress * 0.75);
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU + progress * 0.4;
          rect(ctx, e.color || '#ffe4a4', e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, 4 * (1 - progress) + 1, 4 * (1 - progress) + 1);
        }
      } else if (e.type === 'slash') {
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle || 0);
        poly(ctx, e.color || '#fff0bd', [[-4, -20 * (1 - progress)], [3, -3], [5, 21 * (1 - progress)], [-3, 3]]);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  glow(x, y, r, color, alpha = 0.2) {
    const ctx = this.ctx;
    ctx.save(); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  }

  propLight(p) {
    if (p.broken) return;
    if (p.type === 'lantern') this.glow(p.x, p.y - 25, 57, '#efb765', 0.16 + Math.sin(this.time * 5 + p.x) * 0.025);
    if (p.type === 'campfire') this.glow(p.x, p.y - 7, 83, '#f0ab60', 0.18 + Math.sin(this.time * 8) * 0.025);
    if (p.type === 'crystal' && p.active !== false) this.glow(p.x, p.y - 17, 40, '#8cd6bd', 0.15);
    if (p.type === 'altar' && p.active !== false) this.glow(p.x, p.y - 46, 62, '#f0c580', 0.17);
    if (p.type === 'portal' && p.active !== false) this.glow(p.x, p.y - 20, 66, '#98cbb4', 0.12);
    if (p.type === 'shrine' && p.active !== false) this.glow(p.x, p.y - 42, 53, '#c8d59d', 0.13);
  }

  atmosphere(world) {
    const ctx = this.ctx, t = this.time, dungeon = world.id === 'temple';
    if (!dungeon) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      const drift = Math.sin(t * 0.12) * 18;
      for (let i = 0; i < 4; i++) {
        const x = 90 + i * 285 - (this.camX * 0.17 % 285) + drift;
        const grad = ctx.createLinearGradient(x, 0, x + 170, 540);
        grad.addColorStop(0, 'rgba(247,222,157,0.075)'); grad.addColorStop(1, 'rgba(247,222,157,0)');
        poly(ctx, grad, [[x, 0], [x + 37, 0], [x + 305, 540], [x + 172, 540]]);
      }
      ctx.restore();
    }
    for (let i = 0; i < (dungeon ? 24 : 42); i++) {
      const nx = noise(i, 182), ny = noise(i, 887);
      const x = ((nx * 1260 + Math.sin(t * 0.2 + i) * 22 - this.camX * 0.22 + t * (2 + i % 3)) % 1100 + 1100) % 1100 - 70;
      const y = ((ny * 740 + Math.sin(t * 0.3 + i * 3) * 13 - this.camY * 0.14 - t * (1 + i % 2)) % 670 + 670) % 670 - 70;
      const blink = Math.max(0, Math.sin(t * (0.5 + nx) + i * 2));
      ctx.globalAlpha = dungeon ? blink * 0.38 : blink * (i % 3 ? 0.3 : 0.65);
      rect(ctx, dungeon ? '#7ea8a2' : i % 3 ? '#d5d4a0' : '#ece1a2', x, y, i % 3 ? 1 : 2, i % 3 ? 1 : 2);
      if (i % 7 === 0 && !dungeon && blink > 0.7) this.glow(x, y, 9, '#e6daa0', blink * 0.15);
    }
    ctx.globalAlpha = 1;
    const v = ctx.createRadialGradient(480, 250, 150, 480, 270, 600);
    v.addColorStop(0, 'rgba(7,25,30,0)'); v.addColorStop(0.65, dungeon ? 'rgba(7,22,31,0.09)' : 'rgba(10,35,33,0.025)'); v.addColorStop(1, dungeon ? 'rgba(5,19,28,0.5)' : 'rgba(10,33,32,0.3)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, 960, 540);
  }
}
