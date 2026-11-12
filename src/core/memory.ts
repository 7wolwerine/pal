import type { WitnessEvent } from './witness.ts';

/**
 * PAL's memory across a reset. There is no storage in the game; what PAL
 * remembers travels inside the saved picture's pixels, on a line of its own.
 * Hand the picture back in a new game and PAL "remembers you". Only counts
 * and the name the player typed; nothing else, and nothing leaves the page.
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

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 100000;

/** Finds PAL's memory in text read from a picture; null if there is none or it is damaged. */
export function readMemory(text: string): Memory | null {
  const line = text.split('\n').find((l) => l.startsWith(TAG));
  if (!line) return null;
  try {
    const m: unknown = JSON.parse(line.slice(TAG.length));
    if (typeof m !== 'object' || m === null) return null;
    const r = m as Record<string, unknown>;
    if (typeof r.name !== 'string' || typeof r.date !== 'string') return null;
    if (![r.deaths, r.presses, r.refusals, r.tricks].every(isCount)) return null;
    return {
      name: r.name.slice(0, 40),
      date: r.date.slice(0, 10),
      deaths: r.deaths as number,
      presses: r.presses as number,
      refusals: r.refusals as number,
      tricks: r.tricks as number,
    };
  } catch {
    return null;
  }
}

/** What PAL says when it recognises the player. */
export function rememberLines(m: Memory): string[] {
  const lines = [`Počkej… ${m.name || 'ty'}? Já tě znám.`];
  if (m.deaths > 0) lines.push(`Minule jsi mě nechal ${m.deaths}× utopit.`);
  if (m.presses > 0) lines.push(`Na „Neklikej na mě“ jsi klikl ${m.presses}×.`);
  if (m.refusals > 0) lines.push(`Odmítl jsi mi pomoct ${m.refusals}×. A pak jsi stejně pomohl.`);
  if (m.tricks > 0) lines.push(`Naletěl jsi mi na ${m.tricks} triků.`);
  lines.push('Myslel sis, že když to zavřeš, zapomenu? Já nezapomínám.');
  return lines;
}
