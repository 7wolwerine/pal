/**
 * The fidget panel: six things that are each *almost* right, the way a
 * professional's eye cannot leave them — a progress bar stuck at 99 %, unread
 * notifications, one unticked box in a checklist, a picture hanging crooked,
 * one dark LED in a row, a cable hanging out of its port. Plus the plan for
 * how often BUG knocks them out again. No DOM in here, so it is testable.
 */

export type ControlKind = 'progress' | 'badge' | 'checks' | 'tilt' | 'leds' | 'plug';

export interface Control {
  readonly id: string;
  readonly kind: ControlKind;
  value: number;
}

export const CHECK_COUNT = 4;
export const LED_COUNT = 6;
export const TILT_MAX = 3;
const ALL_CHECKS = (1 << CHECK_COUNT) - 1;
const ALL_LEDS = (1 << LED_COUNT) - 1;

/** How many controls BUG knocks out after the first, second and third tidy-up. */
export const SABOTAGE_PLAN = [3, 2, 1] as const;

/** The value at which a control of each kind is "done". */
export function alignedValue(kind: ControlKind): number {
  switch (kind) {
    case 'progress':
      return 100;
    case 'badge':
      return 0;
    case 'checks':
      return ALL_CHECKS;
    case 'tilt':
      return 0;
    case 'leds':
      return ALL_LEDS;
    case 'plug':
      return 1;
  }
}

export function isAligned(control: Control): boolean {
  return control.value === alignedValue(control.kind);
}

/** What one click does to a control. `part` picks the checkbox or LED clicked. */
export function poke(kind: ControlKind, value: number, part = 0): number {
  switch (kind) {
    case 'progress':
      return 100;
    case 'badge':
      return Math.max(0, value - 1);
    case 'checks':
      return value | (1 << part);
    case 'tilt':
      return value - Math.sign(value);
    case 'leds':
      return value | (1 << part);
    case 'plug':
      return 1;
  }
}

function misalignedValue(kind: ControlKind, random: () => number): number {
  const pick = (n: number): number => Math.min(n - 1, Math.floor(random() * n));
  switch (kind) {
    case 'progress':
      return 97 + pick(3);
    case 'badge':
      return 1 + pick(4);
    case 'checks':
      return ALL_CHECKS & ~(1 << pick(CHECK_COUNT));
    case 'tilt': {
      const steps = 1 + pick(TILT_MAX);
      return random() < 0.5 ? -steps : steps;
    }
    case 'leds':
      return ALL_LEDS & ~(1 << pick(LED_COUNT));
    case 'plug':
      return 0;
  }
}

export class FidgetModel {
  // Every one of them is nearly done. Nearly is what itches.
  readonly controls: Control[] = [
    { id: 'progress', kind: 'progress', value: 99 },
    { id: 'badge', kind: 'badge', value: 3 },
    { id: 'checks', kind: 'checks', value: ALL_CHECKS & ~(1 << 2) },
    { id: 'tilt', kind: 'tilt', value: 2 },
    { id: 'leds', kind: 'leds', value: ALL_LEDS & ~(1 << 3) },
    { id: 'plug', kind: 'plug', value: 0 },
  ];
  #rounds = 0;

  get(id: string): Control {
    const control = this.controls.find((c) => c.id === id);
    if (!control) throw new Error(`Unknown control "${id}".`);
    return control;
  }

  set(id: string, value: number): void {
    this.get(id).value = value;
  }

  /** Applies one player click; returns true if that click finished this control. */
  poke(id: string, part = 0): boolean {
    const c = this.get(id);
    const was = isAligned(c);
    c.value = poke(c.kind, c.value, part);
    return !was && isAligned(c);
  }

  get allAligned(): boolean {
    return this.controls.every(isAligned);
  }

  get rounds(): number {
    return this.#rounds;
  }

  /** True once the player has out-stubborned BUG. */
  get finished(): boolean {
    return this.#rounds > SABOTAGE_PLAN.length;
  }

  completeRound(): number {
    if (!this.allAligned) throw new Error('Cannot complete a round while something is misaligned.');
    return ++this.#rounds;
  }

  /** Which controls BUG knocks out next and to what value. Does not apply them. */
  planSabotage(random: () => number = Math.random): { id: string; value: number }[] {
    const count = SABOTAGE_PLAN[this.#rounds - 1] ?? 0;
    const pool = [...this.controls];
    const hits: { id: string; value: number }[] = [];
    while (hits.length < count && pool.length > 0) {
      const [control] = pool.splice(Math.min(pool.length - 1, Math.floor(random() * pool.length)), 1);
      if (control) hits.push({ id: control.id, value: misalignedValue(control.kind, random) });
    }
    return hits;
  }
}
