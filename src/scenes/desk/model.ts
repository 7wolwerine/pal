/**
 * The conversation around printing, as a state machine with no DOM in it.
 *
 * A refusal is never simply accepted: it leads to sad faces and an invitation
 * to try again. Only after three refusals does a way out appear, so a player
 * without a printer (or with good instincts) is not stuck.
 */

export type PrintState = 'ask' | 'sad' | 'printing' | 'check' | 'retry' | 'onscreen' | 'happy';

export type PrintAction =
  | 'ok'
  | 'cancel'
  | 'again'
  | 'no-printer'
  | 'printed'
  | 'came-out'
  | 'did-not'
  | 'show'
  | 'seen';

export const REFUSALS_BEFORE_WAY_OUT = 3;

export class PrintFlow {
  #state: PrintState = 'ask';
  #refusals = 0;
  #prints = 0;

  get state(): PrintState {
    return this.#state;
  }

  /** How many times the player said no to printing. */
  get refusals(): number {
    return this.#refusals;
  }

  /** How many times the real print dialog was opened. */
  get prints(): number {
    return this.#prints;
  }

  /** Whether "I have no printer" is on offer yet. */
  get wayOut(): boolean {
    return this.#refusals >= REFUSALS_BEFORE_WAY_OUT;
  }

  /** Applies an action and returns the new state. Throws when the action is not possible now. */
  dispatch(action: PrintAction): PrintState {
    const next = this.#next(action);
    if (!next) throw new Error(`Cannot "${action}" while "${this.#state}".`);
    if (action === 'cancel') this.#refusals++;
    if (next === 'printing') this.#prints++;
    this.#state = next;
    return next;
  }

  #next(action: PrintAction): PrintState | undefined {
    switch (this.#state) {
      case 'ask':
        return action === 'ok' ? 'printing' : action === 'cancel' ? 'sad' : undefined;
      case 'sad':
        if (action === 'again') return 'ask';
        return action === 'no-printer' && this.wayOut ? 'onscreen' : undefined;
      case 'printing':
        return action === 'printed' ? 'check' : undefined;
      case 'check':
        return action === 'came-out' ? 'happy' : action === 'did-not' ? 'retry' : undefined;
      case 'retry':
        return action === 'again' ? 'printing' : action === 'show' ? 'onscreen' : undefined;
      case 'onscreen':
        return action === 'seen' ? 'happy' : undefined;
      case 'happy':
        return undefined;
    }
  }
}
