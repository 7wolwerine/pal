import { describe, expect, it } from 'vitest';
import { DONTCLICK } from '../src/content/dontclick.ts';
import { DontClickModel, REHANGS } from '../src/scenes/dontclick-model.ts';

describe('DontClickModel', () => {
  it('starts hanging and asking not to be clicked', () => {
    const m = new DontClickModel();
    expect(m.presses).toBe(0);
    expect(m.broken).toBe(false);
    expect(m.label).toBe('Neklikej na mě');
  });

  it('is hung back up REHANGS times, then breaks', () => {
    const m = new DontClickModel();
    for (let i = 1; i <= REHANGS; i++) {
      expect(m.press()).toBe('rehang');
      expect(m.broken).toBe(false);
    }
    expect(m.press()).toBe('break');
    expect(m.broken).toBe(true);
    expect(m.label).toBe(DONTCLICK.broken);
  });

  it('pleads a little more with every press', () => {
    const m = new DontClickModel();
    const seen = [m.label];
    for (let i = 0; i < REHANGS; i++) {
      m.press();
      seen.push(m.label);
    }
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen.at(-1)).toBe(DONTCLICK.labels.at(-1));
  });

  it('has a PAL line for every rehang', () => {
    expect(DONTCLICK.palPress.length).toBe(REHANGS);
    expect(DONTCLICK.labels.length).toBe(REHANGS + 1);
  });

  it('stays broken', () => {
    const m = new DontClickModel();
    for (let i = 0; i <= REHANGS; i++) m.press();
    expect(m.press()).toBe('break');
    expect(m.presses).toBe(REHANGS + 1);
  });
});
