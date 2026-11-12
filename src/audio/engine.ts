import { THEMES, degreeToMidi, midiToHz, type Theme, type ThemeId } from './themes.ts';

const LOOKAHEAD_S = 0.15;
const TICK_MS = 30;
const FADE_S = 2.2;
const MASTER = 0.16;

interface Voice {
  readonly id: ThemeId;
  readonly theme: Theme;
  readonly bus: GainNode;
  step: number;
  nextAt: number;
  stopAt?: number;
  drone?: OscillatorNode[];
}

/**
 * A tiny synthesizer that plays looping themes and short sound effects.
 * It only starts after the first user gesture (browsers require that), fades
 * smoothly between themes, pauses while the tab is hidden, and can be muted.
 * Everything is generated locally with WebAudio; there are no audio files.
 */
class AudioEngine {
  #ctx: AudioContext | null = null;
  #master: GainNode | null = null;
  #voices: Voice[] = [];
  #wanted: ThemeId | null = null;
  #timer = 0;
  #muted = false;

  get muted(): boolean {
    return this.#muted;
  }

  /** 'locked' until the first gesture, then the AudioContext state; plus the playing themes. */
  get state(): { context: string; themes: string[] } {
    return {
      context: this.#ctx?.state ?? 'locked',
      themes: this.#voices.filter((v) => v.stopAt === undefined).map((v) => v.id),
    };
  }

  /** Call from a user gesture. Safe to call many times. */
  unlock(): void {
    if (this.#ctx) {
      void this.#ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.#ctx = new Ctx();
    this.#master = this.#ctx.createGain();
    this.#master.gain.value = this.#muted ? 0 : MASTER;
    this.#master.connect(this.#ctx.destination);
    this.#timer = window.setInterval(() => this.#schedule(), TICK_MS);
    document.addEventListener('visibilitychange', () => {
      if (!this.#ctx) return;
      if (document.hidden) void this.#ctx.suspend();
      else void this.#ctx.resume();
    });
    if (this.#wanted) this.#start(this.#wanted);
  }

  setMuted(muted: boolean): void {
    this.#muted = muted;
    if (this.#ctx && this.#master) {
      this.#master.gain.setTargetAtTime(muted ? 0 : MASTER, this.#ctx.currentTime, 0.08);
    }
  }

  /** Crossfades to a theme. Before unlock, just remembers it. */
  play(id: ThemeId): void {
    if (this.#wanted === id) return;
    this.#wanted = id;
    if (this.#ctx) this.#start(id);
  }

  /** A bright little "treasure found" jingle. */
  treasure(): void {
    const ctx = this.#ctx;
    const out = this.#master;
    if (!ctx || !out) return;
    const t0 = ctx.currentTime + 0.02;
    [84, 88, 91, 96, 100].forEach((midi, i) => {
      this.#pluck(out, midiToHz(midi), t0 + i * 0.07, 0.5, 'triangle', 0.55);
      this.#pluck(out, midiToHz(midi + 12), t0 + i * 0.07 + 0.02, 0.35, 'sine', 0.2);
    });
  }

  /** A rubbery "boing": a pitch that drops and wobbles. */
  boing(level = 0.45): void {
    const ctx = this.#ctx;
    const out = this.#master;
    if (!ctx || !out) return;
    const t0 = ctx.currentTime + 0.01;
    const osc = ctx.createOscillator();
    const wobble = ctx.createOscillator();
    const depth = ctx.createGain();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, t0);
    osc.frequency.exponentialRampToValueAtTime(85, t0 + 0.38);
    wobble.frequency.value = 17;
    depth.gain.value = 35;
    wobble.connect(depth).connect(osc.frequency);
    gain.gain.setValueAtTime(level, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.42);
    osc.connect(gain).connect(out);
    osc.start(t0);
    wobble.start(t0);
    osc.stop(t0 + 0.45);
    wobble.stop(t0 + 0.45);
  }

  /** Something glassy shattering: a burst of bright noise and a few tinkles. */
  shatter(): void {
    const ctx = this.#ctx;
    const out = this.#master;
    if (!ctx || !out) return;
    const t0 = ctx.currentTime + 0.01;
    const length = Math.floor(ctx.sampleRate * 0.35);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 2800;
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    noise.connect(high).connect(gain).connect(out);
    noise.start(t0);
    [100, 105, 98, 108, 103].forEach((midi, i) => {
      this.#pluck(out, midiToHz(midi), t0 + 0.03 + i * 0.045, 0.3, 'triangle', 0.18);
    });
  }

  #start(id: ThemeId): void {
    const ctx = this.#ctx;
    const master = this.#master;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    for (const v of this.#voices) {
      if (v.stopAt !== undefined) continue;
      v.bus.gain.cancelScheduledValues(now);
      v.bus.gain.setValueAtTime(v.bus.gain.value, now);
      v.bus.gain.linearRampToValueAtTime(0, now + FADE_S);
      v.stopAt = now + FADE_S;
    }
    const theme = THEMES[id];
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, now);
    bus.gain.linearRampToValueAtTime(1, now + FADE_S);
    bus.connect(master);
    const voice: Voice = { id, theme, bus, step: 0, nextAt: now + 0.05 };
    if (theme.drone !== undefined) voice.drone = this.#drone(bus, theme);
    this.#voices.push(voice);
  }

  #schedule(): void {
    const ctx = this.#ctx;
    if (!ctx || ctx.state !== 'running') return;
    const horizon = ctx.currentTime + LOOKAHEAD_S;
    for (const v of this.#voices) {
      const stepS = 60 / v.theme.bpm / 2;
      while (v.nextAt < horizon) {
        this.#playStep(v, v.nextAt, stepS);
        v.step++;
        v.nextAt += stepS;
      }
    }
    // Drop voices that have finished fading out.
    this.#voices = this.#voices.filter((v) => {
      if (v.stopAt === undefined || ctx.currentTime < v.stopAt + 0.1) return true;
      v.drone?.forEach((o) => o.stop());
      v.bus.disconnect();
      return false;
    });
  }

  #playStep(v: Voice, at: number, stepS: number): void {
    const { theme, bus } = v;
    const i = v.step % theme.melody.length;
    const degree = theme.melody[i];
    if (degree !== null && degree !== undefined) {
      this.#pluck(bus, this.#hz(theme, degreeToMidi(theme, degree)), at, stepS * 2.2, theme.lead, theme.leadLevel);
    }
    // A soft pad chord every 8 steps.
    if (v.step % 8 === 0) {
      const chord = theme.chords[Math.floor(v.step / 8) % theme.chords.length] ?? [];
      for (const d of chord) {
        this.#pad(bus, this.#hz(theme, degreeToMidi(theme, d) - 12), at, stepS * 8);
      }
    }
  }

  #hz(theme: Theme, midi: number): number {
    const sour = theme.sour ? (Math.random() * 2 - 1) * theme.sour : 0;
    return midiToHz(midi + sour / 100);
  }

  #pluck(out: AudioNode, hz: number, at: number, len: number, type: OscillatorType, level: number): void {
    const ctx = this.#ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(hz, at);
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(level * 0.3, at + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, at + len);
    osc.connect(env).connect(out);
    osc.start(at);
    osc.stop(at + len + 0.05);
  }

  #pad(out: AudioNode, hz: number, at: number, len: number): void {
    const ctx = this.#ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(hz, at);
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(0.05, at + len * 0.3);
    env.gain.linearRampToValueAtTime(0, at + len);
    osc.connect(env).connect(out);
    osc.start(at);
    osc.stop(at + len + 0.05);
  }

  #drone(out: AudioNode, theme: Theme): OscillatorNode[] {
    const ctx = this.#ctx;
    if (!ctx) return [];
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const gain = ctx.createGain();
    gain.gain.value = 0.05;
    filter.connect(gain).connect(out);
    const base = midiToHz(degreeToMidi(theme, theme.drone ?? 0) - 24);
    return [-7, 7].map((cents) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = base;
      osc.detune.value = cents;
      osc.connect(filter);
      osc.start();
      return osc;
    });
  }

  /** Stops everything (used by tests and teardown). */
  dispose(): void {
    window.clearInterval(this.#timer);
    void this.#ctx?.close();
    this.#ctx = null;
    this.#voices = [];
  }
}

export const audio = new AudioEngine();
