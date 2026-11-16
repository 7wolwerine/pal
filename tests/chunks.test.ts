import { describe, expect, it } from 'vitest';
import { chunks } from '../src/ui/chunks.ts';

describe('chunks', () => {
  it('leaves a short line alone', () => {
    expect(chunks('Ahoj! <3', 70)).toEqual(['Ahoj! <3']);
  });

  it('splits a long line at sentence ends, keeping short sentences together', () => {
    const text =
      'Uf, konečně jsem venku. Díky moc, jsi můj zachránce! Máš to prostě v sobě. Fakt nevím, co bych bez tebe dělal… Tak co, zůstaneš?';
    const parts = chunks(text, 60);
    expect(parts.join(' ')).toBe(text);
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(60);
    expect(parts.length).toBeGreaterThan(1);
  });

  it('never cuts inside a sentence', () => {
    const long = 'Tohle je jedna strašně dlouhá věta bez jediné tečky uprostřed a pořád pokračuje dál a dál';
    expect(chunks(`${long}. Krátká.`, 40)).toEqual([`${long}.`, 'Krátká.']);
  });

  it('keeps a smiley with its sentence', () => {
    expect(chunks('Jsi můj hrdina. <3 A teď pojď dál, čeká nás toho ještě hodně.', 30)).toEqual([
      'Jsi můj hrdina. <3',
      'A teď pojď dál, čeká nás toho ještě hodně.',
    ]);
  });
});
