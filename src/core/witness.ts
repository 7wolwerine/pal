/**
 * The Witness is the heart of the game: an append-only record of what the
 * player did. Scenes never decide what the ending says. They only testify
 * here, and the final reveal is generated from this record.
 *
 * It lives in memory only. Nothing in this module can send or store anything.
 */

export type Fact = string | number | boolean;

export interface WitnessEvent {
  /** Position in the record, starting at 0. */
  readonly seq: number;
  /** Milliseconds since the session started. */
  readonly t: number;
  /** Scene that recorded the event. */
  readonly scene: string;
  /** What happened, e.g. `disclose`, `step`, `window-button`. */
  readonly kind: string;
  /** Id of the social-engineering trick this event is evidence of. */
  readonly trick?: string;
  readonly data?: Readonly<Record<string, Fact>>;
}

export type NewEvent = Omit<WitnessEvent, 'seq' | 't'>;

export class Witness {
  readonly #events: WitnessEvent[] = [];
  readonly #tallies = new Map<string, number>();
  readonly #clock: () => number;
  readonly #startedAt: number;

  constructor(clock: () => number = () => performance.now()) {
    this.#clock = clock;
    this.#startedAt = clock();
  }

  /** Appends one event. Recorded events are frozen and can never be changed. */
  record(event: NewEvent): WitnessEvent {
    const stored: WitnessEvent = Object.freeze({
      ...event,
      data: event.data ? Object.freeze({ ...event.data }) : undefined,
      seq: this.#events.length,
      t: Math.round(this.#clock() - this.#startedAt),
    });
    this.#events.push(stored);
    return stored;
  }

  /** Something the player handed over voluntarily (a name, a choice, an address). */
  disclose(scene: string, trick: string, field: string, value: string, extra: Record<string, Fact> = {}): WitnessEvent {
    return this.record({ scene, kind: 'disclose', trick, data: { ...extra, field, value } });
  }

  /** Counts high-volume things (clicks, key presses) without storing each one. */
  tally(name: string, by = 1): number {
    const total = (this.#tallies.get(name) ?? 0) + by;
    this.#tallies.set(name, total);
    return total;
  }

  count(name: string): number {
    return this.#tallies.get(name) ?? 0;
  }

  get events(): readonly WitnessEvent[] {
    return this.#events.slice();
  }

  /** Milliseconds since the session started. */
  get elapsed(): number {
    return Math.round(this.#clock() - this.#startedAt);
  }

  /** Everything disclosed so far, latest value per field, in order of first disclosure. */
  disclosed(): Map<string, string> {
    const out = new Map<string, string>();
    for (const e of this.#events) {
      if (e.kind !== 'disclose' || !e.data) continue;
      const { field, value } = e.data;
      if (typeof field === 'string' && typeof value === 'string') out.set(field, value);
    }
    return out;
  }

  /** Ids of the tricks the player fell for, in the order they first worked. */
  tricksUsed(): string[] {
    const seen = new Set<string>();
    for (const e of this.#events) if (e.trick) seen.add(e.trick);
    return [...seen];
  }

  evidenceFor(trick: string): WitnessEvent[] {
    return this.#events.filter((e) => e.trick === trick);
  }
}
