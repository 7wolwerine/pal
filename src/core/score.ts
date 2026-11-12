/**
 * A believable score for the prize screen: the points actually collected,
 * plus a bonus for every trick the player went along with, and how they
 * compare with "other players" — more tricks, higher rank, never above 97 %.
 */
export const POINTS_PER_TRICK = 75;
export const RANK_FLOOR = 48;
export const RANK_CEILING = 97;

export function scoreOf(points: number, tricksUsed: number): number {
  return Math.max(0, Math.round(points)) + Math.max(0, tricksUsed) * POINTS_PER_TRICK;
}

/** Percent of "players" beaten: grows with the share of tricks that worked. */
export function rankOf(tricksUsed: number, tricksTotal: number): number {
  if (tricksTotal <= 0) return RANK_FLOOR;
  const share = Math.min(1, Math.max(0, tricksUsed / tricksTotal));
  return Math.round(RANK_FLOOR + (RANK_CEILING - RANK_FLOOR) * share);
}
