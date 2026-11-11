/**
 * State of the fidget panel: a few controls that are slightly off and beg to
 * be straightened, and the plan for how often BUG knocks them out again.
 * No DOM in here, so the rules can be unit tested.
 */

export type ControlKind = 'slider' | 'toggle' | 'dial';

export interface Control {
  readonly id: string;
  readonly kind: ControlKind;
  value: number;
}

export const SLIDER_TARGET = 50;
export const SLIDER_TOLERANCE = 4;
export const DIAL_STEPS = 8;

/** How many controls BUG knocks out after the first, second and third tidy-up. */
export const SABOTAGE_PLAN = [3, 2, 1] as const;

export function isAligned(control: Control): boolean {
  switch (control.kind) {
    case 'slider':
      return Math.abs(control.value - SLIDER_TARGET) <= SLIDER_TOLERANCE;
    case 'toggle':
      return control.value === 1;
    case 'dial':
      return control.value === 0;
  }
}

function misalignedValue(kind: ControlKind, random: () => number): number {
  switch (kind) {
    case 'slider':
      return random() < 0.5 ? Math.round(8 + random() * 25) : Math.round(67 + random() * 25);
    case 'toggle':
      return 0;
    case 'dial':
      return 1 + Math.floor(random() * (DIAL_STEPS - 1));
  }
}

export class FidgetModel {
  readonly controls: Control[] = [
    { id: 's1', kind: 'slider', value: 18 },
    { id: 'd1', kind: 'dial', value: 3 },
    { id: 't1', kind: 'toggle', value: 0 },
    // One control starts out right. An almost finished whole pulls harder than a mess.
    { id: 't2', kind: 'toggle', value: 1 },
    { id: 'd2', kind: 'dial', value: 6 },
    { id: 's2', kind: 'slider', value: 83 },
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

  get allAligned(): boolean {
    return this.controls.every(isAligned);
  }

  /** Number of times the player has straightened everything. */
  get rounds(): number {
    return this.#rounds;
  }

  /** True once the player has out-stubborned BUG. */
  get finished(): boolean {
    return this.#rounds > SABOTAGE_PLAN.length;
  }

  /** Call when everything is aligned. Returns the number of the round just completed. */
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
      const [control] = pool.splice(Math.floor(random() * pool.length), 1);
      if (control) hits.push({ id: control.id, value: misalignedValue(control.kind, random) });
    }
    return hits;
  }
}
