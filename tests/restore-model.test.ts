import { describe, expect, it } from 'vitest';
import { RestoreModel, mix } from '../src/scenes/restore/model.ts';

const setup = () =>
  new RestoreModel([
    { id: 'roof', needed: 3 },
    { id: 'window', needed: 1 },
  ]);

describe('RestoreModel', () => {
  it('starts cold and unfinished', () => {
    const m = setup();
    expect(m.warmth).toBe(0);
    expect(m.finished).toBe(false);
    expect(m.fixedCount).toBe(0);
  });

  it('warms a little with every click, counting partial work', () => {
    const m = setup();
    expect(m.work('roof')).toBe(false);
    expect(m.warmth).toBeCloseTo(1 / 4);
    m.work('roof');
    expect(m.work('roof')).toBe(true);
    expect(m.isFixed('roof')).toBe(true);
    expect(m.warmth).toBeCloseTo(3 / 4);
  });

  it('ignores extra clicks on something already fixed', () => {
    const m = setup();
    expect(m.work('window')).toBe(true);
    expect(m.work('window')).toBe(false);
    expect(m.get('window').done).toBe(1);
  });

  it('is finished and fully warm once everything is fixed', () => {
    const m = setup();
    for (let i = 0; i < 3; i++) m.work('roof');
    m.work('window');
    expect(m.finished).toBe(true);
    expect(m.warmth).toBe(1);
    expect(m.fixedCount).toBe(2);
  });

  it('rejects unknown ids and empty lists', () => {
    expect(() => setup().work('chimney')).toThrow(/Unknown/);
    expect(() => new RestoreModel([])).toThrow();
  });
});

describe('mix', () => {
  it('blends two colours', () => {
    expect(mix('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mix('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#102030', '#102030', 0.7)).toBe('#102030');
  });

  it('clamps t to 0..1', () => {
    expect(mix('#000000', '#ffffff', -1)).toBe('#000000');
    expect(mix('#000000', '#ffffff', 2)).toBe('#ffffff');
  });
});
