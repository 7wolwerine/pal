import { describe, expect, it } from 'vitest';
import { MAX_REFUSALS } from '../src/content/plea.ts';
import { PleaFlow, makeCode, sameCode } from '../src/scenes/plea-model.ts';

describe('PleaFlow', () => {
  it('helps at once for the expert and the plain yes', () => {
    const a = new PleaFlow();
    expect(a.choose('expert')).toBe('help');
    expect(a.helped).toBe('expert');
    const b = new PleaFlow();
    expect(b.choose('yes')).toBe('help');
    expect(b.helped).toBe('yes');
  });

  it('never accepts no: each refusal hurts, then the button gives in', () => {
    const f = new PleaFlow();
    for (let i = 1; i <= MAX_REFUSALS; i++) {
      expect(f.choose('no')).toBe('hurt');
      expect(f.refusals).toBe(i);
    }
    expect(f.worn).toBe(true);
    expect(f.choose('no')).toBe('help');
    expect(f.helped).toBe('gave-in');
    expect(f.refusals).toBe(MAX_REFUSALS);
  });

  it('can be talked round after a refusal or two', () => {
    const f = new PleaFlow();
    f.choose('no');
    expect(f.choose('yes')).toBe('help');
    expect(f.helped).toBe('yes');
    expect(f.refusals).toBe(1);
  });

  it('stays helped once helped', () => {
    const f = new PleaFlow();
    f.choose('expert');
    expect(f.choose('no')).toBe('help');
    expect(f.helped).toBe('expert');
  });
});

describe('one-time code', () => {
  it('is six digits shown in two groups', () => {
    expect(makeCode(() => 0.42)).toBe('444 444');
    expect(makeCode()).toMatch(/^\d{3} \d{3}$/);
    expect(makeCode(() => 0.99999)).toBe('999 999');
  });

  it('matches with or without spaces', () => {
    expect(sameCode('482917', '482 917')).toBe(true);
    expect(sameCode(' 482 917 ', '482 917')).toBe(true);
    expect(sameCode('482918', '482 917')).toBe(false);
  });
});
