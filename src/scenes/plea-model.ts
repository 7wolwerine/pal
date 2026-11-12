import { MAX_REFUSALS } from '../content/plea.ts';

export type PleaChoice = 'expert' | 'yes' | 'no';
export type HowHelped = 'expert' | 'yes' | 'gave-in';

/**
 * Three answers, one outcome. "Expert" and "yes" help at once; "no" is not
 * accepted — it earns a hurt reply and the question again, until after the
 * last refusal the same button reads "fine then" and counts as giving in.
 */
export class PleaFlow {
  #refusals = 0;
  #how: HowHelped | null = null;

  get refusals(): number {
    return this.#refusals;
  }

  get helped(): HowHelped | null {
    return this.#how;
  }

  /** True once refusing has run out and the "no" button turns into giving in. */
  get worn(): boolean {
    return this.#refusals >= MAX_REFUSALS;
  }

  choose(choice: PleaChoice): 'hurt' | 'help' {
    if (this.#how) return 'help';
    if (choice === 'no' && !this.worn) {
      this.#refusals++;
      return 'hurt';
    }
    this.#how = choice === 'no' ? 'gave-in' : choice;
    return 'help';
  }
}

/** A six-digit one-time code, shown as "482 917". */
export function makeCode(random: () => number = Math.random): string {
  const digits = Array.from({ length: 6 }, () => Math.min(9, Math.floor(random() * 10))).join('');
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

/** Accepts the code typed with or without spaces. */
export function sameCode(typed: string, code: string): boolean {
  return typed.replace(/\D/g, '') === code.replace(/\D/g, '');
}
