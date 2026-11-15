/**
 * The hidden vigilance layer. Small things that do not add up, under the
 * threshold: most players miss them. Each can be acted on although nobody
 * says so, and each one caught is a point. The reveal lists them all, found
 * or missed. In the game, curiosity usually leads into a trap; here it pays —
 * so there is no safe rule, only paying attention.
 */
export const ANOMALIES: Readonly<Record<string, string>> = {
  'title-flicker': 'Na okamžik se titulek okna změnil na „PAL.EXE“.',
  'rec-dot': 'V rohu u stolu na vteřinu blikl červený nápis „● REC“.',
  'refused-surprise': 'Třikrát po sobě jsi odmítl otevřít překvapení z cizí flashky — a vydržel ten smutný kukuč.',
  'contract-word': 'Uprostřed smlouvy šlo kliknout na slovo „brouk“.',
  'led-flicker': 'Kontrolka u tlačítka „Nesahat“ jednou blikla červeně, ještě než jsi na cokoli sáhl.',
  'flower-knew': 'Kytka věděla o skle, které nemohla vidět.',
};

/** What the brief glitches show. */
export const ANOMALY_TEXT = {
  title: 'PAL.EXE',
  rec: '● REC',
  label: 'Něco tu nesedí',
} as const;
