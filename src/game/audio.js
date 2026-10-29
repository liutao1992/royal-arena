export class GameAudio {
  constructor() { this.ctx = null; this.enabled = true; }
  init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  tone(freq, duration = 0.08, type = 'sine', volume = 0.04, delay = 0) {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(t); osc.stop(t + duration);
  }
  play(type) {
    if (!this.enabled) return;
    if (type === 'deploy') { this.tone(280, .07, 'triangle'); this.tone(410, .1, 'triangle', .035, .06); }
    if (type === 'hit') this.tone(115, .045, 'square', .018);
    if (type === 'arrow') this.tone(620, .035, 'triangle', .012);
    if (type === 'fireball') { this.tone(85, .4, 'sawtooth', .06); this.tone(45, .5, 'square', .04, .05); }
    if (type === 'tower') { this.tone(160, .25, 'square', .05); this.tone(90, .5, 'sawtooth', .04, .12); }
    if (type === 'win') [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .35, 'triangle', .05, i * .12));
    if (type === 'lose') [330, 277, 220].forEach((f, i) => this.tone(f, .35, 'triangle', .05, i * .17));
    if (type === 'click') this.tone(480, .05, 'sine', .025);
    if (type === 'error') this.tone(140, .12, 'square', .025);
  }
}
