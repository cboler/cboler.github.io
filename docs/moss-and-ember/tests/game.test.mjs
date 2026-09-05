import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, SAVE_KEY } from '../src/game.js';
import { TILE, createForest, createTemple, distance, isBlocked, moveBody } from '../src/world.js';

function memoryStorage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

function start(storage = memoryStorage()) {
  const game = new Game(undefined, storage);
  game.startNew();
  game.closeDialog();
  return game;
}

// Test player-sized navigation, including the space between sample positions.
// A tile may be walkable while its props still make a route impassable.
function reachable(world, origin = world.spawn) {
  const step = 16;
  const seen = new Set(['0,0']);
  const queue = [{ x: origin.x, y: origin.y, gx: 0, gy: 0, parent: null }];
  assert.equal(isBlocked(world, origin.x, origin.y, 10), false, `${world.id} spawn is walkable`);
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const gx = current.gx + dx, gy = current.gy + dy, key = `${gx},${gy}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const x = origin.x + gx * step, y = origin.y + gy * step;
      if (x < 0 || y < 0 || x >= world.w * TILE || y >= world.h * TILE) continue;
      if ([4, 8, 12, 16].some(offset => isBlocked(world, current.x + dx * offset, current.y + dy * offset, 10))) continue;
      queue.push({ x, y, gx, gy, parent: current });
    }
  }
  return queue;
}

function interactionRadius(prop) { return prop.type === 'portal' ? 85 : prop.type === 'gate' ? 100 : 65; }

function approach(game, id, nodes) {
  const target = game.world.props.find(prop => prop.id === id);
  assert.ok(target, `prop ${id} exists`);
  const destination = nodes.find(node => distance(node, target) < interactionRadius(target));
  assert.ok(destination, `${game.world.id}: ${id} is reachable by a player-sized body`);
  const path = [];
  for (let node = destination; node; node = node.parent) path.unshift(node);
  Object.assign(game.player, { x: path[0].x, y: path[0].y });
  for (const node of path.slice(1)) {
    moveBody(game.world, game.player, node.x - game.player.x, node.y - game.player.y, 10);
    assert.ok(distance(game.player, node) < .01, `${id}: route remains passable`);
  }
  game.findNearby();
  assert.equal(game.nearby?.id, id, `${id} is selectable at its reachable approach`);
  game.interact();
  return target;
}

function defeatWithSword(game, enemy) {
  const origin = { x: enemy.x, y: enemy.y };
  let attacks = 0;
  while (!enemy.dead && attacks < 30) {
    // Choose a legal position inside sword range, facing the enemy.
    const position = Array.from({ length: 16 }, (_, index) => {
      const angle = index * Math.PI / 8;
      return { x: enemy.x + Math.cos(angle) * 44, y: enemy.y + Math.sin(angle) * 44 };
    }).find(point => !isBlocked(game.world, point.x, point.y, 10));
    assert.ok(position, `${enemy.id} has a walkable combat approach at ${origin.x},${origin.y}`);
    Object.assign(game.player, position);
    game.player.facing = Math.atan2(enemy.y - position.y, enemy.x - position.x);
    game.player.attackCooldown = 0;
    game.setTouch('attack', true);
    game.update(.016);
    game.setTouch('attack', false);
    attacks++;
  }
  assert.equal(enemy.dead, true, `${enemy.id} can be defeated with sword attacks`);
  assert.ok(game.progress.defeated.includes(enemy.id));
}

test('maps are deterministic and all actors begin outside blocking geometry', () => {
  for (const create of [createForest, createTemple]) {
    const a = create(), b = create();
    assert.deepEqual(a.tiles, b.tiles);
    assert.deepEqual(a.props, b.props);
    assert.deepEqual(a.spawns, b.spawns);
    assert.equal(isBlocked(a, a.spawn.x, a.spawn.y, 10), false);
    for (const enemy of a.spawns) {
      const radius = { slime: 12, wisp: 9, knight: 13, boss: 25 }[enemy.type];
      assert.equal(isBlocked(a, enemy.x, enemy.y, radius), false, `${enemy.id} has a clear spawn`);
    }
  }
});

test('large movement and an actual player dash cannot tunnel across water or walls', () => {
  for (const barrier of [2, 8]) {
    const world = { id: 'test', w: 10, h: 8, tiles: Array(80).fill(7), props: [] };
    for (let y = 0; y < world.h; y++) world.tiles[y * world.w + 5] = barrier;
    const body = { x: 110, y: 112 };
    moveBody(world, body, 180, 24, 10);
    assert.ok(body.x <= 150, 'body stops before its radius crosses the barrier');
    assert.equal(isBlocked(world, body.x, body.y, 10), false);
    assert.ok(body.y > 112, 'body can slide along the barrier');

    const game = start();
    game.world = world;
    game.enemies = [];
    Object.assign(game.player, { x: 130, y: 112, facing: 0 });
    game.setTouch('right', true);
    game.setTouch('dash', true);
    for (let i = 0; i < 10; i++) game.update(.04);
    assert.ok(game.player.x <= 150, 'dash and following walk stay on the original side');
    assert.equal(isBlocked(world, game.player.x, game.player.y, 10), false);
  }
});

test('sword direction, magic projectiles, damage immunity, and tonics affect real combat', () => {
  const game = start();
  game.world = { id: 'test', w: 20, h: 20, tiles: Array(400).fill(7), props: [] };
  const prototype = game.enemies.find(enemy => enemy.type === 'slime');
  const ahead = { ...prototype, id: 'ahead', x: 245, y: 200, hp: 4 };
  const behind = { ...prototype, id: 'behind', x: 155, y: 200, hp: 4 };
  game.enemies = [ahead, behind];
  Object.assign(game.player, { x: 200, y: 200, facing: 0, hurtTimer: 0 });
  game.attack();
  assert.equal(ahead.hp, 2);
  assert.equal(behind.hp, 4, 'sword does not hit behind its arc');
  game.castMagic();
  assert.equal(game.projectiles.length, 0, 'magic requires a shrine');
  game.player.magic = true;
  const mana = game.player.mana;
  game.castMagic();
  assert.equal(game.player.mana, mana - 1);
  game.updateProjectiles(.2);
  assert.equal(ahead.dead, true, 'traveling Ember projectile damages a target');
  assert.equal(behind.hp, 4);

  game.hurtPlayer(2, behind);
  assert.equal(game.player.hp, 4);
  game.hurtPlayer(2, behind);
  assert.equal(game.player.hp, 4, 'hurt immunity prevents repeated damage');
  game.usePotion();
  assert.equal(game.player.hp, 6);
  assert.equal(game.player.potions, 2);
  game.usePotion();
  assert.equal(game.player.potions, 2, 'full health does not waste a tonic');
  game.player.hurtTimer = 0;
  game.setTouch('dash', true);
  game.update(.016);
  game.hurtPlayer(2, behind);
  assert.equal(game.player.hp, 6, 'dash grants damage immunity');
});

test('both shrines, guardian key, seals, boss, and altar form a reachable winning route', () => {
  const game = start();
  let nodes = reachable(game.world);
  for (const id of ['rowan', 'camp-well', 'sign-crossroads', 'west-chest', 'east-chest']) {
    approach(game, id, nodes);
    game.closeDialog();
  }
  assert.equal(game.player.maxHp, 8, 'optional western chest increases maximum health');
  approach(game, 'temple-entrance', nodes);
  assert.equal(game.world.id, 'forest', 'temple remains locked before shrines');

  for (const id of ['west-shrine', 'east-shrine']) {
    const shrine = approach(game, id, nodes);
    assert.equal(shrine.active, false, `${id} is guarded initially`);
    const guards = game.enemies.filter(enemy => !enemy.dead && distance(enemy, shrine) < 165);
    assert.ok(guards.length > 0);
    for (const guard of guards) defeatWithSword(game, guard);
    approach(game, id, nodes);
    assert.equal(shrine.active, true);
    assert.equal(game.player.magic, true);
    game.closeDialog();
  }
  assert.equal(game.progress.templeOpened, true);
  approach(game, 'temple-entrance', nodes);
  assert.equal(game.world.id, 'temple');
  nodes = reachable(game.world);
  const altar = game.world.props.find(prop => prop.id === 'ember-altar');
  assert.equal(nodes.some(node => distance(node, altar) < 65), false, 'closed guardian gate blocks the boss arena');
  const boss = game.enemies.find(enemy => enemy.type === 'boss');
  game.hitEnemy(boss, 999, 0);
  assert.equal(boss.hp, boss.maxHp, 'boss cannot be defeated before activation');
  approach(game, 'boss-gate', nodes);
  assert.equal(game.progress.bossGate, false, 'door requires the key');
  const chest = approach(game, 'temple-key', nodes);
  assert.equal(chest.opened, false, 'key chest is guarded');
  for (const guard of game.enemies.filter(enemy => !enemy.dead && distance(enemy, chest) < 155)) defeatWithSword(game, guard);
  approach(game, 'temple-key', nodes);
  assert.equal(game.progress.templeKey, true);
  approach(game, 'boss-gate', nodes);
  assert.equal(game.progress.bossGate, false, 'key alone does not bypass the floor seals');
  approach(game, 'west-switch', nodes);
  approach(game, 'boss-gate', nodes);
  assert.equal(game.progress.bossGate, false, 'one floor seal is insufficient');
  approach(game, 'east-switch', nodes);
  approach(game, 'boss-gate', nodes);
  assert.equal(game.progress.bossGate, true);
  nodes = reachable(game.world);
  approach(game, 'ember-altar', nodes);
  assert.equal(game.progress.won, false, 'altar requires defeating the boss');
  game.update(.016);
  assert.equal(boss.active, true, 'entering the arena awakens the Warden');
  defeatWithSword(game, boss);
  assert.equal(game.progress.bossDefeated, true);
  assert.equal(altar.active, true);
  approach(game, 'ember-altar', nodes);
  assert.equal(game.state, 'won');
  assert.equal(game.progress.won, true);
  const restored = new Game(undefined, game.storage);
  restored.continueGame();
  assert.equal(restored.state, 'won');
  assert.equal(restored.enemies.some(enemy => enemy.type === 'boss'), false);
});

test('save, continue, death, and respawn preserve progression and restore playable state', () => {
  const storage = memoryStorage(), game = start(storage);
  game.progress.westShrine = true;
  game.progress.chests.push('west-chest');
  game.player.magic = true;
  game.player.maxHp = 8;
  game.player.hp = 3;
  game.player.coins = 25;
  game.player.potions = 2;
  const enemy = game.enemies[0];
  defeatWithSword(game, enemy);
  Object.assign(game.player, { x: game.world.spawn.x, y: game.world.spawn.y - 16 });
  const position = { x: game.player.x, y: game.player.y };
  game.save();
  assert.equal(game.hasSave, true);
  const continued = new Game(undefined, storage);
  continued.continueGame();
  assert.equal(continued.state, 'playing');
  assert.equal(continued.player.hp, 8);
  assert.equal(continued.player.magic, true);
  assert.equal(continued.player.potions, 2);
  assert.equal(continued.enemies.some(item => item.id === enemy.id), false);
  assert.equal(continued.world.props.find(prop => prop.id === 'west-shrine').active, true);
  assert.equal(continued.world.props.find(prop => prop.id === 'west-chest').opened, true);
  assert.ok(distance(continued.player, position) < .01);
  continued.player.coins = 25;
  continued.player.hurtTimer = 0;
  continued.hurtPlayer(99, { x: continued.player.x - 30, y: continued.player.y });
  assert.equal(continued.state, 'dead');
  assert.equal(continued.stats.deaths, 1);
  continued.respawn();
  assert.equal(continued.state, 'playing');
  assert.equal(continued.player.hp, 8);
  assert.equal(continued.player.mana, continued.player.maxMana);
  assert.equal(continued.player.coins, 20);
  assert.equal(continued.progress.westShrine, true);
  assert.equal(isBlocked(continued.world, continued.player.x, continued.player.y, 10), false);
});

test('enemy attacks telegraph before damage and the boss changes attacks and resets on retreat', () => {
  for (const type of ['slime', 'knight', 'wisp']) {
    const game = start();
    game.world = { id: 'test', w: 20, h: 20, tiles: Array(400).fill(7), props: [] };
    const enemy = { ...game.enemies.find(item => item.type === type), x: 240, y: 200, state: 'idle', timer: 0 };
    game.enemies = [enemy];
    Object.assign(game.player, { x: 200, y: 200, hurtTimer: 0 });
    game.update(.016);
    assert.equal(enemy.state, 'windup', `${type} gives warning before its attack`);
    assert.equal(game.player.hp, 6);
    if (type !== 'wisp') assert.ok(enemy.telegraph);
    for (let i = 0; i < 35; i++) game.update(.04);
    assert.ok(game.player.hp < 6, `${type}'s attack can damage the player`);
  }

  const game = start();
  game.changeWorld('temple', false);
  const boss = game.enemies.find(item => item.type === 'boss');
  game.enemies = [boss];
  game.progress.bossGate = true;
  Object.assign(game.player, { x: boss.x, y: boss.y + 65, hurtTimer: 0 });
  game.update(.016);
  assert.equal(boss.active, true);
  boss.timer = 0;
  game.update(.016);
  assert.equal(boss.state, 'windup');
  assert.equal(boss.attackKind, 'slam');
  assert.equal(boss.telegraph.shape, 'circle');
  assert.equal(game.player.hp, 6);
  for (let i = 0; i < 26; i++) game.update(.04);
  assert.equal(game.player.hp, 4, 'telegraphed slam deals two hearts');
  assert.ok(game.effects.some(effect => effect.type === 'ring'));

  boss.hp = Math.floor(boss.maxHp / 2) - 1;
  boss.timer = 0;
  game.updateEnemy(boss, .016);
  assert.equal(boss.attackKind, 'slam');
  for (let i = 0; i < 18; i++) game.updateEnemy(boss, .04);
  assert.equal(game.projectiles.length, 8, 'second phase adds a radial volley to the slam');

  game.player.y = 15 * TILE;
  game.updateEnemy(boss, .016);
  assert.equal(boss.active, false);
  assert.equal(boss.hp, boss.maxHp, 'retreat resets boss health');
  assert.equal(game.bossActive, false);
  assert.equal(game.projectiles.length, 0, 'retreat clears hostile projectiles');
});

test('unavailable storage, malformed saves, and obstructed saved positions recover safely', () => {
  const unavailable = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  assert.doesNotThrow(() => start(unavailable));
  const storage = memoryStorage();
  for (const content of ['invalid json', '{}', JSON.stringify({ version: 99, player: {}, progress: {} })]) {
    storage.setItem(SAVE_KEY, content);
    const game = new Game(undefined, storage);
    assert.equal(game.hasSave, false);
    game.continueGame();
    assert.equal(game.state, 'playing');
  }
  const game = start(storage);
  const saved = JSON.parse(storage.getItem(SAVE_KEY));
  saved.position = { x: -100, y: -100 };
  storage.setItem(SAVE_KEY, JSON.stringify(saved));
  const restored = new Game(undefined, storage);
  restored.continueGame();
  assert.equal(restored.player.x, restored.world.spawn.x);
  assert.equal(restored.player.y, restored.world.spawn.y);
});
