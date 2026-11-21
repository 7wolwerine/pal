import type { WitnessEvent } from './witness.ts';

/**
 * What PAL keeps of a game: a few counts and the name the player typed. When
 * the player saves the certificate, this goes into the picture's pixels on a
 * line of its own, next to the rest of the hidden text. The reveal's decoder
 * shows it as part of what was hidden; no scene reads it back.
 */
export interface Memory {
  readonly name: string;
  /** YYYY-MM-DD of the game the picture came from. */
  readonly date: string;
  readonly deaths: number;
  readonly presses: number;
  readonly refusals: number;
  readonly tricks: number;
}

const TAG = '#PAL-MEMORY ';

export function memoryFrom(events: readonly WitnessEvent[], name: string, date: Date): Memory {
  const count = (kind: string): number => events.filter((e) => e.kind === kind).length;
  const plea = events.find((e) => e.kind === 'plea-choice')?.data?.refusals;
  return {
    name,
    date: date.toISOString().slice(0, 10),
    deaths: count('death'),
    presses: count('forbidden-press'),
    refusals: typeof plea === 'number' ? plea : 0,
    tricks: new Set(events.map((e) => e.trick).filter(Boolean)).size,
  };
}

export function memoryLine(memory: Memory): string {
  return TAG + JSON.stringify(memory);
}
