/**
 * The fidget panel: six physical things that are each *almost* right, the
 * way a professional's eye cannot leave them — a picture hanging crooked, a
 * screw sticking out, a drawer left open a crack, one book standing out of
 * its row, a lamp whose plug hangs out of the socket, and unread mail. Plus
 * the plan for how often BUG puts them wrong again. No DOM in here, so it is
 * testable.
 */

export type ControlKind = 'tilt' | 'screw' | 'drawer' | 'book' | 'plug' | 'mail';

export interface Control {
  readonly id: string;
  readonly kind: ControlKind;
  value: number;
}

/** Degrees either way the picture can hang. */
export const TILT_MAX = 14;
/** A picture this close to level clicks into place. */
export const TILT_SNAP = 1;
export const SCREW_TURNS = 5;
export const DRAWER_MAX = 10;
export const BOOK_MAX = 4;
export const MAIL_MAX = 5;

/** How many controls BUG knocks out after the first, second and third tidy-up. */
export const SABOTAGE_PLAN = [3, 2, 1] as const;

/** The value at which a control of each kind is "done". */
export function alignedValue(kind: ControlKind): number {
  return kind === 'plug' ? 1 : 0;
}

export function isAligned(control: Control): boolean {
  return control.value === alignedValue(control.kind);
}

/** What one click (or tap) does to a control. Dragging sets values directly. */
export function poke(kind: ControlKind, value: number): number {
  switch (kind) {
    case 'tilt': {
      // A nudge towards level, two degrees at a time, and a snap at the end.
      const next = value - Math.sign(value) * Math.min(2, Math.abs(value));
      return Math.abs(next) <= TILT_SNAP ? 0 : next;
    }
    case 'screw':
    case 'book':
    case 'mail':
      return Math.max(0, value - 1);
    case 'drawer':
      return 0;
    case 'plug':
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
      return Math.max(0, Math.min(SCREW_TURNS, Math.round(value)));
    case 'drawer': {
      const v = Math.max(0, Math.min(DRAWER_MAX, Math.round(value)));
      return v <= 1 ? 0 : v;
    }
    case 'book':
      return Math.max(0, Math.min(BOOK_MAX, Math.round(value)));
    case 'mail':
      return Math.max(0, Math.min(MAIL_MAX, Math.round(value)));
    case 'plug':
      return value >= 0.5 ? 1 : 0;
  }
}

function misalignedValue(kind: ControlKind, random: () => number): number {
  const pick = (from: number, to: number): number => from + Math.min(to - from, Math.floor(random() * (to - from + 1)));
  switch (kind) {
    case 'tilt':
      return (random() < 0.5 ? -1 : 1) * pick(5, 11);
    case 'screw':
      return pick(3, SCREW_TURNS);
    case 'drawer':
      return pick(6, DRAWER_MAX);
    case 'book':
      return pick(2, BOOK_MAX);
    case 'mail':
      return pick(1, 4);
    case 'plug':
      return 0;
  }
}

export class FidgetModel {
  // Every one of them is nearly done. Nearly is what itches.
  readonly controls: Control[] = [
    { id: 'tilt', kind: 'tilt', value: 7 },
    { id: 'screw', kind: 'screw', value: 4 },
    { id: 'drawer', kind: 'drawer', value: 7 },
    { id: 'book', kind: 'book', value: 3 },
    { id: 'plug', kind: 'plug', value: 0 },
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
  poke(id: string): boolean {
    const c = this.get(id);
    const was = isAligned(c);
    c.value = poke(c.kind, c.value);
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
