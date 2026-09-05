const HEART_PATH = 'M8 14 1.8 7.8C-2 3.8 3-.8 8 3.5 13-.8 18 3.8 14.2 7.8Z';
const TILE_COLORS = ['#42533a', '#82734d', '#365966', '#78806b', '#13251f', '#667247', '#ab945f', '#596253', '#293e36'];

export class UI {
  constructor(game) {
    this.game = game;
    this.elements = {};
    for (const el of document.querySelectorAll('[id]')) this.elements[el.id] = el;
    this.cache = new Map();
    this.lastState = '';
    this.mapElapsed = 0;
    this.saveChecked = -Infinity;
    this.touchPointers = new Map();
    this.mapContext = this.elements['map-canvas'].getContext('2d');
    this.bind('start-button', () => game.startNew());
    this.bind('continue-button', () => game.continueGame());
    this.bind('pause-button', () => game.togglePause());
    this.bind('resume-button', () => game.togglePause());
    this.bind('map-button', () => game.toggleMap());
    this.bind('close-map', () => game.toggleMap());
    this.bind('respawn-button', () => game.respawn());
    this.bind('restart-button', () => game.restart());
    this.bind('dialog-next', () => game.closeDialog());
    this.bind('potion-button', () => game.usePotion());
    this.bind('sound-button', () => game.audio?.toggleMute());
    this.elements['map-screen'].addEventListener('click', event => {
      if (event.target === this.elements['map-screen']) {
        game.toggleMap();
        this.elements['game-canvas'].focus({ preventScroll: true });
      }
    });
    for (const button of document.querySelectorAll('[data-touch]')) {
      const action = button.dataset.touch;
      button.addEventListener('pointerdown', event => {
        event.preventDefault();
        game.audio?.unlock();
        button.setPointerCapture(event.pointerId);
        this.touchPointers.set(event.pointerId, action);
        button.classList.add('pressed');
        game.setTouch(action, true);
      });
      const release = event => {
        if (!this.touchPointers.has(event.pointerId)) return;
        this.touchPointers.delete(event.pointerId);
        button.classList.remove('pressed');
        game.setTouch(action, false);
      };
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
      button.addEventListener('contextmenu', event => event.preventDefault());
    }
    window.addEventListener('blur', () => this.releaseTouch());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseTouch();
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const panel = ['map-screen', 'pause-screen', 'death-screen', 'victory-screen', 'dialog-overlay', 'title-screen']
        .map(id => this.elements[id]).find(element => !element.hidden);
      if (!panel) return;
      const buttons = [...panel.querySelectorAll('button:not([disabled])')].filter(button => !button.hidden);
      if (!buttons.length) return;
      const index = buttons.indexOf(document.activeElement);
      if (index === -1 || (!event.shiftKey && index === buttons.length - 1) || (event.shiftKey && index === 0)) {
        event.preventDefault();
        buttons[event.shiftKey ? buttons.length - 1 : 0].focus({ preventScroll: true });
      }
    });
    this.update();
  }

  bind(id, action) {
    this.elements[id].addEventListener('click', () => {
      this.game.audio?.unlock();
      action();
      this.update();
      if (this.game.state === 'playing' && !this.game.mapOpen) {
        this.elements['game-canvas'].focus({ preventScroll: true });
      }
    });
  }

  releaseTouch() {
    for (const action of this.touchPointers.values()) this.game.setTouch(action, false);
    this.touchPointers.clear();
    for (const button of document.querySelectorAll('[data-touch].pressed')) button.classList.remove('pressed');
  }

  text(id, value) {
    const text = String(value ?? '');
    if (this.cache.get(id) === text) return;
    this.cache.set(id, text);
    this.elements[id].textContent = text;
  }

  show(id, visible) {
    const element = this.elements[id];
    if (element.hidden === !visible) return;
    element.hidden = !visible;
  }

  update() {
    const { game } = this;
    const state = game.state || 'title';
    const playing = state === 'playing';
    const hasStarted = state !== 'title';
    const player = game.player || {};
    const progress = game.progress || {};
    this.show('title-screen', state === 'title');
    if (state === 'title' && performance.now() - this.saveChecked > 1000) {
      this.show('continue-button', Boolean(game.hasSave));
      this.saveChecked = performance.now();
    }
    this.show('game-hud', hasStarted && state !== 'won' && state !== 'dead');
    this.show('pause-screen', state === 'paused' && !game.mapOpen);
    this.show('death-screen', state === 'dead');
    this.show('victory-screen', state === 'won');
    this.show('map-screen', Boolean(game.mapOpen) && hasStarted && state !== 'dead' && state !== 'won');
    this.show('dialog-overlay', Boolean(game.dialog) && playing && !game.mapOpen);
    this.show('touch-controls', playing && !game.mapOpen && !game.dialog);
    this.show('interact-prompt', Boolean(game.nearby) && playing && !game.dialog && !game.mapOpen);
    this.show('toast', Boolean(game.toast?.text && game.toast.timer > 0) && playing && !game.dialog && !game.mapOpen);
    const boss = game.bossActive ? game.enemies?.find(enemy => enemy.type === 'boss' && enemy.hp > 0) : null;
    this.show('boss-panel', Boolean(boss) && playing && !game.dialog && !game.mapOpen);
    if (boss) {
      const hp = Math.max(0, boss.hp);
      const maxHp = Math.max(1, boss.maxHp);
      const bossHealth = `${hp}/${maxHp}`;
      if (this.cache.get('boss-health') !== bossHealth) {
        this.cache.set('boss-health', bossHealth);
        this.text('boss-health-value', `${Math.ceil(hp)} / ${maxHp}`);
        this.elements['boss-health-fill'].style.width = `${Math.min(100, hp / maxHp * 100)}%`;
        this.elements['boss-health-meter'].setAttribute('aria-valuenow', hp);
        this.elements['boss-health-meter'].setAttribute('aria-valuemax', maxHp);
      }
    }
    this.text('area-name', game.world?.name || 'The Whispering Wood');
    this.text('quest-text', game.quest || 'Find the keeper of the forest.');
    this.text('coins', player.coins || 0);
    this.text('potions', player.potions || 0);
    this.elements['potion-button'].disabled = !player.potions || player.hp >= player.maxHp;
    if (this.cache.get('potion-count') !== player.potions) {
      this.cache.set('potion-count', player.potions);
      this.elements['potion-button'].setAttribute('aria-label', `Drink a healing tonic. ${player.potions || 0} remaining.`);
    }
    this.elements['magic-control'].classList.toggle('locked', !player.magic);
    this.elements['west-shrine'].classList.toggle('complete', Boolean(progress.westShrine));
    this.elements['east-shrine'].classList.toggle('complete', Boolean(progress.eastShrine));
    this.updateHealth(player.hp || 0, player.maxHp || 6);
    const mana = Math.max(0, Number(player.mana) || 0);
    const maxMana = Math.max(1, Number(player.maxMana) || 1);
    const manaPercent = `${Math.round(Math.min(1, mana / maxMana) * 100)}%`;
    if (this.cache.get('mana') !== manaPercent) {
      this.cache.set('mana', manaPercent);
      this.elements['mana-fill'].style.width = manaPercent;
      this.elements['mana-meter'].setAttribute('aria-valuenow', Math.round(mana));
      this.elements['mana-meter'].setAttribute('aria-valuemax', maxMana);
    }
    if (game.nearby) this.text('interact-label', game.nearby.label || this.interactName(game.nearby.type));
    if (game.toast) this.text('toast', game.toast.text);
    if (game.dialog) {
      this.text('dialog-speaker', game.dialog.speaker || 'THE FOREST');
      this.text('dialog-text', game.dialog.text);
    }
    const muted = Boolean(game.audio?.muted);
    if (this.cache.get('muted') !== muted) {
      this.cache.set('muted', muted);
      this.elements['sound-button'].classList.toggle('muted', muted);
      this.elements['sound-button'].setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
      this.elements['sound-button'].setAttribute('aria-pressed', String(muted));
      this.elements['sound-button'].title = muted ? 'Unmute sound' : 'Mute sound';
    }
    if (game.mapOpen) {
      this.text('map-title', game.world?.name || 'The Whispering Wood');
      const now = performance.now();
      if (now - this.mapElapsed > 100 || !this.cache.get('map-open')) {
        this.drawMap();
        this.mapElapsed = now;
      }
    }
    this.cache.set('map-open', Boolean(game.mapOpen));
    if (state === 'won') {
      const seconds = Math.floor(game.stats?.time || game.time || 0);
      this.text('victory-time', `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`);
      this.text('victory-kills', game.stats?.kills || 0);
      this.text('victory-coins', player.coins || 0);
    }
    if (this.lastState !== state) {
      this.releaseTouch();
      this.lastState = state;
      const focusId = { title: 'start-button', paused: 'resume-button', dead: 'respawn-button', won: 'restart-button' }[state];
      if (focusId && !game.mapOpen) this.elements[focusId].focus({ preventScroll: true });
    }
  }

  updateHealth(hp, maxHp) {
    const key = `${hp}/${maxHp}`;
    if (this.cache.get('health-value') === key) return;
    this.cache.set('health-value', key);
    const health = this.elements.health;
    health.setAttribute('aria-label', `${hp} of ${maxHp} health`);
    health.replaceChildren();
    const hearts = Math.min(12, Math.ceil(maxHp));
    for (let index = 0; index < hearts; index++) {
      const heart = document.createElement('span');
      heart.className = 'heart';
      heart.setAttribute('aria-hidden', 'true');
      const amount = Math.max(0, Math.min(1, hp - index));
      heart.innerHTML = `<svg viewBox="0 0 16 16"><defs><clipPath id="heart-clip-${index}"><rect x="0" y="0" width="${amount * 16}" height="16"/></clipPath></defs><path class="heart-base" d="${HEART_PATH}"/><path class="heart-fill" clip-path="url(#heart-clip-${index})" d="${HEART_PATH}"/></svg>`;
      health.append(heart);
    }
  }

  interactName(type) {
    return ({ npc: 'Talk', keeper: 'Talk to the keeper', shrine: 'Awaken shrine', chest: 'Open chest', portal: 'Enter', gate: 'Open gate', switch: 'Awaken seal', altar: 'Restore the light', well: 'Drink from the well' })[type] || 'Interact';
  }

  drawMap() {
    const { world, player } = this.game;
    const ctx = this.mapContext;
    if (!world || !ctx) return;
    const width = this.elements['map-canvas'].width;
    const height = this.elements['map-canvas'].height;
    const cols = world.w || 56;
    const rows = world.h || 44;
    const tileSize = world.tileSize || 32;
    const scale = Math.min((width - 32) / cols, (height - 32) / rows);
    const originX = (width - cols * scale) / 2;
    const originY = (height - rows * scale) / 2;
    ctx.fillStyle = '#152b23';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#7f977525';
    ctx.strokeRect(8.5, 8.5, width - 17, height - 17);
    ctx.imageSmoothingEnabled = false;
    const nested = Array.isArray(world.tiles?.[0]);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tile = nested ? world.tiles[y]?.[x] : world.tiles?.[y * cols + x];
        ctx.fillStyle = TILE_COLORS[tile] || '#42533a';
        ctx.fillRect(Math.floor(originX + x * scale), Math.floor(originY + y * scale), Math.ceil(scale), Math.ceil(scale));
      }
    }
    for (const prop of world.props || []) {
      if (prop.hidden || prop.removed) continue;
      const x = originX + prop.x / tileSize * scale;
      const y = originY + prop.y / tileSize * scale;
      const type = prop.type || prop.kind;
      if (type === 'tree') {
        ctx.fillStyle = '#213c2a88';
        ctx.beginPath();
        ctx.arc(x, y, scale * .65, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'shrine' || type === 'altar' || type === 'switch') {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#e6b563';
        ctx.strokeStyle = '#342f24';
        ctx.lineWidth = 2;
        ctx.fillRect(-4, -4, 8, 8);
        ctx.strokeRect(-4, -4, 8, 8);
        ctx.restore();
      } else if (type === 'portal' || type === 'gate' || type === 'door') {
        ctx.fillStyle = '#abc9cd';
        ctx.fillRect(x - 4, y - 5, 8, 10);
        ctx.strokeStyle = '#29454b';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 4, y - 5, 8, 10);
      } else if (type === 'keeper' || type === 'npc') {
        ctx.fillStyle = '#d0de95';
        ctx.strokeStyle = '#354529';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (type === 'chest' && !prop.opened && !prop.open) {
        ctx.fillStyle = '#b9a372';
        ctx.fillRect(x - 2.5, y - 2, 5, 4);
      }
    }
    if (player) {
      const x = originX + player.x / tileSize * scale;
      const y = originY + player.y / tileSize * scale;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#fff2bd33';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff3c6';
      ctx.strokeStyle = '#213529';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#bdcba388';
    ctx.font = '10px Georgia';
    ctx.textAlign = 'right';
    ctx.fillText('N', width - 20, 29);
    ctx.beginPath();
    ctx.moveTo(width - 24, 37);
    ctx.lineTo(width - 24, 58);
    ctx.moveTo(width - 28, 42);
    ctx.lineTo(width - 24, 37);
    ctx.lineTo(width - 20, 42);
    ctx.strokeStyle = '#bdcba366';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
