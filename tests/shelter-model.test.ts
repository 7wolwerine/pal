import { describe, expect, it } from 'vitest';
import { SHELTER } from '../src/content/shelter.ts';
import { ShelterModel } from '../src/scenes/shelter/model.ts';

const make = (path: 'hut' | 'cave') =>
  new ShelterModel(
    path,
    SHELTER.plan[path].map((id) => ({ id, knocks: SHELTER.tasks[id].knocks })),
  );

describe('ShelterModel', () => {
  it('lets the hut be fixed in any order', () => {
    const m = make('hut');
    expect(m.available('window')).toBe(true);
    expect(m.available('roof')).toBe(true);
  });

  it('makes the cave go hearth, wood, fire', () => {
    const m = make('cave');
    expect(m.available('fire')).toBe(false);
    m.start('hearth');
    for (let i = 0; i < SHELTER.tasks.hearth.knocks; i++) m.work('hearth');
    expect(m.available('wood')).toBe(true);
    expect(m.available('fire')).toBe(false);
  });

  it('does no work until the right way is chosen, and the silly way only counts tries', () => {
    const m = make('hut');
    expect(m.work('roof')).toBe(false);
    m.silly('roof');
    expect(m.sillyTries).toBe(1);
    expect(m.warmth).toBe(0);
    m.start('roof');
    expect(m.work('roof')).toBe(false);
    m.work('roof');
    expect(m.work('roof')).toBe(true);
    expect(m.warmth).toBeGreaterThan(0);
  });

  it('is finished when every job is done', () => {
    const m = make('cave');
    for (const job of m.jobs) {
      m.start(job.id);
      while (!m.isDone(job.id)) m.work(job.id);
    }
    expect(m.finished).toBe(true);
    expect(m.warmth).toBe(1);
  });
});
