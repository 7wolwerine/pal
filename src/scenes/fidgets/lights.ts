/**
 * The little light puzzle in the lock: a 3x3 grid where pressing a light
 * flips it and its four neighbours. All lights on opens the lock. On a 3x3
 * grid every pattern can be solved, and the start is made by pressing from
 * the solved state, so it always can be. No DOM, so it is testable.
 */

export const SIZE = 3;
const ALL = (1 << (SIZE * SIZE)) - 1;

/** Flips light `i` and its orthogonal neighbours. */
export function press(state: number, i: number): number {
  const row = Math.floor(i / SIZE);
  const col = i % SIZE;
  let mask = 1 << i;
  if (row > 0) mask |= 1 << (i - SIZE);
  if (row < SIZE - 1) mask |= 1 << (i + SIZE);
  if (col > 0) mask |= 1 << (i - 1);
  if (col < SIZE - 1) mask |= 1 << (i + 1);
  return state ^ mask;
}

export function isSolved(state: number): boolean {
  return state === ALL;
}

export function isOn(state: number, i: number): boolean {
  return Boolean(state & (1 << i));
}

/** A start a few presses away from solved, never solved already. */
export function startState(random: () => number = Math.random, presses = 3): number {
  for (;;) {
    let state = ALL;
    const used = new Set<number>();
    while (used.size < presses) used.add(Math.min(SIZE * SIZE - 1, Math.floor(random() * SIZE * SIZE)));
    for (const i of used) state = press(state, i);
    if (!isSolved(state)) return state;
  }
}
