import type { Witness, WitnessEvent } from './witness.ts';

/**
 * PAL's own polite phrase. It opens some of the requests that matter, never
 * all of them, so it only becomes a pattern in hindsight: the reveal counts
 * how often PAL said it and how often the player then did as asked.
 */
export const KINDLY = 'Byl bys tak hodný';

/**
 * The same trick worded its own way, for PAL's very first request. A plain "please" is not yet a
 * pattern, so nothing stands out until the phrase above starts repeating; the reveal counts both.
 */
export const KINDLY_PLEASE = 'prosím';

/** PAL has just asked with the phrase. */
export function kindlyAsked(witness: Witness, scene: string): void {
  witness.record({ scene, kind: 'kindly-asked' });
}

/**
 * The player did what PAL asked with the phrase. Counted once per request:
 * only when the scene asked with the phrase and has not been obeyed since.
 */
export function kindlyObeyed(witness: Witness, scene: string): void {
  let open = 0;
  for (const e of witness.events) {
    if (e.scene !== scene) continue;
    if (e.kind === 'kindly-asked') open++;
    else if (e.kind === 'kindly-obeyed') open = Math.max(0, open - 1);
  }
  if (open > 0) witness.record({ scene, kind: 'kindly-obeyed' });
}

/** How many times PAL said the phrase, and how many times the player obeyed. */
export function kindlyCount(events: readonly WitnessEvent[]): { asked: number; obeyed: number } {
  let asked = 0;
  let obeyed = 0;
  for (const e of events) {
    if (e.kind === 'kindly-asked') asked++;
    else if (e.kind === 'kindly-obeyed') obeyed++;
  }
  return { asked, obeyed: Math.min(asked, obeyed) };
}
