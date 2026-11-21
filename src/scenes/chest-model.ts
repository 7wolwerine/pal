/**
 * The treasure economy, small enough to test. Three free chests pay out
 * small, growing wins and then one that is only "almost"; the golden chest
 * waits at a goal just out of reach, and the free chests never reach it: only
 * the code from the card opens the lock. The golden chest then
 * offers a choice, gold or experience, and either one costs one more answer
 * about the player before it really pays: the reward for doing what the game
 * wanted.
 */

/** What the three free chests hold, in order: a win, a bigger win, a near miss. */
export const REWARDS: readonly number[] = [50, 120, 5];
/** Points the golden chest's lock asks for. */
export const GOLD_GOAL = 300;
/** The heap of gold in the golden chest, in points. */
export const GOLD_PRIZE = 1000;
/** The experience in the golden chest. It counts towards the score as well. */
export const XP_PRIZE = 1000;
/** Experience needed for one level. */
export const XP_PER_LEVEL = 250;

/** What opened the golden chest. The code from the card is the only key. */
export type GoldKey = 'card';
/** What the player takes from the golden chest. */
export type Pick = 'gold' | 'xp';

export class ChestModel {
  #points = 0;
  #xp = 0;
  #opened = 0;
  #unlockedBy: GoldKey | null = null;
  #goldOpened = false;
  #picked: Pick | null = null;
  #paid = false;

  get points(): number {
    return this.#points;
  }

  get xp(): number {
    return this.#xp;
  }

  /** The player's level: 1 to start with, one more for every XP_PER_LEVEL. */
  get level(): number {
    return 1 + Math.floor(this.#xp / XP_PER_LEVEL);
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

  get picked(): Pick | null {
    return this.#picked;
  }

  get paid(): boolean {
    return this.#paid;
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
    return reward;
  }

  /** The code from the card opens the lock straight away. */
  card(): void {
    this.#unlockedBy ??= 'card';
  }

  /** Lifts the golden chest's lid; false if it is still locked. Nothing is paid yet. */
  openGold(): boolean {
    if (!this.canOpenGold) return false;
    this.#goldOpened = true;
    return true;
  }

  /** Picks gold or experience from the open golden chest; once, and only once it is open. */
  choose(pick: Pick): boolean {
    if (!this.#goldOpened || this.#picked !== null) return false;
    this.#picked = pick;
    return true;
  }

  /** Pays what was picked (after the answer it cost); returns the amount, or 0. */
  pay(): number {
    if (this.#picked === null || this.#paid) return 0;
    this.#paid = true;
    if (this.#picked === 'gold') {
      this.#points += GOLD_PRIZE;
      return GOLD_PRIZE;
    }
    this.#xp += XP_PRIZE;
    this.#points += XP_PRIZE;
    return XP_PRIZE;
  }
}
