import { describe, expect, it } from 'vitest';
import {
  CHECK_COUNT,
  FidgetModel,
  LED_COUNT,
  SABOTAGE_PLAN,
  alignedValue,
  isAligned,
  poke,
  type ControlKind,
} from '../src/scenes/fidgets/model.ts';

const KINDS: ControlKind[] = ['progress', 'badge', 'checks', 'tilt', 'leds', 'plug'];

function alignAll(model: FidgetModel): void {
  for (const c of model.controls) model.set(c.id, alignedValue(c.kind));
}

function sequenceOf(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
}

describe('poke', () => {
  it('fills the bar, clears notifications one by one, ticks boxes, levels the frame', () => {
    expect(poke('progress', 99)).toBe(100);
    expect(poke('badge', 3)).toBe(2);
    expect(poke('badge', 0)).toBe(0);
    expect(poke('checks', 0b1011, 2)).toBe(0b1111);
    expect(poke('tilt', 3)).toBe(2);
    expect(poke('tilt', -1)).toBe(0);
    expect(poke('tilt', 0)).toBe(0);
    expect(poke('leds', 0b110111, 3)).toBe(0b111111);
    expect(poke('plug', 0)).toBe(1);
  });
});

describe('FidgetModel', () => {
  it('starts with every single thing almost, but not quite, done', () => {
    const m = new FidgetModel();
    expect(m.controls.map((c) => c.kind).sort()).toEqual([...KINDS].sort());
    for (const c of m.controls) expect(isAligned(c), c.id).toBe(false);
    expect(m.get('progress').value).toBe(99);
    // exactly one unticked box and one dark LED
    expect(CHECK_COUNT - m.get('checks').value.toString(2).replace(/0/g, '').length).toBe(1);
    expect(LED_COUNT - m.get('leds').value.toString(2).replace(/0/g, '').length).toBe(1);
  });

  it('reports the click that finishes a control, and only that one', () => {
    const m = new FidgetModel();
    expect(m.poke('badge')).toBe(false);
    expect(m.poke('badge')).toBe(false);
    expect(m.poke('badge')).toBe(true);
    expect(m.poke('badge')).toBe(false);
    expect(m.poke('progress')).toBe(true);
  });

  it('can be fully tidied by clicking alone', () => {
    const m = new FidgetModel();
    for (let i = 0; i < 3; i++) m.poke('badge');
    m.poke('progress');
    m.poke('checks', 2);
    m.poke('tilt');
    m.poke('tilt');
    m.poke('leds', 3);
    m.poke('plug');
    expect(m.allAligned).toBe(true);
  });

  it('lets BUG knock out 3, 2 and 1 controls with really-broken values, then gives up', () => {
    const m = new FidgetModel();
    const sizes: number[] = [];
    for (let round = 1; round <= SABOTAGE_PLAN.length; round++) {
      alignAll(m);
      expect(m.completeRound()).toBe(round);
      const hits = m.planSabotage(sequenceOf(0.1, 0.9, 0.5, 0.3, 0.7));
      sizes.push(hits.length);
      expect(new Set(hits.map((h) => h.id)).size).toBe(hits.length);
      for (const h of hits) {
        expect(isAligned({ id: h.id, kind: m.get(h.id).kind, value: h.value })).toBe(false);
        m.set(h.id, h.value);
      }
    }
    expect(sizes).toEqual([...SABOTAGE_PLAN]);
    alignAll(m);
    m.completeRound();
    expect(m.finished).toBe(true);
    expect(m.planSabotage()).toEqual([]);
  });

  it('refuses to complete a round while something is off, and planning changes nothing', () => {
    const m = new FidgetModel();
    expect(() => m.completeRound()).toThrow();
    alignAll(m);
    m.completeRound();
    m.planSabotage();
    expect(m.allAligned).toBe(true);
  });
});
