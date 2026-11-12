import { DONTCLICK } from '../content/dontclick.ts';

/** How many times BUG hangs the button back before it gives up. */
export const REHANGS = DONTCLICK.bugRehang.length;

/** What a press does: BUG hangs the button back up, or the safeguard breaks. */
export type PressResult = 'rehang' | 'break';

/** Counts the presses on the "do not click me" button. Pure, so it can be tested. */
export class DontClickModel {
  #presses = 0;

  get presses(): number {
    return this.#presses;
  }

  get broken(): boolean {
    return this.#presses > REHANGS;
  }

  /** What the button says right now. */
  get label(): string {
    if (this.broken) return DONTCLICK.broken;
    return DONTCLICK.labels[Math.min(this.#presses, DONTCLICK.labels.length - 1)] ?? '';
  }

  press(): PressResult {
    if (this.broken) return 'break';
    this.#presses++;
    return this.broken ? 'break' : 'rehang';
  }
}
