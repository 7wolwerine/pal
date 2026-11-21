import { describe, expect, it } from 'vitest';
import { SCENE_THEME } from '../src/audio/themes.ts';
import { SCENE_TRACK, isTrack } from '../src/audio/tracks.ts';
import { Director } from '../src/core/director.ts';
import { JOURNEY_GOAL, SCENES } from '../src/scenes/order.ts';

const ids = SCENES.map((s) => s.id);

describe('scene order', () => {
  it('plays the scenes in the order the story is told', () => {
    expect(ids).toEqual([
      'mailbox',
      'desk',
      'welcome',
      'fidgets',
      'paint',
      'rescue',
      'shelter',
      'flower',
      'dontclick',
      'chest',
      'plea',
      'download',
      'prize',
      'glass',
      'crash',
      'reveal',
    ]);
  });

  it('keeps the rules the Director enforces: unique ids, one final scene, the reveal last', () => {
    expect(new Set(ids).size).toBe(ids.length);
    expect(SCENES.filter((s) => s.final).map((s) => s.id)).toEqual(['reveal']);
    expect(ids.at(-1)).toBe('reveal');
    // The game builds its Director from exactly this list; it must not refuse it.
    expect(() => new Director(SCENES, {})).not.toThrow();
  });

  it('the journey bar counts down to a scene that exists, before the reveal', () => {
    expect(ids).toContain(JOURNEY_GOAL);
    expect(ids.indexOf(JOURNEY_GOAL)).toBeLessThan(ids.indexOf('reveal'));
  });

  it('every scene has its own recording, and no music is set for a scene that is not there', () => {
    for (const id of ids) expect(isTrack(SCENE_TRACK[id] ?? ''), id).toBe(true);
    expect(Object.keys(SCENE_TRACK).sort()).toEqual([...ids].sort());
  });

  it('every scene has a synth theme to fall back on, and no theme is set for a scene that is not there', () => {
    expect(Object.keys(SCENE_THEME).sort()).toEqual([...ids].sort());
  });
});
