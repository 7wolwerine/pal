import { describe, expect, it } from 'vitest';
import { memoryFrom, memoryLine, readMemory, rememberLines } from '../src/core/memory.ts';
import { Witness } from '../src/core/witness.ts';

describe('PAL memory across a reset', () => {
  const witness = new Witness(() => 0);
  witness.record({ scene: 'rescue', kind: 'death' });
  witness.record({ scene: 'rescue', kind: 'death' });
  for (let n = 1; n <= 5; n++) witness.record({ scene: 'dontclick', kind: 'forbidden-press', trick: 'reactance', data: { n } });
  witness.record({ scene: 'plea', kind: 'plea-choice', trick: 'romance-scam', data: { how: 'gave-in', refusals: 3 } });
  const memory = memoryFrom(witness.events, 'Tester', new Date('2026-11-12T10:00:00Z'));

  it('counts what the player did', () => {
    expect(memory).toEqual({ name: 'Tester', date: '2026-11-12', deaths: 2, presses: 5, refusals: 3, tricks: 2 });
  });

  it('survives a round trip through the hidden text', () => {
    const text = ['PAL si pamatuje:', '  jméno: Tester', memoryLine(memory), 'console.log("x")'].join('\n');
    expect(readMemory(text)).toEqual(memory);
  });

  it('ignores pictures without a memory, or with a broken one', () => {
    expect(readMemory('jen obyčejný text')).toBeNull();
    expect(readMemory('#PAL-MEMORY {nope')).toBeNull();
    expect(readMemory('#PAL-MEMORY {"name":"x","date":"2026-01-01","deaths":-1,"presses":0,"refusals":0,"tricks":0}')).toBeNull();
  });

  it('turns the memory into what PAL says', () => {
    const lines = rememberLines(memory);
    expect(lines[0]).toContain('Tester');
    expect(lines.join(' ')).toMatch(/2× utopit/);
    expect(lines.join(' ')).toMatch(/5×/);
    expect(lines.at(-1)).toMatch(/nezapomínám/);
  });
});
