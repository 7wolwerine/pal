/**
 * The treasure economy, small enough to test. Three free chests pay out
 * small, growing wins and then one that is only "almost"; the golden chest
 * waits at a goal just out of reach. The last stretch is paid with an answer
 * about the player — or with the code from the card — and the golden chest
 * then really pays: the reward for doing what the game wanted.
 */

/** What the three free chests hold, in order: a win, a bigger win, a near miss. */
export const REWARDS: readonly number[] = [50, 120, 5];
/** Points the golden chest's lock asks for. */
export const GOLD_GOAL = 300;
/** Points paid for one answer about the player. */
export const ANSWER_POINTS = 200;
/** What is really in the golden chest. */
export const TREASURE = 1000;

export type GoldKey = 'answer' | 'card';

export class ChestModel {
  #points = 0;
  #opened = 0;
  #unlockedBy: GoldKey | null = null;
  #goldOpened = false;

  get points(): number {
    return this.#points;
  }

  get opened(): number {
    return this.#opened;
  }

  /** How far towards the golden chest, 0..1. */
  get progress(): number {
    return this.#unlockedBy ? 1 : Math.min(1, this.#points / GOLD_GOAL);
  }

  /** How many points are still missing. */
  get missing(): number {
    return Math.max(0, GOLD_GOAL - this.#points);
  }

  get unlockedBy(): GoldKey | null {
    return this.#unlockedBy;
  }

  get goldOpened(): boolean {
    return this.#goldOpened;
  }

  get canOpen(): boolean {
    return this.#opened < REWARDS.length;
  }

  get canOpenGold(): boolean {
    return this.#unlockedBy !== null && !this.#goldOpened;
  }

  /** Opens the next free chest; null when there is none left. */
  open(): number | null {
    if (!this.canOpen) return null;
    const reward = REWARDS[this.#opened] ?? 0;
    this.#opened++;
    this.#points += reward;
    if (this.#points >= GOLD_GOAL) this.#unlockedBy ??= 'answer';
    return reward;
  }

  /** Points for an answer; reaching the goal unlocks the golden chest. */
  answer(points = ANSWER_POINTS): void {
    this.#points += Math.max(0, points);
    if (this.#points >= GOLD_GOAL) this.#unlockedBy ??= 'answer';
  }

  /** The code from the card opens the lock straight away. */
  card(): void {
    this.#unlockedBy ??= 'card';
  }

  /** Opens the golden chest and adds the treasure; false if it is still locked. */
  openGold(): boolean {
    if (!this.canOpenGold) return false;
    this.#goldOpened = true;
    this.#points += TREASURE;
    return true;
  }
}
