import { describe, expect, it } from 'vitest';
import { SCENE_THEME, THEMES, degreeToMidi, midiToHz, type ThemeId } from '../src/audio/themes.ts';

describe('music themes', () => {
  it('tunes A4 to 440 Hz and doubles per octave', () => {
    expect(midiToHz(69)).toBeCloseTo(440);
    expect(midiToHz(81)).toBeCloseTo(880);
  });

  it('wraps scale degrees into the next octave', () => {
    const t = THEMES.garden; // pentatonic, root 72
    expect(degreeToMidi(t, 0)).toBe(72);
    expect(degreeToMidi(t, 4)).toBe(72 + 9);
    expect(degreeToMidi(t, 5)).toBe(84);
    expect(degreeToMidi(t, -1)).toBe(72 - 12 + 9);
  });

  it('gives every theme playable data', () => {
    for (const [id, t] of Object.entries(THEMES)) {
      expect(t.bpm, id).toBeGreaterThan(30);
      expect(t.melody.length, id).toBeGreaterThan(0);
      expect(t.chords.length, id).toBeGreaterThan(0);
      for (const n of t.melody) if (n !== null) expect(Number.isInteger(n), id).toBe(true);
    }
  });

  it('maps every scene to an existing theme, with the reveal dark', () => {
    for (const theme of Object.values(SCENE_THEME)) expect(Object.keys(THEMES)).toContain(theme as ThemeId);
    expect(SCENE_THEME.reveal).toBe('dark');
  });
});
