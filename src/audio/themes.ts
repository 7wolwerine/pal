/**
 * The music, written as data: every theme is a little looping pattern played
 * by a synthesizer. Nothing is downloaded; it is all generated in the browser.
 */

export type ThemeId = 'garden' | 'desk' | 'window' | 'tense' | 'cozy' | 'dark';

export interface Theme {
  readonly bpm: number;
  /** MIDI note of the scale's root. */
  readonly root: number;
  /** Scale as semitone offsets from the root. */
  readonly scale: readonly number[];
  /** One step per 8th note: a scale degree to pluck, or null for a rest. */
  readonly melody: readonly (number | null)[];
  /** Chord tones (scale degrees) held as a soft pad, changed every 8 steps. */
  readonly chords: readonly (readonly number[])[];
  readonly lead: OscillatorType;
  /** Gain of the plucked lead (0..1). */
  readonly leadLevel: number;
  /** A low sustained note under everything, as a scale degree an octave down. */
  readonly drone?: number;
  /** Cents of random detune per note — makes the dark theme sour. */
  readonly sour?: number;
}

const MAJOR_PENTA = [0, 2, 4, 7, 9];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

export const THEMES: Record<ThemeId, Theme> = {
  // Music box in the garden.
  garden: {
    bpm: 92,
    root: 72,
    scale: MAJOR_PENTA,
    melody: [0, 2, 4, 2, 3, null, 2, 1, 0, 2, 4, 5, 4, null, 3, null],
    chords: [
      [0, 2, 4],
      [3, 0, 2],
    ],
    lead: 'triangle',
    leadLevel: 0.5,
  },
  // Soft and a little dreamy at the desk.
  desk: {
    bpm: 80,
    root: 65,
    scale: MAJOR,
    melody: [0, null, 2, 4, null, 6, 4, null, 3, null, 5, 2, null, 4, null, null],
    chords: [
      [0, 2, 4, 6],
      [3, 5, 0, 2],
    ],
    lead: 'sine',
    leadLevel: 0.55,
  },
  // Cute and bouncy inside PAL's window.
  window: {
    bpm: 104,
    root: 67,
    scale: MAJOR_PENTA,
    melody: [0, 1, 2, 4, 2, 1, 0, null, 2, 3, 4, 3, 2, null, 1, null],
    chords: [
      [0, 2, 4],
      [1, 3, 0],
    ],
    lead: 'square',
    leadLevel: 0.22,
  },
  // Quicker, minor, ticking: the water is rising.
  tense: {
    bpm: 132,
    root: 57,
    scale: MINOR,
    melody: [0, 0, 2, 0, 3, 0, 2, 0, 0, 0, 4, 0, 3, 0, 2, 1],
    chords: [
      [0, 2, 4],
      [5, 0, 2],
    ],
    lead: 'triangle',
    leadLevel: 0.4,
    drone: 0,
  },
  // Warm and cosy once things are being mended.
  cozy: {
    bpm: 84,
    root: 62,
    scale: MAJOR,
    melody: [4, 2, 0, 2, 4, 4, 4, null, 3, 3, 3, null, 4, 6, 6, null],
    chords: [
      [0, 2, 4],
      [4, 6, 1],
    ],
    lead: 'triangle',
    leadLevel: 0.45,
  },
  // The reveal: the same sweet tunes, slowed, minor, out of tune.
  dark: {
    bpm: 58,
    root: 50,
    scale: MINOR,
    melody: [0, null, null, 1, null, null, 5, null, 0, null, null, 6, null, 4, null, null],
    chords: [
      [0, 2, 5],
      [1, 3, 6],
    ],
    lead: 'sine',
    leadLevel: 0.5,
    drone: 0,
    sour: 35,
  },
};

/** Which theme plays under each scene. */
export const SCENE_THEME: Record<string, ThemeId> = {
  mailbox: 'garden',
  desk: 'desk',
  welcome: 'window',
  fidgets: 'window',
  rescue: 'tense',
  restore: 'cozy',
  plea: 'desk',
  prize: 'window',
  reveal: 'dark',
};

export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** MIDI note for a scale degree; degrees past the scale wrap up an octave. */
export function degreeToMidi(theme: Theme, degree: number): number {
  const n = theme.scale.length;
  const octave = Math.floor(degree / n);
  const step = theme.scale[((degree % n) + n) % n] ?? 0;
  return theme.root + octave * 12 + step;
}
