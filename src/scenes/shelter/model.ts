import type { ShelterPath, TaskId } from '../../content/shelter.ts';

/**
 * The shelter's bookkeeping: which place was chosen, which jobs are left,
 * how much real work each still needs, and how often the silly way was
 * tried. In the cave the jobs come in order (no fire without a hearth and
 * wood); in the hut any order will do. No DOM, so it is testable.
 */
export interface Job {
  readonly id: TaskId;
  readonly knocks: number;
  /** True once the right way was picked; then every click is work. */
  started: boolean;
  done: number;
}

export class ShelterModel {
  readonly path: ShelterPath;
  readonly jobs: Job[];
  readonly ordered: boolean;
  sillyTries = 0;

  constructor(path: ShelterPath, plan: readonly { id: TaskId; knocks: number }[]) {
    this.path = path;
    this.ordered = path === 'cave';
    this.jobs = plan.map((j) => ({ id: j.id, knocks: Math.max(1, j.knocks), started: false, done: 0 }));
  }

  get(id: TaskId): Job {
    const job = this.jobs.find((j) => j.id === id);
    if (!job) throw new Error(`No job "${id}" here.`);
    return job;
  }

  isDone(id: TaskId): boolean {
    const j = this.get(id);
    return j.done >= j.knocks;
  }

  /** Whether a job can be worked on now (in the cave, only the next one). */
  available(id: TaskId): boolean {
    if (this.isDone(id)) return false;
    if (!this.ordered) return true;
    return this.jobs.find((j) => j.done < j.knocks)?.id === id;
  }

  start(id: TaskId): void {
    if (!this.available(id)) throw new Error(`"${id}" cannot be started now.`);
    this.get(id).started = true;
  }

  silly(id: TaskId): void {
    if (!this.available(id)) throw new Error(`"${id}" cannot be tried now.`);
    this.sillyTries++;
  }

  /** One click of work; returns true if it finished the job. */
  work(id: TaskId): boolean {
    const j = this.get(id);
    if (!j.started || j.done >= j.knocks) return false;
    j.done++;
    return j.done >= j.knocks;
  }

  /** 0..1, counting partial work, so every knock warms the night a little. */
  get warmth(): number {
    let done = 0;
    let needed = 0;
    for (const j of this.jobs) {
      done += Math.min(j.done, j.knocks);
      needed += j.knocks;
    }
    return needed ? done / needed : 0;
  }

  get finished(): boolean {
    return this.jobs.every((j) => j.done >= j.knocks);
  }
}

/** Mixes two #rrggbb colours; t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const k = Math.min(1, Math.max(0, t));
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + ((pb[i] ?? v) - v) * k).toString(16).padStart(2, '0')).join('')}`;
}
