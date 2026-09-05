export const TILE = 32;
export const TILE_TYPES = { GRASS: 0, PATH: 1, WATER: 2, STONE: 3, VOID: 4, FLOWERS: 5, BRIDGE: 6, FLOOR: 7, WALL: 8 };
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function seededRandom(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function createMap(id, name, w, h, base) {
  const map = { id, name, w, h, tileSize: TILE, tiles: Array(w * h).fill(base), props: [], spawns: [], spawn: { x: 0, y: 0 } };
  map.set = (x, y, value) => { if (x >= 0 && y >= 0 && x < w && y < h) map.tiles[y * w + x] = value; };
  map.rect = (x, y, width, height, value) => { for (let yy = y; yy < y + height; yy++) for (let xx = x; xx < x + width; xx++) map.set(xx, yy, value); };
  map.prop = (id, type, x, y, extra = {}) => { const p = { id, type, x: x * TILE, y: y * TILE, ...extra }; map.props.push(p); return p; };
  map.enemy = (id, type, x, y) => map.spawns.push({ id, type, x: x * TILE, y: y * TILE });
  return map;
}

export function createForest(progress = {}) {
  const m = createMap('forest', 'The Mosswood', 56, 44, 0);
  const rng = seededRandom(1707);
  const clearings = [ [28.5,35,6], [28.5,23,5], [9.5,15.5,5.5], [46,17.5,5.5], [28.5,9,5], [13,31,4], [45,33,4] ];
  const pathPoints = [ [28,40,28,9], [9,23,47,23], [9,15,9,23], [46,17,46,33], [13,31,28,31], [28,33,46,33] ];
  for (let y = 0; y < m.h; y++) {
    const riverX = 35 + Math.round(Math.sin(y * .19));
    for (let x = 0; x < m.w; x++) {
      if (x < 2 || y < 2 || x >= m.w - 2 || y >= m.h - 2) m.set(x, y, 4);
      else if (x >= riverX && x <= riverX + 2) m.set(x, y, 2);
      else if (rng() < .14) m.set(x, y, 5);
    }
  }
  for (const [cx,cy,r] of clearings) for (let y = Math.floor(cy-r); y <= cy+r; y++) for (let x = Math.floor(cx-r); x <= cx+r; x++) {
    if (Math.hypot(x-cx,y-cy) < r && m.tiles[y*m.w+x] !== 2) m.set(x,y, rng() > .1 ? 0 : 5);
  }
  for (const [x1,y1,x2,y2] of pathPoints) {
    for (let y = Math.min(y1,y2); y <= Math.max(y1,y2); y++) for (let x = Math.min(x1,x2); x <= Math.max(x1,x2); x++) {
      for (let yy = y-1; yy <= y+1; yy++) for (let xx = x-1; xx <= x+1; xx++) m.set(xx,yy,[2,6].includes(m.tiles[yy*m.w+xx]) ? 6 : 1);
    }
  }
  m.rect(25,7,7,5,3);
  m.rect(7,14,5,4,3);
  m.rect(44,16,5,4,3);
  m.spawn = { x: 28.5*TILE, y: 35.5*TILE };
  const clearingAt = (x,y) => clearings.some(([cx,cy,r])=>Math.hypot(x-cx,y-cy)<r);
  let id=0;
  for (let y=2;y<m.h-2;y++) for(let x=2;x<m.w-2;x++) {
    const t=m.tiles[y*m.w+x];
    if (t !== 0 && t !== 5) continue;
    const nearPath = [[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dy])=>[1,3,6].includes(m.tiles[(y+dy)*m.w+x+dx]));
    if (!clearingAt(x,y) && !nearPath && rng()<.42) m.prop(`tree-${id++}`,'tree',x+.5+(rng()-.5)*.25,y+.8,{solid:true,radius:12,variant:Math.floor(rng()*5)});
    else if (rng()<.08 && !nearPath) m.prop(`flora-${id++}`,rng()<.5?'mushroom':'flower',x+.5,y+.5,{variant:Math.floor(rng()*3)});
  }
  m.prop('campfire','campfire',26.4,35.3,{solid:true,radius:12});
  m.prop('tent','tent',24.6,34,{solid:true,w:62,h:30});
  m.prop('rowan','keeper',27,33.6,{label:'Talk to Rowan',solid:true,radius:10});
  m.prop('camp-well','well',31.5,35,{label:'Rest at the spring',solid:true,radius:16});
  m.prop('sign-crossroads','sign',26.8,25,{label:'Read the trail marker'});
  m.prop('west-shrine','shrine',9.5,15.5,{label:'Kindle the western shrine',active:!!progress.westShrine,solid:true,radius:19});
  m.prop('east-shrine','shrine',46.5,17.5,{label:'Kindle the eastern shrine',active:!!progress.eastShrine,solid:true,radius:19});
  m.prop('temple-entrance','portal',28.5,8.8,{label:'Enter the Hollow Temple',active:!!progress.templeOpened,solid:true,w:82,h:34});
  m.prop('west-chest','chest',12.5,31,{label:'Open the mossy chest',opened:!!progress.chests?.includes('west-chest'),solid:true,radius:12});
  m.prop('east-chest','chest',45,33,{label:'Open the hidden chest',opened:!!progress.chests?.includes('east-chest'),solid:true,radius:12});
  for (const [x,y] of [[26,10],[31,10],[7.5,16.5],[11.5,16.5],[44.5,18.5],[48.5,18.5],[33,23],[39,23],[26,32],[31,37]]) m.prop(`lamp-${id++}`,'lantern',x,y,{solid:true,radius:6});
  for (const [x,y] of [[25,28],[30,28],[7,21],[12,20],[43,25],[49,30],[17,31],[25,38],[32,20],[41,17]]) m.prop(`bush-${id++}`,'bush',x,y,{solid:true,radius:13,breakable:true});
  for (const [x,y] of [[23,21],[19,26],[42,30],[13,16],[24,13],[30,17]]) m.prop(`rock-${id++}`,'rock',x,y,{solid:true,radius:14});
  m.enemy('trail-slime-1','slime',28.5,28);
  m.enemy('trail-slime-2','slime',24,23);
  m.enemy('west-slime-1','slime',10,19);
  m.enemy('west-slime-2','slime',7.5,17.8);
  m.enemy('west-wisp','wisp',12,14);
  m.enemy('crossroad-slime','slime',31,22);
  m.enemy('east-slime','slime',45,20.5);
  m.enemy('east-wisp','wisp',48.5,20.2);
  m.enemy('east-knight','knight',44.5,16);
  m.enemy('cache-slime','slime',43.5,32);
  m.enemy('temple-knight','knight',28.5,14);
  return m;
}

export function createTemple(progress={}) {
  const m=createMap('temple','The Hollow Temple',36,32,4);
  m.rect(3,2,30,29,8);
  m.rect(4,3,28,27,7);
  m.rect(4,14,28,1,8);
  m.rect(16,14,4,1,7);
  m.rect(17,15,2,15,3);
  m.rect(6,5,24,7,3);
  m.spawn={x:18*TILE,y:27.4*TILE};
  m.prop('temple-exit','portal',18,29,{label:'Return to the Mosswood',active:true,solid:true,w:66,h:22});
  m.prop('temple-key','chest',8,20,{label:'Open the guardian chest',opened:!!progress.templeKey,solid:true,radius:13});
  m.prop('west-switch','switch',8,26,{label:'Awaken the western seal',active:!!progress.westSwitch});
  m.prop('east-switch','switch',28,20,{label:'Awaken the eastern seal',active:!!progress.eastSwitch});
  m.prop('boss-gate','gate',18,14.5,{label:'Open the guardian door',opened:!!progress.bossGate,solid:!progress.bossGate,w:128,h:28});
  m.prop('temple-well','well',26.5,27.5,{label:'Drink from the moonwell',solid:true,radius:16});
  m.prop('ember-altar','altar',18,5,{label:'Reclaim the Heart Ember',active:!!progress.bossDefeated,solid:true,radius:22});
  let id=0;
  for (const [x,y] of [[12,19],[12,24],[23,19],[23,24],[8,8],[28,8]]) m.prop(`pillar-${id++}`,'pillar',x,y,{solid:true,radius:17});
  for (const [x,y] of [[5.5,16],[30.5,16],[5.5,28],[30.5,28],[15,14.7],[21,14.7],[6,4.5],[30,4.5],[6,12.5],[30,12.5]]) m.prop(`torch-${id++}`,'lantern',x,y,{solid:true,radius:7});
  for (const [x,y] of [[5.5,21.5],[30,25],[10,4.5],[26,4.5]]) m.prop(`crystal-${id++}`,'crystal',x,y,{solid:true,radius:10});
  m.enemy('temple-knight-west','knight',8.5,22.5);
  m.enemy('temple-wisp-west','wisp',9,18);
  m.enemy('temple-knight-east','knight',28,22.5);
  m.enemy('temple-wisp-east','wisp',26.5,18);
  if (!progress.bossDefeated) m.enemy('hollow-warden','boss',18,8.5);
  return m;
}

export function tileAt(world,x,y) {
  const tx=Math.floor(x/TILE), ty=Math.floor(y/TILE);
  if(tx<0 || ty<0 || tx>=world.w || ty>=world.h) return 4;
  return world.tiles[ty*world.w+tx];
}
export function isBlocked(world,x,y,radius=10,ignoreId=null) {
  for (const [dx,dy] of [[-radius,-radius],[radius,-radius],[-radius,radius],[radius,radius],[0,0]]) {
    if([2,4,8].includes(tileAt(world,x+dx,y+dy))) return true;
  }
  for (const p of world.props) {
    if(!p.solid || p.broken || p.opened && p.type==='gate' || p.id===ignoreId) continue;
    if(p.w && p.h) {
      if(x+radius>p.x-p.w/2 && x-radius<p.x+p.w/2 && y+radius>p.y-p.h/2 && y-radius<p.y+p.h/2) return true;
    } else if(Math.hypot(x-p.x,y-p.y)<radius+(p.radius||10)) return true;
  }
  return false;
}

export function moveBody(world,body,dx,dy,radius=10) {
  // Small substeps keep dashes from tunnelling through walls and water.
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/7));
  let moved=false;
  for(let i=0;i<steps;i++) {
    if(!isBlocked(world,body.x+dx/steps,body.y,radius)) {body.x+=dx/steps;moved=true;}
    if(!isBlocked(world,body.x,body.y+dy/steps,radius)) {body.y+=dy/steps;moved=true;}
  }
  return moved;
}
