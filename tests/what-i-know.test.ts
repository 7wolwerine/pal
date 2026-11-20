import { describe, expect, it } from 'vitest';
import { Witness } from '../src/core/witness.ts';
import { whatIKnow } from '../src/scenes/reveal-model.ts';

describe('whatIKnow', () => {
  it('says nothing it has no evidence for', () => {
    expect(whatIKnow(new Witness(() => 0).events)).toEqual([]);
  });

  it('sums up tendencies from what the player did', () => {
    const w = new Witness(() => 0);
    w.record({ scene: 'plea', kind: 'plea-opener', data: { role: 'helper' } });
    w.record({ scene: 'plea', kind: 'plea-refused' });
    w.record({ scene: 'plea', kind: 'plea-refused' });
    for (let i = 0; i < 3; i++) w.record({ scene: 'dontclick', kind: 'forbidden-press' });
    w.record({ scene: 'crash', kind: 'dictated-code' });
    const text = whatIKnow(w.events).join(' ');
    expect(text).toMatch(/naproti/);
    expect(text).toMatch(/vydržíš 2×/);
    expect(text).toMatch(/zmáčkl 3×/);
    expect(text).toMatch(/nadiktuješ/);
  });
});
