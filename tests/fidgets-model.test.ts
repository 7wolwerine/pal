import { describe, expect, it } from 'vitest';
import { QUIZ, plain } from '../src/content/fidgets.ts';
import { SIZE, isSolved, press, startState } from '../src/scenes/fidgets/lights.ts';
import {
  FidgetModel,
  SABOTAGE_PLAN,
  TILT_MAX,
  alignedValue,
  isAligned,
  poke,
  settle,
  type ControlKind,
} from '../src/scenes/fidgets/model.ts';

const KINDS: ControlKind[] = ['tilt', 'screw', 'drawer', 'book', 'plug', 'mail'];

function alignAll(model: FidgetModel): void {
  for (const c of model.controls) model.set(c.id, alignedValue(c.kind));
}

function sequenceOf(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
}

describe('poke', () => {
  it('nudges the picture towards level and snaps it at the end', () => {
    expect(poke('tilt', 7)).toBe(5);
    expect(poke('tilt', -7)).toBe(-5);
    expect(poke('tilt', 3)).toBe(0);
    expect(poke('tilt', 0)).toBe(0);
  });

  it('turns the screw in, pushes the book back, reads mail, shuts the drawer, plugs the lamp in', () => {
    expect(poke('screw', 4)).toBe(3);
    expect(poke('screw', 0)).toBe(0);
    expect(poke('book', 2)).toBe(1);
    expect(poke('mail', 1)).toBe(0);
    expect(poke('drawer', 8)).toBe(0);
    expect(poke('plug', 0)).toBe(1);
  });
});

describe('settle (dragging)', () => {
  it('clamps and snaps', () => {
    expect(settle('tilt', 40)).toBe(TILT_MAX);
    expect(settle('tilt', 0.8)).toBe(0);
    expect(settle('tilt', -4.4)).toBe(-4);
    expect(settle('drawer', 1.2)).toBe(0);
    expect(settle('drawer', -5)).toBe(0);
    expect(settle('plug', 0.7)).toBe(1);
  });
});

describe('FidgetModel', () => {
  it('starts with every single thing almost, but not quite, done', () => {
    const m = new FidgetModel();
    expect(m.controls.map((c) => c.kind).sort()).toEqual([...KINDS].sort());
    for (const c of m.controls) expect(isAligned(c), c.id).toBe(false);
  });

  it('reports the click that finishes a control, and only that one', () => {
    const m = new FidgetModel();
    expect(m.poke('mail')).toBe(false);
    expect(m.poke('mail')).toBe(false);
    expect(m.poke('mail')).toBe(true);
    expect(m.poke('mail')).toBe(false);
    expect(m.poke('plug')).toBe(true);
  });

  it('reports a drag that finishes a control', () => {
    const m = new FidgetModel();
    expect(m.drag('tilt', 3)).toBe(false);
    expect(m.drag('tilt', 0.5)).toBe(true);
  });

  it('can be fully tidied by clicking alone', () => {
    const m = new FidgetModel();
    for (let i = 0; i < 20 && !m.allAligned; i++) for (const c of m.controls) m.poke(c.id);
    expect(m.allAligned).toBe(true);
  });

  it('lets BUG knock out 3, then 2, then 1 control, and then the player has won', () => {
    const m = new FidgetModel();
    for (const count of SABOTAGE_PLAN) {
      alignAll(m);
      m.completeRound();
      const hits = m.planSabotage(sequenceOf(0.1, 0.6, 0.3, 0.9));
      expect(hits).toHaveLength(count);
      expect(new Set(hits.map((h) => h.id)).size).toBe(count);
      for (const hit of hits) {
        m.set(hit.id, hit.value);
        expect(isAligned(m.get(hit.id)), hit.id).toBe(false);
      }
      expect(m.finished).toBe(false);
    }
    alignAll(m);
    m.completeRound();
    expect(m.finished).toBe(true);
  });

  it('will not complete a round while something is still out of place', () => {
    expect(() => new FidgetModel().completeRound()).toThrow();
  });
});

describe('light puzzle', () => {
  it('flips a light and its neighbours', () => {
    const centre = press(0, 4);
    expect(centre).toBe((1 << 4) | (1 << 1) | (1 << 7) | (1 << 3) | (1 << 5));
    expect(press(0, 0)).toBe((1 << 0) | (1 << 1) | (1 << SIZE));
    expect(press(press(123, 5), 5)).toBe(123);
  });

  it('starts unsolved and can always be solved by undoing the presses', () => {
    for (let seed = 0; seed < 20; seed++) {
      let n = seed;
      const random = (): number => ((n = (n * 9301 + 49297) % 233280) / 233280);
      const start = startState(random);
      expect(isSolved(start)).toBe(false);
      // brute force: some set of presses solves it
      let found = false;
      for (let mask = 0; mask < 1 << 9 && !found; mask++) {
        let s = start;
        for (let i = 0; i < 9; i++) if (mask & (1 << i)) s = press(s, i);
        found = isSolved(s);
      }
      expect(found).toBe(true);
    }
  });
});

describe('quiz answers', () => {
  const right = (id: string, answer: string): boolean => QUIZ.find((q) => q.id === id)?.right?.(answer) ?? false;
  it('accepts the answers in any case and with or without accents', () => {
    expect(right('zebra', 'Zebra')).toBe(true);
    expect(right('stars', ' 50 ')).toBe(true);
    expect(right('stars', 'padesát')).toBe(true);
    expect(right('water', 'H₂O')).toBe(true);
    expect(right('water', 'h2o')).toBe(true);
    expect(right('whale', 'Kytovci')).toBe(true);
    expect(right('whale', 'kytovců')).toBe(true);
    expect(right('whale', 'ryby')).toBe(false);
    expect(plain(' Ďábelský Kůň ')).toBe('dabelskykun');
  });

  it('asks one personal question, which takes anything', () => {
    const personal = QUIZ.filter((q) => q.personal);
    expect(personal).toHaveLength(1);
    expect(personal[0]?.right).toBeUndefined();
  });
});
