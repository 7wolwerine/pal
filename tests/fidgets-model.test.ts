import { describe, expect, it } from 'vitest';
import { FidgetModel, SABOTAGE_PLAN, SLIDER_TARGET, isAligned } from '../src/scenes/fidgets/model.ts';

/** Deterministic stand-in for Math.random. */
function sequenceOf(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
}

function alignAll(model: FidgetModel): void {
  for (const control of model.controls) {
    model.set(control.id, control.kind === 'slider' ? SLIDER_TARGET : control.kind === 'toggle' ? 1 : 0);
  }
}

describe('isAligned', () => {
  it('accepts a slider near the mark, a switch that is on and a dial pointing up', () => {
    expect(isAligned({ id: 's', kind: 'slider', value: 54 })).toBe(true);
    expect(isAligned({ id: 's', kind: 'slider', value: 55 })).toBe(false);
    expect(isAligned({ id: 't', kind: 'toggle', value: 1 })).toBe(true);
    expect(isAligned({ id: 't', kind: 'toggle', value: 0 })).toBe(false);
    expect(isAligned({ id: 'd', kind: 'dial', value: 0 })).toBe(true);
    expect(isAligned({ id: 'd', kind: 'dial', value: 7 })).toBe(false);
  });
});

describe('FidgetModel', () => {
  it('starts as an almost finished mess: one control right, the rest off', () => {
    const model = new FidgetModel();
    expect(model.allAligned).toBe(false);
    expect(model.controls.filter(isAligned)).toHaveLength(1);
  });

  it('refuses to complete a round while something is misaligned', () => {
    expect(() => new FidgetModel().completeRound()).toThrow();
  });

  it('lets BUG knock out 3, 2 and 1 controls, then gives up', () => {
    const model = new FidgetModel();
    const sizes: number[] = [];
    for (let round = 1; round <= SABOTAGE_PLAN.length; round++) {
      alignAll(model);
      expect(model.completeRound()).toBe(round);
      expect(model.finished).toBe(false);
      const hits = model.planSabotage();
      sizes.push(hits.length);
      for (const hit of hits) model.set(hit.id, hit.value);
      expect(model.allAligned).toBe(false);
    }
    expect(sizes).toEqual([...SABOTAGE_PLAN]);

    alignAll(model);
    model.completeRound();
    expect(model.finished).toBe(true);
    expect(model.planSabotage()).toEqual([]);
  });

  it('plans distinct controls and only values that are really misaligned', () => {
    for (const random of [sequenceOf(0), sequenceOf(0.999), sequenceOf(0.5, 0.1, 0.9, 0.3)]) {
      const model = new FidgetModel();
      alignAll(model);
      model.completeRound();
      const hits = model.planSabotage(random);
      expect(new Set(hits.map((h) => h.id)).size).toBe(hits.length);
      for (const hit of hits) {
        const kind = model.get(hit.id).kind;
        expect(isAligned({ id: hit.id, kind, value: hit.value })).toBe(false);
      }
    }
  });

  it('planning does not change anything by itself', () => {
    const model = new FidgetModel();
    alignAll(model);
    model.completeRound();
    model.planSabotage();
    expect(model.allAligned).toBe(true);
  });
});
