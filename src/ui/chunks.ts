/**
 * Splits a long line into bubble-sized pieces at sentence ends, so a long
 * speech comes as a few short bubbles instead of one that stretches the
 * window. Short sentences are kept together up to `max` characters; a single
 * sentence longer than that stays whole (it is never cut mid-sentence).
 */
export function chunks(text: string, max: number): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= max) return [trimmed];
  // Sentence ends: . ! ? … (also several, and closing quotes or a smiley) followed by a space.
  const sentences = trimmed.match(/[^.!?…]+(?:[.!?…]+["“”'»)]*(?:\s*<3)?|$)\s*/g)?.map((s) => s.trim()).filter(Boolean) ?? [trimmed];
  const out: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (!current) current = sentence;
    else if (current.length + 1 + sentence.length <= max) current += ` ${sentence}`;
    else {
      out.push(current);
      current = sentence;
    }
  }
  if (current) out.push(current);
  return out;
}

/** How many characters fit one bubble comfortably on this screen. */
export function bubbleMax(): number {
  return typeof window !== 'undefined' && window.innerWidth < 560 ? 70 : 120;
}
