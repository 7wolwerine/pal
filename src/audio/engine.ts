import { SCENE_THEME, THEMES, degreeToMidi, midiToHz, type Theme, type ThemeId } from './themes.ts';
import { TRACKS, isTrack, type Track, type TrackId } from './tracks.ts';

/** What can play underneath a scene: a synth theme, or one of the recorded loops. */
export type Cue = ThemeId | TrackId;

const LOOKAHEAD_S = 0.15;
const TICK_MS = 30;
const FADE_S = 2.2;
const MASTER = 0.16;
/** The recordings are mastered loud; this sits them under the game at about the synth's weight. */
const TRACK_LEVEL = 1.2;

interface Voice {
  readonly id: Cue;
  /** A synth theme; unset while a recording plays instead. */
  theme?: Theme;
  /** The recording, once it is loaded and running. */
  source?: AudioBufferSourceNode;
  readonly bus: GainNode;
  step: number;
  nextAt: number;
  stopAt?: number;
  drone?: OscillatorNode[];
}

/**
 * Plays the music under each scene and the short sound effects. The music is
 * a recorded loop per scene (see tracks.ts), fetched from the game's own files
 * when the scene starts, or a little synth theme (the keygen, and a stand-in
 * whenever a recording cannot be loaded). The effects are generated with
 * WebAudio. It only starts after the first user gesture (browsers require
 * that), fades smoothly between scenes, pauses while the tab is hidden, and
 * can be muted.
 */
class AudioEngine {
  #ctx: AudioContext | null = null;
  #master: GainNode | null = null;
  #voices: Voice[] = [];
  #wanted: Cue | null = null;
  /**
   * The files, fetched once each and kept compressed (a few megabytes in all).
   * Decoded audio is far bigger, so a decoded loop is let go once it is neither
   * playing nor wanted; it is decoded again from the kept bytes if it returns.
   * A failed fetch or decode is forgotten, so the next scene that needs the file tries again.
   */
  #bytes = new Map<string, Promise<ArrayBuffer | null>>();
  #decoded = new Map<string, Promise<AudioBuffer | null>>();
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

  /** Crossfades to a theme or a recording. Before unlock, just remembers it (and starts fetching the file). */
  play(id: Cue): void {
    if (this.#wanted === id) return;
    this.#wanted = id;
    if (isTrack(id)) void this.#fetch(TRACKS[id].file);
    if (this.#ctx) this.#start(id);
  }

  /** Starts downloading a scene's recording ahead of time, so it is ready when the scene begins. */
  preload(id: Cue | undefined): void {
    if (id && isTrack(id)) void this.#fetch(TRACKS[id].file);
  }

  #fetch(file: string): Promise<ArrayBuffer | null> {
    let bytes = this.#bytes.get(file);
    if (!bytes) {
      // The offline single-file build carries the loops inside the page itself.
      const inline = document.querySelector<HTMLScriptElement>(`script[type="application/octet-stream"][data-music="${file}"]`);
      bytes = (
        inline
          ? Promise.resolve(Uint8Array.from(atob(inline.text.trim()), (c) => c.charCodeAt(0)).buffer)
          : fetch(`${import.meta.env.BASE_URL}music/${file}`).then((r) => (r.ok ? r.arrayBuffer() : null))
      )
        .catch(() => null)
        .then((b) => {
          if (!b && this.#bytes.get(file) === bytes) this.#bytes.delete(file);
          return b;
        });
      this.#bytes.set(file, bytes);
    }
    return bytes;
  }

  #decode(ctx: AudioContext, file: string): Promise<AudioBuffer | null> {
    let decoded = this.#decoded.get(file);
    if (!decoded) {
      decoded = this.#fetch(file)
        .then((bytes) => (bytes ? ctx.decodeAudioData(bytes.slice(0)).catch(() => null) : null))
        .then((buffer) => {
          if (!buffer && this.#decoded.get(file) === decoded) this.#decoded.delete(file);
          return buffer;
        });
      this.#decoded.set(file, decoded);
    }
    return decoded;
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

  /** A short tactile click; `pitch` in MIDI notes, so each control can sound its own. */
  click(pitch = 72, level = 0.5): void {
    const ctx = this.#ctx;
    const out = this.#master;
    if (!ctx || !out) return;
    const t0 = ctx.currentTime + 0.005;
    this.#pluck(out, midiToHz(pitch), t0, 0.06, 'square', level * 0.6);
    this.#pluck(out, midiToHz(pitch + 19), t0, 0.03, 'triangle', level * 0.4);
  }

  /** Something settling into place: a low thunk and a bright little ping. */
  snap(pitch = 79): void {
    const ctx = this.#ctx;
    const out = this.#master;
    if (!ctx || !out) return;
    const t0 = ctx.currentTime + 0.005;
    this.#pluck(out, midiToHz(43), t0, 0.12, 'sine', 0.9);
    this.#pluck(out, midiToHz(pitch), t0 + 0.03, 0.35, 'triangle', 0.5);
    this.#pluck(out, midiToHz(pitch + 7), t0 + 0.09, 0.4, 'sine', 0.3);
  }

  /** A lock clicking open: two metal clacks and a spring. */
  latch(): void {
    const ctx = this.#ctx;
    const out = this.#master;
    if (!ctx || !out) return;
    const t0 = ctx.currentTime + 0.01;
    this.#pluck(out, midiToHz(88), t0, 0.04, 'square', 0.5);
    this.#pluck(out, midiToHz(55), t0, 0.08, 'triangle', 0.8);
    this.#pluck(out, midiToHz(91), t0 + 0.12, 0.05, 'square', 0.45);
    this.#pluck(out, midiToHz(50), t0 + 0.12, 0.1, 'triangle', 0.8);
    this.#pluck(out, midiToHz(96), t0 + 0.2, 0.25, 'sine', 0.25);
  }

  /** Glass giving a little under a knock: a short, gritty crunch. */
  crunch(): void {
    const ctx = this.#ctx;
    const out = this.#master;
    if (!ctx || !out) return;
    const t0 = ctx.currentTime + 0.005;
    const length = Math.floor(ctx.sampleRate * 0.12);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (Math.random() < 0.3 ? 1 : 0.2) * (1 - i / length) ** 2;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 1800;
    const gain = ctx.createGain();
    gain.gain.value = 0.55;
    noise.connect(high).connect(gain).connect(out);
    noise.start(t0);
    this.#pluck(out, midiToHz(96 + Math.floor(Math.random() * 4)), t0, 0.08, 'triangle', 0.25);
  }

  /** A hammer tap on wood. */
  knock(): void {
    const ctx = this.#ctx;
    const out = this.#master;
    if (!ctx || !out) return;
    const t0 = ctx.currentTime + 0.005;
    this.#pluck(out, midiToHz(50 + Math.floor(Math.random() * 3)), t0, 0.08, 'square', 0.5);
    this.#pluck(out, midiToHz(38), t0, 0.1, 'sine', 0.9);
  }

  /** Water rushing away: filtered noise that fades. */
  gurgle(seconds = 1.6): void {
    const ctx = this.#ctx;
    const out = this.#master;
    if (!ctx || !out) return;
    const t0 = ctx.currentTime + 0.01;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.setValueAtTime(500, t0);
    band.frequency.linearRampToValueAtTime(180, t0 + seconds);
    band.Q.value = 3;
    const gain = ctx.createGain();
    gain.gain.value = 0.35;
    noise.connect(band).connect(gain).connect(out);
    noise.start(t0);
    [67, 71, 74, 79].forEach((midi, i) => this.#pluck(out, midiToHz(midi), t0 + 0.1 + i * 0.18, 0.15, 'sine', 0.25));
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

  #start(id: Cue): void {
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
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, now);
    bus.connect(master);
    const voice: Voice = { id, bus, step: 0, nextAt: now + 0.05 };
    this.#voices.push(voice);
    if (isTrack(id)) void this.#startTrack(ctx, voice, TRACKS[id]);
    else this.#startTheme(ctx, voice, THEMES[id]);
  }

  #fadeIn(ctx: AudioContext, voice: Voice): void {
    const now = ctx.currentTime;
    voice.bus.gain.setValueAtTime(0, now);
    voice.bus.gain.linearRampToValueAtTime(1, now + FADE_S);
  }

  #startTheme(ctx: AudioContext, voice: Voice, theme: Theme): void {
    voice.theme = theme;
    voice.step = 0;
    voice.nextAt = ctx.currentTime + 0.05;
    if (theme.drone !== undefined) voice.drone = this.#drone(voice.bus, theme);
    this.#fadeIn(ctx, voice);
  }

  /** Loads the recording and fades it in; if it cannot be had, the scene's synth theme plays instead. */
  async #startTrack(ctx: AudioContext, voice: Voice, track: Track): Promise<void> {
    const buffer = await this.#decode(ctx, track.file);
    // Faded out (or torn down) while it loaded: nothing to start.
    if (voice.stopAt !== undefined || this.#ctx !== ctx) return;
    if (!buffer) {
      const fallback = SCENE_THEME[voice.id] ?? (Object.hasOwn(THEMES, voice.id) ? (voice.id as ThemeId) : 'window');
      this.#startTheme(ctx, voice, THEMES[fallback]);
      return;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = track.loopStart;
    source.loopEnd = Math.min(track.loopEnd, buffer.duration);
    const level = ctx.createGain();
    level.gain.value = track.gain * TRACK_LEVEL;
    source.connect(level).connect(voice.bus);
    source.start(ctx.currentTime + 0.02, Math.min(track.start, buffer.duration));
    voice.source = source;
    this.#fadeIn(ctx, voice);
  }

  #schedule(): void {
    const ctx = this.#ctx;
    if (!ctx || ctx.state !== 'running') return;
    const horizon = ctx.currentTime + LOOKAHEAD_S;
    for (const v of this.#voices) {
      if (!v.theme) continue;
      const stepS = 60 / v.theme.bpm / 2;
      while (v.nextAt < horizon) {
        this.#playStep(v, v.nextAt, stepS);
        v.step++;
        v.nextAt += stepS;
      }
    }
    // Drop voices that have finished fading out.
    const before = this.#voices.length;
    this.#voices = this.#voices.filter((v) => {
      if (v.stopAt === undefined || ctx.currentTime < v.stopAt + 0.1) return true;
      v.drone?.forEach((o) => o.stop());
      v.source?.stop();
      v.bus.disconnect();
      return false;
    });
    if (this.#voices.length !== before) this.#release();
  }

  /** Lets go of decoded loops that nothing plays or wants any more. */
  #release(): void {
    const keep = new Set<string>();
    for (const v of this.#voices) if (isTrack(v.id)) keep.add(TRACKS[v.id].file);
    if (this.#wanted && isTrack(this.#wanted)) keep.add(TRACKS[this.#wanted].file);
    for (const file of [...this.#decoded.keys()]) if (!keep.has(file)) this.#decoded.delete(file);
  }

  #playStep(v: Voice, at: number, stepS: number): void {
    const { theme, bus } = v;
    if (!theme) return;
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
