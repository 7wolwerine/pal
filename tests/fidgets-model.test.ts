import { describe, expect, it } from 'vitest';
import { FIDGETS, QUIZ, isRightAnswer, plain } from '../src/content/fidgets.ts';
import { BOARD, BOX, GEARS, MODULE, gearPath, meshAngle, outerRadius, pitchRadius, speedRatio, trainAngles, turning, wrap } from '../src/scenes/fidgets/gears.ts';
import { HELP_AFTER_MS, SIZE, isSolved, press, startState } from '../src/scenes/fidgets/lights.ts';
import {
  BOOKS,
  FidgetModel,
  SABOTAGE_PLAN,
  SCREWS,
  TILT_MAX,
  alignedValue,
  isAligned,
  poke,
  screwOut,
  screwsOut,
  settle,
  type ControlKind,
} from '../src/scenes/fidgets/model.ts';
import { QuizModel } from '../src/scenes/fidgets/quiz-model.ts';

const KINDS: ControlKind[] = ['tilt', 'screw', 'chain', 'book', 'plug', 'mail'];

function alignAll(model: FidgetModel): void {
  for (const c of model.controls) model.set(c.id, alignedValue(c.kind));
}

function sequenceOf(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
}

describe('poke', () => {
  it('straightens the picture in a few firm nudges, not in tiny steps', () => {
    expect(poke('tilt', 11)).toBe(5);
    expect(poke('tilt', 5)).toBe(0);
    expect(poke('tilt', -11)).toBe(-5);
    expect(poke('tilt', 7)).toBe(0);
    expect(poke('tilt', 0)).toBe(0);
    // From anywhere it can hang, two clicks at most.
    for (let v = -TILT_MAX; v <= TILT_MAX; v++) {
      let n = 0;
      for (let x = v; x !== 0; x = poke('tilt', x)) n++;
      expect(n, `from ${v}`).toBeLessThanOrEqual(3);
    }
  });

  it('drives in the screw that was clicked, or else the first loose one', () => {
    const all = (1 << SCREWS) - 1;
    expect(SCREWS).toBe(4);
    expect(poke('screw', all, 2)).toBe(all & ~(1 << 2));
    expect(poke('screw', 0b1010)).toBe(0b1000);
    // A screw already in place: the click goes to the next loose one.
    expect(poke('screw', 0b1010, 0)).toBe(0b1000);
    expect(poke('screw', 0)).toBe(0);
  });

  it('stands one book up per click, switches the chain lamp, reads mail, plugs the lamp in', () => {
    expect(poke('book', BOOKS)).toBe(BOOKS - 1);
    expect(poke('book', 0)).toBe(0);
    expect(poke('chain', 0)).toBe(1);
    expect(poke('chain', 1)).toBe(0);
    expect(poke('mail', 1)).toBe(0);
    expect(poke('plug', 0)).toBe(1);
  });
});

describe('settle (dragging)', () => {
  it('clamps and snaps', () => {
    expect(settle('tilt', 40)).toBe(TILT_MAX);
    expect(settle('tilt', 1.8)).toBe(0);
    expect(settle('tilt', -4.4)).toBe(-4);
    expect(settle('book', 9)).toBe(BOOKS);
    expect(settle('chain', 0.7)).toBe(1);
    expect(settle('plug', 0.7)).toBe(1);
  });
});

describe('FidgetModel', () => {
  it('starts with every single thing almost, but not quite, done', () => {
    const m = new FidgetModel();
    expect(m.controls.map((c) => c.kind).sort()).toEqual([...KINDS].sort());
    for (const c of m.controls) expect(isAligned(c), c.id).toBe(false);
    expect(screwsOut(m.get('screw').value)).toBe(4);
    expect(m.get('book').value).toBe(BOOKS);
  });

  it('reports the click that finishes a control, and only that one', () => {
    const m = new FidgetModel();
    expect(m.poke('mail')).toBe(false);
    expect(m.poke('mail')).toBe(false);
    expect(m.poke('mail')).toBe(true);
    expect(m.poke('mail')).toBe(false);
    expect(m.poke('plug')).toBe(true);
    expect(m.poke('chain')).toBe(true);
    // Pulled again, the lamp goes off and is no longer done.
    expect(m.poke('chain')).toBe(false);
    expect(isAligned(m.get('chain'))).toBe(false);
  });

  it('needs a click for every screw', () => {
    const m = new FidgetModel();
    const clicks = [3, 0, 2, 1].map((part) => m.poke('screw', part));
    expect(clicks).toEqual([false, false, false, true]);
    for (let i = 0; i < SCREWS; i++) expect(screwOut(m.get('screw').value, i)).toBe(false);
  });

  it('reports a drag that finishes a control', () => {
    const m = new FidgetModel();
    expect(m.drag('tilt', 3)).toBe(false);
    expect(m.drag('tilt', 0.5)).toBe(true);
  });

  it('can be fully tidied by clicking alone', () => {
    const m = new FidgetModel();
    for (let i = 0; i < 20 && !m.allAligned; i++) for (const c of m.controls) if (!isAligned(c)) m.poke(c.id);
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

  it('when BUG loosens screws, it is always at least two', () => {
    for (let r = 0; r < 1; r += 0.05) expect(screwsOut(FidgetModel.spoil('screw', () => r))).toBeGreaterThanOrEqual(2);
  });

  it('will not complete a round while something is still out of place', () => {
    expect(() => new FidgetModel().completeRound()).toThrow();
  });
});

describe('gear train', () => {
  const pairs = GEARS.flatMap((g, i) => (g.parent === undefined ? [] : [[GEARS[g.parent]!, g, i] as const]));

  it('has cogs of different sizes, each on a peg exactly one mesh away from its neighbour', () => {
    expect(GEARS.length).toBeGreaterThanOrEqual(4);
    expect(new Set(GEARS.map((g) => g.teeth)).size).toBe(GEARS.length);
    for (const [parent, gear] of pairs) {
      const d = Math.hypot(gear.x - parent.x, gear.y - parent.y);
      expect(d).toBeCloseTo(pitchRadius(parent.teeth) + pitchRadius(gear.teeth), 1);
    }
  });

  it('keeps cogs that are not neighbours apart, and everything on the board', () => {
    GEARS.forEach((a, i) =>
      GEARS.forEach((b, j) => {
        if (j <= i || b.parent === i || a.parent === j) return;
        expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.id}-${b.id}`).toBeGreaterThan(outerRadius(a.teeth) + outerRadius(b.teeth));
      }),
    );
    for (const g of GEARS) {
      const r = outerRadius(g.teeth);
      expect(g.x - r).toBeGreaterThanOrEqual(0);
      expect(g.y - r).toBeGreaterThanOrEqual(0);
      expect(g.y + r).toBeLessThanOrEqual(BOARD.height);
      expect(g.x + r, g.id).toBeLessThan(BOX.x);
      if (g.loose) {
        expect(g.loose.x - r).toBeGreaterThanOrEqual(BOX.x - 1);
        expect(g.loose.x + r).toBeLessThanOrEqual(BOX.x + BOX.width + 1);
      }
    }
  });

  it('turns neighbours the opposite way, the bigger the slower', () => {
    for (const [parent, gear, i] of pairs) {
      const p = speedRatio(GEARS.indexOf(parent));
      const s = speedRatio(i);
      expect(Math.sign(s)).toBe(-Math.sign(p));
      expect(Math.abs(s) * gear.teeth).toBeCloseTo(Math.abs(p) * parent.teeth, 6);
    }
  });

  it('puts a gap of one cog where its neighbour has a tooth, at any moment', () => {
    for (const drive of [0, 0.37, 1.9, 5.2, -3]) {
      const angles = trainAngles(drive);
      for (const [parent, gear, i] of pairs) {
        const alpha = Math.atan2(gear.y - parent.y, gear.x - parent.x);
        const pitch = Math.PI * MODULE;
        // Arc from the contact line to the parent's nearest tooth, and to the child's nearest gap.
        const tooth = wrap((angles[GEARS.indexOf(parent)] ?? 0) - alpha, (Math.PI * 2) / parent.teeth) * pitchRadius(parent.teeth);
        const gap = wrap((angles[i] ?? 0) + Math.PI / gear.teeth - alpha - Math.PI, (Math.PI * 2) / gear.teeth) * pitchRadius(gear.teeth);
        expect(Math.abs(wrap(tooth + gap, pitch)), `${gear.id} at ${drive}`).toBeLessThan(1e-6);
      }
    }
    expect(meshAngle(GEARS[0]!, 0, GEARS[1]!)).toBeCloseTo(trainAngles(0)[1] ?? NaN, 9);
  });

  it('turns a cog only once it and every cog before it are on their pegs', () => {
    expect(turning([true, false, false, false, false])).toEqual([true, false, false, false, false]);
    expect(turning([true, true, false, true, true])).toEqual([true, true, false, false, false]);
    expect(turning([true, true, true, true, true])).toEqual([true, true, true, true, true]);
  });

  it('draws real teeth', () => {
    const d = gearPath(12);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d.match(/A/g)?.length).toBe(12 * 3);
  });
});

describe('light puzzle', () => {
  it('offers the help of PAL after fifteen seconds, in exactly these words', () => {
    expect(HELP_AFTER_MS).toBe(15000);
    expect(FIDGETS.sequenceHelp).toBe('Pomoz mi');
    expect(FIDGETS.sequenceHelped).toBe('No jasně, jsem tu přece pro tebe <3');
  });

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
  const right = (id: string, answer: string): boolean => {
    const q = QUIZ.find((x) => x.id === id);
    return q ? isRightAnswer(q, answer) : false;
  };

  it('accepts exactly the right word, in any case and with spaces around it', () => {
    expect(right('zebra', 'zebra')).toBe(true);
    expect(right('zebra', ' Zebra ')).toBe(true);
    expect(right('zebra', 'ZEBRA')).toBe(true);
    expect(right('stars', '50')).toBe(true);
    expect(right('stars', ' 50 ')).toBe(true);
    expect(right('stars', 'padesát')).toBe(true);
    expect(right('stars', 'Padesat')).toBe(true);
    expect(right('water', 'H2O')).toBe(true);
    expect(right('water', 'h2o')).toBe(true);
    expect(right('water', 'H₂O')).toBe(true);
    expect(right('whale', 'Kytovci')).toBe(true);
  });

  it('never accepts anything else', () => {
    for (const wrong of ['zebr', 'zebry', 'zebrafish', 'nezebra', 'zeb ra', 'kůň', '']) expect(right('zebra', wrong), wrong).toBe(false);
    for (const wrong of ['5', '500', '50.', '050', '51', 'padesát jedna', '5 0']) expect(right('stars', wrong), wrong).toBe(false);
    for (const wrong of ['voda', 'H2', 'H2O2', 'HO2', 'h 2 o', 'h2o!', 'h20']) expect(right('water', wrong), wrong).toBe(false);
    for (const wrong of ['kytovců', 'kytovec', 'kyt', 'velryba', 'ryby']) expect(right('whale', wrong), wrong).toBe(false);
    expect(plain(' Ďábelský Kůň ')).toBe('dabelsky kun');
  });

  it('asks one personal question, which takes anything', () => {
    const personal = QUIZ.filter((q) => q.personal);
    expect(personal).toHaveLength(1);
    expect(personal[0]?.answers).toBeUndefined();
  });
});

describe('quiz form', () => {
  const good = { zebra: 'zebra', stars: '50', water: 'H2O', whale: 'kytovci', comfortFood: 'buchtičky' };

  it('lights a lamp only for exactly the right answer', () => {
    const quiz = new QuizModel();
    expect(quiz.lit('zebra', '')).toBe(false);
    expect(quiz.lit('zebra', 'z')).toBe(false);
    expect(quiz.lit('zebra', 'zebr')).toBe(false);
    expect(quiz.lit('zebra', 'zebra')).toBe(true);
    expect(quiz.lit('zebra', 'zebrax')).toBe(false);
    expect(quiz.lit('comfortFood', 'cokoli')).toBe(true);
    expect(quiz.lit('comfortFood', '  ')).toBe(false);
  });

  it('after a wrong answer is sent, PAL hints, and the lamp stays red', () => {
    const quiz = new QuizModel();
    const values = { ...good, whale: 'ryby' };
    expect(quiz.submit(values)).toEqual({ kind: 'hint', id: 'whale' });
    expect(quiz.lit('whale', 'ryby')).toBe(false);
    // Still red however often it is sent, and PAL then writes the right word in.
    expect(quiz.submit(values)).toEqual({ kind: 'fill', id: 'whale', answer: 'kytovci' });
    expect(quiz.lit('whale', 'ryby')).toBe(false);
    expect(quiz.lit('whale', 'kytov')).toBe(false);
    expect(quiz.lit('whale', 'kytovci')).toBe(true);
    expect(quiz.submit({ ...values, whale: 'kytovci' })).toEqual({ kind: 'done' });
    expect(quiz.hints).toBe(1);
  });

  it('asks for what is missing first, and goes through when all is right', () => {
    const quiz = new QuizModel();
    expect(quiz.submit({ ...good, stars: ' ' })).toEqual({ kind: 'incomplete', id: 'stars' });
    expect(quiz.submit(good)).toEqual({ kind: 'done' });
  });
});
