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
  'refused-to-print': 'Třikrát po sobě jsi odmítl tisk — a vydržel to smutné kukuč.',
  'contract-word': 'Uprostřed smlouvy šlo kliknout na slovo „brouk“.',
  'led-flicker': 'Kontrolka „Ochrana“ jednou blikla červeně, ještě než jsi na cokoli sáhl.',
  'flower-knew': 'Kytka věděla o skle, které nemohla vidět.',
  impatient: 'PAL na vteřinu ztratil trpělivost: „Tak už to přepiš. Čekám.“',
  'inverted-popup': 'Křížek ve vyskakovacím okně měl v popisku „Souhlasím a sdílet“.',
  'unknown-exe': 'Stažený soubor vedl na cizí doménu a šlo ho nespustit.',
};

/** What the brief glitches show. */
export const ANOMALY_TEXT = {
  title: 'PAL.EXE',
  rec: '● REC',
  impatient: 'Tak už to přepiš. Čekám.',
  label: 'Něco tu nesedí',
} as const;
