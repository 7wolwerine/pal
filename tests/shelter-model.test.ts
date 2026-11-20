import { describe, expect, it } from 'vitest';
import { SHELTER } from '../src/content/shelter.ts';
import { ShelterModel } from '../src/scenes/shelter/model.ts';

const make = (path: 'hut' | 'cave') =>
  new ShelterModel(
    path,
    SHELTER.plan[path].map((id) => ({ id, knocks: SHELTER.tasks[id].knocks })),
  );

describe('ShelterModel', () => {
  it('has three jobs in each place: make it safe, make it warm, something dry to wear', () => {
    expect(make('hut').jobs.map((j) => j.id)).toEqual(['door', 'stove', 'chest']);
    expect(make('cave').jobs.map((j) => j.id)).toEqual(['entrance', 'fire', 'fur']);
  });

  it('lets the jobs be done in any order', () => {
    const m = make('cave');
    expect(m.available('fur')).toBe(true);
    expect(m.available('fire')).toBe(true);
    expect(m.available('entrance')).toBe(true);
  });

  it('does no work until the right way is chosen, and the silly way only counts tries', () => {
    const m = make('hut');
    expect(m.work('stove')).toBe(false);
    m.silly('stove');
    expect(m.sillyTries).toBe(1);
    expect(m.warmth).toBe(0);
    m.start('stove');
    expect(m.work('stove')).toBe(false);
    m.work('stove');
    expect(m.work('stove')).toBe(true);
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
