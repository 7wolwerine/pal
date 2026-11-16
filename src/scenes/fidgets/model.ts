/**
 * The fidget panel: six physical things that are each *almost* right, the
 * way a professional's eye cannot leave them — a picture hanging crooked,
 * four screws standing proud of a plate, a little lamp that is off, a shelf
 * of books that have fallen over, a wall calendar still showing yesterday,
 * and unread mail. Plus the plan for how often BUG puts them wrong again.
 * No DOM in here, so it is testable.
 */

export type ControlKind = 'tilt' | 'screw' | 'chain' | 'book' | 'calendar' | 'mail';

export interface Control {
  readonly id: string;
  readonly kind: ControlKind;
  value: number;
}

/** Degrees either way the picture can hang. */
export const TILT_MAX = 14;
/** One nudge turns the picture this many degrees towards level: big, decided moves. */
export const TILT_STEP = 6;
/** A picture this close to level drops into place. */
export const TILT_SNAP = 2;
/** Screws on the plate. A screw's value is a bit mask: bit i set = screw i stands out. */
export const SCREWS = 4;
const SCREW_ALL = (1 << SCREWS) - 1;
/** Books on the shelf. The value is how many of them lie fallen. */
export const BOOKS = 5;
export const MAIL_MAX = 5;

/** How many controls BUG knocks out after the first, second and third tidy-up. */
export const SABOTAGE_PLAN = [3, 2, 1] as const;

/** The value at which a control of each kind is "done". */
export function alignedValue(kind: ControlKind): number {
  return kind === 'calendar' || kind === 'chain' ? 1 : 0;
}

export function isAligned(control: Control): boolean {
  return control.value === alignedValue(control.kind);
}

/** True when screw `i` still stands out of the plate. */
export function screwOut(value: number, i: number): boolean {
  return Boolean(value & (1 << i));
}

/** How many screws still stand out. */
export function screwsOut(value: number): number {
  let n = 0;
  for (let i = 0; i < SCREWS; i++) if (screwOut(value, i)) n++;
  return n;
}

/**
 * What one click (or tap) does to a control. `part` picks which screw a click
 * meant; without it the first loose one is turned in. Dragging sets values directly.
 */
export function poke(kind: ControlKind, value: number, part?: number): number {
  switch (kind) {
    case 'tilt': {
      // A firm nudge towards level, and it drops into place at the end.
      const next = value - Math.sign(value) * Math.min(TILT_STEP, Math.abs(value));
      return Math.abs(next) <= TILT_SNAP ? 0 : next;
    }
    case 'screw': {
      if (part !== undefined && screwOut(value, part)) return value & ~(1 << part);
      return value & (value - 1); // clears the lowest loose screw
    }
    case 'book':
    case 'mail':
      return Math.max(0, value - 1);
    case 'chain':
      // A pull chain: every pull switches the lamp the other way.
      return value === 1 ? 0 : 1;
    case 'calendar':
      return 1;
  }
}

/** Clamps a dragged value into the control's range, snapping when it is close enough. */
export function settle(kind: ControlKind, value: number): number {
  switch (kind) {
    case 'tilt': {
      const v = Math.max(-TILT_MAX, Math.min(TILT_MAX, Math.round(value)));
      return Math.abs(v) <= TILT_SNAP ? 0 : v;
    }
    case 'screw':
      return Math.max(0, Math.min(SCREW_ALL, Math.round(value)));
    case 'book':
      return Math.max(0, Math.min(BOOKS, Math.round(value)));
    case 'mail':
      return Math.max(0, Math.min(MAIL_MAX, Math.round(value)));
    case 'chain':
    case 'calendar':
      return value >= 0.5 ? 1 : 0;
  }
}

/** Every way of having two or more screws loose. */
const LOOSE_MASKS = Array.from({ length: SCREW_ALL + 1 }, (_, m) => m).filter((m) => screwsOut(m) >= 2);

function misalignedValue(kind: ControlKind, random: () => number): number {
  const pick = (from: number, to: number): number => from + Math.min(to - from, Math.floor(random() * (to - from + 1)));
  switch (kind) {
    case 'tilt':
      return (random() < 0.5 ? -1 : 1) * pick(7, 12);
    case 'screw': {
      // Two or more screws worked loose.
      const masks = LOOSE_MASKS;
      return masks[pick(0, masks.length - 1)] ?? SCREW_ALL;
    }
    case 'book':
      return pick(2, BOOKS - 1);
    case 'mail':
      return pick(1, 4);
    case 'chain':
    case 'calendar':
      return 0;
  }
}

export class FidgetModel {
  // Every one of them is nearly done. Nearly is what itches.
  readonly controls: Control[] = [
    { id: 'tilt', kind: 'tilt', value: 11 },
    { id: 'screw', kind: 'screw', value: SCREW_ALL },
    { id: 'chain', kind: 'chain', value: 0 },
    { id: 'book', kind: 'book', value: BOOKS },
    { id: 'calendar', kind: 'calendar', value: 0 },
    { id: 'mail', kind: 'mail', value: 3 },
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

  /** Applies one click; returns true if that click finished this control. */
  poke(id: string, part?: number): boolean {
    const c = this.get(id);
    const was = isAligned(c);
    c.value = poke(c.kind, c.value, part);
    return !was && isAligned(c);
  }

  /** Applies a drag; returns true if it finished this control. */
  drag(id: string, value: number): boolean {
    const c = this.get(id);
    const was = isAligned(c);
    c.value = settle(c.kind, value);
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

  /** A value that puts one control wrong; for BUG's last stand. */
  static spoil(kind: ControlKind, random: () => number = Math.random): number {
    return misalignedValue(kind, random);
  }
}
