import { describe, expect, it } from 'vitest';
import { memoryFrom, memoryLine } from '../src/core/memory.ts';
import { Witness } from '../src/core/witness.ts';

describe('PAL memory in the saved picture', () => {
  const witness = new Witness(() => 0);
  witness.record({ scene: 'rescue', kind: 'death' });
  witness.record({ scene: 'rescue', kind: 'death' });
  for (let n = 1; n <= 5; n++) witness.record({ scene: 'dontclick', kind: 'forbidden-press', trick: 'reactance', data: { n } });
  witness.record({ scene: 'plea', kind: 'plea-choice', trick: 'romance-scam', data: { how: 'gave-in', refusals: 3 } });
  const memory = memoryFrom(witness.events, 'Tester', new Date('2026-11-12T10:00:00Z'));

  it('counts what the player did', () => {
    expect(memory).toEqual({ name: 'Tester', date: '2026-11-12', deaths: 2, presses: 5, refusals: 3, tricks: 2 });
  });

  it('writes the memory as one tagged line of JSON', () => {
    const line = memoryLine(memory);
    expect(line.startsWith('#PAL-MEMORY ')).toBe(true);
    expect(line).not.toContain('\n');
    expect(JSON.parse(line.slice('#PAL-MEMORY '.length))).toEqual(memory);
  });
});
