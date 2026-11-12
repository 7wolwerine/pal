/**
 * The broken little house the player restores. Each broken thing needs a few
 * clicks; "warmth" is how far along the whole repair is, from 0 (a freezing,
 * broken night) to 1 (a warm, sunny, mended home). No DOM, so it is testable.
 */

export interface Repair {
  readonly id: string;
  /** Clicks needed to fix it completely. */
  readonly needed: number;
  done: number;
}

export class RestoreModel {
  readonly repairs: Repair[];

  constructor(repairs: readonly { id: string; needed: number }[]) {
    if (repairs.length === 0) throw new Error('Nothing to repair.');
    this.repairs = repairs.map((r) => ({ id: r.id, needed: Math.max(1, r.needed), done: 0 }));
  }

  get(id: string): Repair {
    const repair = this.repairs.find((r) => r.id === id);
    if (!repair) throw new Error(`Unknown repair "${id}".`);
    return repair;
  }

  isFixed(id: string): boolean {
    const r = this.get(id);
    return r.done >= r.needed;
  }

  /** One click of work on a repair. Returns true if this click finished it. */
  work(id: string): boolean {
    const r = this.get(id);
    if (r.done >= r.needed) return false;
    r.done++;
    return r.done >= r.needed;
  }

  /** 0..1, counting partial progress, so every click warms the world a little. */
  get warmth(): number {
    let done = 0;
    let needed = 0;
    for (const r of this.repairs) {
      done += Math.min(r.done, r.needed);
      needed += r.needed;
    }
    return done / needed;
  }

  get finished(): boolean {
    return this.repairs.every((r) => r.done >= r.needed);
  }

  get fixedCount(): number {
    return this.repairs.filter((r) => r.done >= r.needed).length;
  }
}

/** Mixes two #rrggbb colours; t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const k = Math.min(1, Math.max(0, t));
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + ((pb[i] ?? v) - v) * k).toString(16).padStart(2, '0')).join('')}`;
}
