/** Palette for the flower sprites, one colour per character. */
export const FLOWER_PALETTE: Readonly<Record<string, string>> = {
  d: '#8b6b3e',
  D: '#6b4f2a',
  h: '#a1785a',
  H: '#7d5a40',
  p: '#ff9ec7',
  P: '#e56fa3',
  q: '#ffc4dc',
  f: '#ffe3cc',
  F: '#f5c9a8',
  k: '#3a2a3a',
  w: '#ffffff',
  b: '#ff8fa8',
  m: '#c2456e',
  g: '#4fa34a',
  G: '#6cc35f',
};

/** The flower as it is under the glass: dry, drooping, brown. 14 x 22. */
export const DRIED_ROWS: readonly string[] = [
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '......dd......',
  '.....d..d.....',
  '.....d...d....',
  '.....d...Hh...',
  '.....d..hHHh..',
  '.....d..HhhH..',
  '.....d...hH...',
  '....Dd........',
  '...D.d........',
  '..DD.d.DD.....',
  '.....dD..D....',
  '.....d........',
  '.....d........',
  '.....d........',
  '.....d........',
  '.....d........',
];

export const BLOOM_SIZE = 21;
const STEM_H = 11;

/**
 * The flower in bloom: a ring of five petals around a pretty little face,
 * on a green stem with two leaves. 21 x 32.
 */
export function bloomRows(): string[] {
  const c = (BLOOM_SIZE - 1) / 2;
  const rows: string[][] = [];
  for (let y = 0; y < BLOOM_SIZE; y++) {
    const row: string[] = [];
    for (let x = 0; x < BLOOM_SIZE; x++) {
      const dx = x - c;
      const dy = y - c;
      const r = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      const petal = 8.2 + 1.6 * Math.cos(5 * a + Math.PI / 2);
      let ch = '.';
      if (r <= 5.3) ch = r > 4.4 && dx + dy > 2 ? 'F' : 'f';
      else if (r <= petal) ch = r > petal - 1.3 ? 'P' : r < 6.6 ? 'q' : 'p';
      row.push(ch);
    }
    rows.push(row);
  }
  const put = (x: number, y: number, ch: string): void => {
    const row = rows[y];
    if (row && x >= 0 && x < row.length) row[x] = ch;
  };
  // Eyes with a glint and a lash, rosy cheeks and a small smile.
  for (const ex of [c - 2, c + 2]) {
    put(ex, c - 1, 'k');
    put(ex, c, 'k');
  }
  put(c - 2, c - 1, 'w');
  put(c + 2, c - 1, 'w');
  put(c - 3, c - 2, 'k');
  put(c + 3, c - 2, 'k');
  put(c - 3, c + 1, 'b');
  put(c + 3, c + 1, 'b');
  put(c - 1, c + 2, 'm');
  put(c, c + 3, 'm');
  put(c + 1, c + 2, 'm');
  // The stem starts right under the face, between the two lower petals...
  for (let y = c + 6; y < BLOOM_SIZE; y++) put(c, y, 'g');
  // ...and carries on below, with a leaf on each side.
  for (let i = 0; i < STEM_H; i++) {
    const row = Array.from({ length: BLOOM_SIZE }, () => '.');
    row[c] = 'g';
    if (i === 3) [row[c - 3], row[c - 2], row[c - 1]] = ['G', 'G', 'G'];
    if (i === 4) [row[c - 4], row[c - 3], row[c - 2]] = ['G', 'G', 'g'];
    if (i === 6) [row[c + 1], row[c + 2], row[c + 3]] = ['G', 'G', 'G'];
    if (i === 7) [row[c + 2], row[c + 3], row[c + 4]] = ['g', 'G', 'G'];
    rows.push(row);
  }
  return rows.map((row) => row.join(''));
}
