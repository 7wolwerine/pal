import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SCENE_THEME, THEMES } from '../src/audio/themes.ts';
import { SCENE_TRACK, TRACKS, isTrack } from '../src/audio/tracks.ts';

const DIR = new URL('../public/music/', import.meta.url);

/** Length of an ADTS AAC file in seconds, from its frame headers (1024 samples a frame). */
function adtsSeconds(bytes: Uint8Array): number {
  let p = 0;
  let frames = 0;
  let rate = 0;
  const RATES = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];
  while (p + 7 <= bytes.length) {
    if (bytes[p] !== 0xff || ((bytes[p + 1] ?? 0) & 0xf6) !== 0xf0) throw new Error(`not an ADTS frame at ${p}`);
    rate = RATES[((bytes[p + 2] ?? 0) >> 2) & 0xf] ?? 0;
    const len = (((bytes[p + 3] ?? 0) & 3) << 11) | ((bytes[p + 4] ?? 0) << 3) | ((bytes[p + 5] ?? 0) >> 5);
    if (len < 7) throw new Error('bad frame length');
    p += len;
    frames++;
  }
  return (frames * 1024) / rate;
}

describe('music tracks', () => {
  it('every loop lies inside its file, with room to start and to wrap', () => {
    for (const [id, t] of Object.entries(TRACKS)) {
      const seconds = adtsSeconds(new Uint8Array(readFileSync(new URL(t.file, DIR))));
      expect(t.loopStart, id).toBeGreaterThanOrEqual(0.5);
      expect(t.loopEnd - t.loopStart, id).toBeGreaterThan(8);
      // A little of the loop again after its end, so a decoder's shift still loops cleanly.
      expect(seconds, id).toBeGreaterThan(t.loopEnd + 0.3);
      expect(t.start, id).toBeGreaterThanOrEqual(0);
      expect(t.start, id).toBeLessThan(t.loopEnd);
      expect(t.gain, id).toBeGreaterThan(0.3);
      expect(t.gain, id).toBeLessThan(2.5);
    }
  });

  it('every scene with a theme has a recording too, and no file is left over', () => {
    for (const scene of Object.keys(SCENE_THEME)) expect(isTrack(SCENE_TRACK[scene] ?? ''), scene).toBe(true);
    const used = new Set(Object.values(TRACKS).map((t) => t.file));
    expect(readdirSync(DIR).sort()).toEqual([...used].sort());
  });

  it('track ids never shadow a synth theme that is still played by name', () => {
    // The keygen keeps its synth theme; a track of the same name would silently replace it.
    expect(isTrack('keygen')).toBe(false);
    expect(Object.keys(THEMES)).toContain('keygen');
  });
});
