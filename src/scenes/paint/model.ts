/**
 * The painting as a grid of palette characters, so the paint bucket can do a
 * real flood fill. Pure, so it can be tested.
 */
export class Painting {
  readonly width: number;
  readonly height: number;
  readonly #cells: string[];

  constructor(rows: readonly string[]) {
    this.height = rows.length;
    this.width = rows[0]?.length ?? 0;
    this.#cells = rows.flatMap((row) => [...row.padEnd(this.width, ' ').slice(0, this.width)]);
  }

  at(x: number, y: number): string | undefined {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return undefined;
    return this.#cells[y * this.width + x];
  }

  set(x: number, y: number, colour: string): void {
    if (this.at(x, y) !== undefined) this.#cells[y * this.width + x] = colour;
  }

  /** How many cells hold `colour`. */
  count(colour: string): number {
    return this.#cells.filter((c) => c === colour).length;
  }

  /**
   * Paint-bucket fill: recolours the 4-connected area of the same colour
   * around (x, y). Returns the cells it changed, in the order it reached them.
   * There is deliberately no way back.
   */
  fill(x: number, y: number, colour: string): Array<[number, number]> {
    const target = this.at(x, y);
    if (target === undefined || target === colour) return [];
    const changed: Array<[number, number]> = [];
    const stack: Array<[number, number]> = [[x, y]];
    while (stack.length > 0) {
      const [cx, cy] = stack.pop() ?? [0, 0];
      if (this.at(cx, cy) !== target) continue;
      this.set(cx, cy, colour);
      changed.push([cx, cy]);
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    return changed;
  }

  rows(): string[] {
    const out: string[] = [];
    for (let y = 0; y < this.height; y++) out.push(this.#cells.slice(y * this.width, (y + 1) * this.width).join(''));
    return out;
  }
}

/** Width and height of the painting in picture pixels. */
export const PAINTING_W = 64;
export const PAINTING_H = 40;

/** Palette characters used in the painting. */
export const SKY = 's';
export const HOLE = 'o';
/** The one pixel the fill leaves broken. */
export const DEAD = 'x';

/** Centre of the white hole in the sky, in painting pixels. */
export const HOLE_CENTRE: readonly [number, number] = [27, 6];

const inEllipse = (x: number, y: number, cx: number, cy: number, rx: number, ry: number): boolean =>
  ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

/**
 * An almost finished landscape: sky, sun, clouds, hills, a tree and a little
 * house — and one ragged white hole in the sky that nobody painted.
 */
export function paintingRows(): string[] {
  const rows: string[] = [];
  const [hx, hy] = HOLE_CENTRE;
  for (let y = 0; y < PAINTING_H; y++) {
    let row = '';
    for (let x = 0; x < PAINTING_W; x++) {
      const back = 23 + Math.round(2.5 * Math.sin(x / 7));
      const front = 29 + Math.round(1.6 * Math.sin(x / 5 + 1));
      let c = y >= 19 ? 'S' : SKY;
      if (inEllipse(x, y, 52, 7, 4.2, 4.2)) c = 'y';
      if (inEllipse(x, y, 13, 7, 6, 2.2) || inEllipse(x, y, 16, 5, 3.5, 2)) c = 'w';
      if (inEllipse(x, y, 41, 13, 6, 2) || inEllipse(x, y, 43, 11.5, 3, 1.6)) c = 'w';
      // The hole: an ellipse with a couple of ragged bites.
      if (inEllipse(x, y, hx, hy, 4.2, 3.1) || inEllipse(x, y, hx + 3, hy - 2, 2, 1.4) || inEllipse(x, y, hx - 3, hy + 2, 1.6, 1.2)) c = HOLE;
      if (y >= back) c = 'h';
      if (y >= front) c = 'g';
      // A tree on the left.
      if (x >= 10 && x <= 11 && y >= 24 && y <= 31) c = 't';
      if (inEllipse(x, y, 10.5, 21, 4.5, 4)) c = 'T';
      // A little house on the right.
      if (x >= 42 && x <= 52 && y >= 23 && y <= 31) c = 'b';
      if (y >= 17 && y <= 22 && Math.abs(x - 47) <= y - 16) c = 'r';
      if (x >= 46 && x <= 48 && y >= 27 && y <= 31) c = 'd';
      if (x >= 43 && x <= 44 && y >= 25 && y <= 26) c = 'n';
      if (x >= 50 && x <= 51 && y >= 25 && y <= 26) c = 'n';
      row += c;
    }
    rows.push(row);
  }
  return rows;
}
