// audio.js — generative WebAudio: a slow aurora pad loop plus all sound effects.
// No audio files: every sound is synthesized, so the game stays fully offline.
export class AuroraAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicTimer = null;
    this.step = 0;
    // A-minor aurora progression, one chord per bar, slow and cold.
    this.chords = [
      [110.0, 164.81, 220.0, 261.63],
      [87.31, 130.81, 174.61, 220.0],
      [98.0, 146.83, 196.0, 246.94],
      [82.41, 123.47, 164.81, 207.65],
    ];
    this.melody = [440, 0, 523.25, 0, 659.25, 0, 523.25, 392, 0, 440, 0, 0, 329.63, 0, 392, 0];
  }

  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.16;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.5;
    this.sfxGain.connect(this.master);
    this.startMusic();
  }

  startMusic() {
    if (this.musicTimer || !this.ctx) return;
    const barMs = 2400;
    const playBar = () => {
      if (this.muted || !this.ctx) return;
      const chord = this.chords[this.step % this.chords.length];
      const t0 = this.ctx.currentTime + 0.05;
      for (const f of chord) {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.5, t0 + 1.1);
        g.gain.linearRampToValueAtTime(0.0001, t0 + barMs / 1000 + 0.4);
        o.connect(g); g.connect(this.musicGain);
        o.start(t0); o.stop(t0 + barMs / 1000 + 0.5);
      }
      const note = this.melody[this.step % this.melody.length];
      if (note) {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'triangle'; o.frequency.value = note;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.35, t0 + 0.15);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.4);
        o.connect(g); g.connect(this.musicGain);
        o.start(t0); o.stop(t0 + 1.5);
      }
      this.step++;
    };
    playBar();
    this.musicTimer = setInterval(playBar, barMs);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.55;
    return this.muted;
  }

  blip(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol || 0.25, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  noise(dur, vol, lowpass) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = lowpass || 1200;
    const g = this.ctx.createGain();
    g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t0);
  }

  shoot(kind) {
    if (kind === 'lance') this.blip(880, 0.09, 'square', 0.10, 440);
    else if (kind === 'prism') this.blip(1240, 0.12, 'sine', 0.14, 1860);
    else if (kind === 'mortar') this.blip(220, 0.16, 'triangle', 0.18, 90);
    else if (kind === 'gale') this.blip(1500, 0.05, 'square', 0.06, 900);
    else this.blip(330, 0.1, 'sine', 0.10, 220);
  }
  hit() { this.blip(180, 0.06, 'triangle', 0.12, 120); }
  coin() { this.blip(1320, 0.07, 'sine', 0.12); setTimeout(() => this.blip(1760, 0.1, 'sine', 0.12), 60); }
  build() { this.blip(523, 0.1, 'triangle', 0.2); setTimeout(() => this.blip(784, 0.14, 'triangle', 0.2), 90); }
  upgrade() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.12, 'triangle', 0.18), i * 70)); }
  leak() { this.blip(160, 0.35, 'sawtooth', 0.22, 60); this.noise(0.25, 0.2, 600); }
  boom() { this.noise(0.5, 0.4, 900); this.blip(90, 0.4, 'sine', 0.3, 40); }
  horn() { this.blip(196, 0.5, 'sawtooth', 0.16, 196); setTimeout(() => this.blip(294, 0.5, 'sawtooth', 0.14), 120); }
  bossHorn() { this.blip(98, 0.9, 'sawtooth', 0.25, 65); this.noise(0.8, 0.25, 500); }
  victory() { [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => this.blip(f, 0.25, 'triangle', 0.2), i * 130)); }
  defeat() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.blip(f, 0.35, 'sawtooth', 0.16), i * 180)); }
}
