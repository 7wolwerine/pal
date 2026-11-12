/** Points the player is handed as a reward for the game so far. */
export const START_POINTS = 150;
export const CHEST_COST = 50;
export const GOLD_COST = 200;
/** Points paid for one answer about the player. */
export const ANSWER_POINTS = 200;

export type RewardKind = 'point' | 'nothing' | 'key';

/**
 * What the small chests hold, in order. It looks random to the player; it is
 * the classic variable-ratio schedule: almost nothing, almost nothing, then
 * one shiny thing that keeps you going.
 */
export const REWARDS: readonly RewardKind[] = ['point', 'nothing', 'key'];

/** The lootbox economy, small enough to test. */
export class ChestModel {
  #points = START_POINTS;
  #opened = 0;
  #hasKey = false;
  #goldOpened = false;

  get points(): number {
    return this.#points;
  }

  get opened(): number {
    return this.#opened;
  }

  get hasKey(): boolean {
    return this.#hasKey;
  }

  get goldOpened(): boolean {
    return this.#goldOpened;
  }

  get canOpen(): boolean {
    return this.#opened < REWARDS.length && this.#points >= CHEST_COST;
  }

  get canOpenGold(): boolean {
    return this.#hasKey && !this.#goldOpened && this.#points >= GOLD_COST;
  }

  /** Opens the next small chest; null when there is none or no points for it. */
  open(): RewardKind | null {
    if (!this.canOpen) return null;
    const reward = REWARDS[this.#opened] ?? 'nothing';
    this.#opened++;
    this.#points -= CHEST_COST;
    if (reward === 'point') this.#points += 1;
    if (reward === 'key') this.#hasKey = true;
    return reward;
  }

  earn(points: number): void {
    this.#points += Math.max(0, points);
  }

  openGold(): boolean {
    if (!this.canOpenGold) return false;
    this.#points -= GOLD_COST;
    this.#goldOpened = true;
    return true;
  }
}
