const NOTES = [0, 7, 12, 14, 19, 14, 12, 7, 0, 7, 12, 19, 24, 19, 14, 7];
const MUTE_KEY = 'moss-ember-audio-muted';

/** Quiet, entirely synthesized forest ambience and responsive action sounds. */
export class AudioManager {
  constructor() {
    this.context = null;
    this.master = null;
    this.effects = null;
    this.ambience = null;
    this.muted = false;
    this.noteTimer = 1;
    this.noteIndex = 0;
    this.lastWorld = '';
    this.lastPlayed = new Map();
    try { this.muted = localStorage.getItem(MUTE_KEY) === 'true'; } catch { /* Private browsing still plays normally. */ }
  }

  unlock() {
    try {
      if (!this.context) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return;
        this.context = new Context();
        this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : .34;
        this.master.connect(this.context.destination);
        this.effects = this.context.createGain();
        this.effects.gain.value = .7;
        this.effects.connect(this.master);
        this.ambience = this.context.createGain();
        this.ambience.gain.value = .21;
        this.ambience.connect(this.master);
        const delay = this.context.createDelay(.8);
        const feedback = this.context.createGain();
        const wet = this.context.createGain();
        delay.delayTime.value = .37;
        feedback.gain.value = .25;
        wet.gain.value = .18;
        this.ambience.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(wet);
        wet.connect(this.master);
        this.createWind();
      }
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    } catch { /* Audio is optional on browsers without Web Audio. */ }
  }

  toggleMute() {
    this.unlock();
    this.muted = !this.muted;
    if (this.context && this.master) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : .34, this.context.currentTime, .06);
    }
    try { localStorage.setItem(MUTE_KEY, String(this.muted)); } catch { /* Storage may be unavailable. */ }
    return this.muted;
  }

  tone(frequency, duration = .15, type = 'sine', volume = .1, delay = 0, endFrequency = frequency, target = this.effects) {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || !target) return;
    const time = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), time);
    if (endFrequency !== frequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), time + duration);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + Math.min(.018, duration * .15));
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    oscillator.connect(gain);
    gain.connect(target);
    oscillator.start(time);
    oscillator.stop(time + duration + .02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  noise(duration, volume, frequency = 1200, filterType = 'lowpass') {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running') return;
    const length = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) samples[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = .5;
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.effects);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + duration);
    source.start();
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  createWind() {
    const ctx = this.context;
    const length = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      last = (last + (Math.random() * 2 - 1) * .025) / 1.025;
      data[i] = last * 2.4;
    }
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = 440;
    gain.gain.value = .11;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambience);
    source.start();
    this.windFilter = filter;
    this.windGain = gain;
  }

  update(dt, worldId) {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || this.muted) return;
    const temple = worldId === 'temple' || worldId === 'dungeon';
    if (worldId !== this.lastWorld) {
      this.lastWorld = worldId;
      this.noteTimer = Math.min(this.noteTimer, .5);
      this.windFilter.frequency.setTargetAtTime(temple ? 180 : 440, ctx.currentTime, 1.2);
      this.windGain.gain.setTargetAtTime(temple ? .07 : .11, ctx.currentTime, 1.2);
    }
    this.noteTimer -= dt;
    if (this.noteTimer > 0) return;
    this.noteTimer = temple ? 2.1 : 1.65;
    const semitone = NOTES[this.noteIndex % NOTES.length];
    const frequency = (temple ? 146.832 : 195.998) * Math.pow(2, semitone / 12);
    this.tone(frequency, 2.8, 'sine', .085, 0, frequency, this.ambience);
    this.tone(frequency * 2, 1.2, 'sine', .015, .014, frequency * 2, this.ambience);
    if (this.noteIndex % 4 === 0) {
      this.tone(temple ? 73.416 : 97.999, 5.5, 'sine', .075, 0, temple ? 73.416 : 97.999, this.ambience);
      this.tone(temple ? 110 : 146.832, 4.5, 'sine', .035, .1, temple ? 110 : 146.832, this.ambience);
    }
    this.noteIndex++;
  }

  play(name) {
    if (!this.context || this.context.state !== 'running' || this.muted) return;
    const now = this.context.currentTime;
    if (now - (this.lastPlayed.get(name) ?? -1) < .035) return;
    this.lastPlayed.set(name, now);
    switch (name) {
      case 'sword': case 'attack':
        this.noise(.11, .15, 1500, 'highpass');
        this.tone(440, .09, 'triangle', .075, 0, 120);
        break;
      case 'hit':
        this.noise(.1, .16, 800);
        this.tone(140, .12, 'triangle', .21, 0, 50);
        break;
      case 'hurt':
        this.noise(.18, .13, 600);
        this.tone(180, .22, 'sawtooth', .065, 0, 72);
        break;
      case 'dash':
        this.noise(.2, .085, 1900, 'bandpass');
        this.tone(220, .13, 'sine', .045, 0, 550);
        break;
      case 'coin': case 'pickup':
        this.tone(987.77, .1, 'sine', .13);
        this.tone(1318.51, .3, 'sine', .11, .07);
        break;
      case 'magic': case 'ember':
        this.noise(.22, .06, 2100, 'bandpass');
        this.tone(196, .22, 'triangle', .13, 0, 784);
        this.tone(587.33, .34, 'sine', .09, .055, 1174.66);
        break;
      case 'shrine': case 'unlock':
        [392, 493.88, 587.33, 783.99, 987.77].forEach((frequency, i) => this.tone(frequency, 1.7, 'sine', .11, i * .12));
        this.tone(196, 2.4, 'sine', .1);
        break;
      case 'door': case 'chest':
        this.noise(.25, .12, 470);
        this.tone(130.81, .35, 'triangle', .11, 0, 196);
        this.tone(392, .6, 'sine', .07, .16);
        break;
      case 'potion': case 'heal':
        [523.25, 659.25, 783.99].forEach((frequency, i) => this.tone(frequency, .45, 'sine', .1, i * .08));
        break;
      case 'win':
        [392, 493.88, 587.33, 783.99, 659.25, 783.99, 987.77, 1174.66].forEach((frequency, i) => this.tone(frequency, 1.7, 'sine', .14, i * .2));
        [196, 293.66, 392].forEach(frequency => this.tone(frequency, 3, 'sine', .085, .9));
        break;
      case 'dead': case 'death':
        [293.66, 246.94, 196, 146.83].forEach((frequency, i) => this.tone(frequency, 1.2, 'sine', .13, i * .22));
        break;
      case 'boss':
        this.tone(73.42, 1.8, 'triangle', .17);
        this.tone(110, 1.6, 'sine', .15, .15);
        break;
      case 'talk': case 'ui':
        this.tone(523.25, .08, 'sine', .07);
        break;
      default:
        this.tone(392, .14, 'sine', .06);
    }
  }
}
