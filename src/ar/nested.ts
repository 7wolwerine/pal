/**
 * The printed code as one square: a QR code with an AR.js marker in its
 * middle, and a small picture inside the marker.
 *
 * The phone's camera app reads the QR and opens the AR page. The AR page then
 * looks for the black square in the middle and compares the picture inside it
 * with the `.patt` file, which is how it knows this is our marker and which
 * way up it is.
 *
 * Covering the middle of a QR code damages it. Error correction level H can
 * repair about 30% of the code, so the marker has to stay well below that.
 */
import { PATT_SIZE, type QrModules, type Raster, downsample, qrToRaster } from './marker.ts';

type Rgb = readonly [number, number, number];

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

/**
 * The picture inside the marker, drawn on the same 16x16 grid AR.js compares
 * on, so the printed picture and the `.patt` file agree pixel for pixel.
 * Ears up and chin down: the four rotations all look different, which is what
 * lets AR.js tell which way the paper is turned.
 */
export const BEAR: readonly string[] = [
  '................',
  '..BB........BB..',
  '.BppB......BppB.',
  '.BpBBBBBBBBBBpB.',
  '..BBBBBBBBBBBB..',
  '.BBBBBBBBBBBBBB.',
  '.BBBkBBBBBBkBBB.',
  '.BBBkBBBBBBkBBB.',
  '.BBBBBccccBBBBB.',
  '.BppBccnnccBppB.',
  '.BBBBccnnccBBBB.',
  '.BBBBcnccncBBBB.',
  '..BBBBcnncBBBB..',
  '...BBBBBBBBBB...',
  '....BBBBBBBB....',
  '................',
];

/**
 * A light bear on a dark background, on purpose. Seen through AR.js, the three
 * corner squares of a QR code are a dark blob on white. A dark bear on white
 * matched them well enough (about 0.7 confidence, the cut-off is 0.6) for the
 * model to jump onto the corners. Light on dark is the opposite of a corner
 * square, so they can no longer be confused.
 */
export const BEAR_COLOURS: Readonly<Record<string, Rgb>> = {
  '.': [70, 30, 84],
  B: [250, 234, 210],
  c: WHITE,
  p: [255, 143, 179],
  k: [42, 26, 20],
  n: [42, 26, 20],
};

/**
 * How alike AR.js finds two pictures, from -1 (opposites) to 1 (identical):
 * the correlation of their 16x16 versions with the average brightness taken
 * out, the same idea as the tracker's own confidence value.
 */
export function similarity(a: Raster, b: Raster): number {
  const values = (r: Raster): number[] => {
    const small = downsample(r, PATT_SIZE);
    const out: number[] = [];
    for (let i = 0; i < small.data.length; i += 4) out.push(small.data[i]!, small.data[i + 1]!, small.data[i + 2]!);
    const mean = out.reduce((sum, v) => sum + v, 0) / out.length;
    return out.map((v) => v - mean);
  };
  const va = values(a);
  const vb = values(b);
  const dot = va.reduce((sum, v, i) => sum + v * vb[i]!, 0);
  const length = (v: number[]): number => Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
  const scale = length(va) * length(vb);
  return scale === 0 ? 0 : dot / scale;
}

/**
 * What AR.js sees inside a QR corner square when it mistakes one for a marker:
 * the middle half of the 7-module square, which is the 3x3 black centre with a
 * thin white rim.
 */
export function finderAsPattern(): Raster {
  const size = 56;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  const out: Raster = { size, data };
  paint(out, 4, 4, 48, 48, BLACK);
  return out;
}

function paint(target: Raster, x0: number, y0: number, w: number, h: number, rgb: Rgb): void {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      target.data.set(rgb, (y * target.size + x) * 4);
    }
  }
}

/** Turns rows of palette characters into a raster, one pixel per character. */
export function spriteToRaster(rows: readonly string[], colours: Readonly<Record<string, Rgb>>): Raster {
  const size = rows.length;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  const out: Raster = { size, data };
  rows.forEach((row, y) => {
    if (row.length !== size) throw new Error(`Sprite row ${y} is ${row.length} wide, expected ${size}.`);
    [...row].forEach((char, x) => {
      const rgb = colours[char];
      if (!rgb) throw new Error(`Sprite uses "${char}", which has no colour.`);
      paint(out, x, y, 1, 1, rgb);
    });
  });
  return out;
}

/** Resizes without blending, so pixel art keeps its hard edges. */
export function scaleNearest(source: Raster, size: number): Raster {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    const sy = Math.floor((y * source.size) / size);
    for (let x = 0; x < size; x++) {
      const from = (sy * source.size + Math.floor((x * source.size) / size)) * 4;
      data.set(source.data.subarray(from, from + 4), (y * size + x) * 4);
    }
  }
  return { size, data };
}

export interface NestedOptions {
  readonly pixelsPerModule: number;
  /** White modules around the QR code. Scanners expect four. */
  readonly quietModules?: number;
  /** Side of the area cleared in the middle of the QR, in modules. */
  readonly holeModules: number;
  /** White modules between the QR and the marker's black square. */
  readonly gapModules?: number;
  /** Picture width divided by black square width. AR.js assumes 0.5. */
  readonly patternRatio?: number;
}

/** Where everything lands, in pixels. `*At` is the distance from the top-left corner. */
export interface NestedLayout {
  readonly size: number;
  readonly holeAt: number;
  readonly holeSize: number;
  readonly squareAt: number;
  readonly squareSize: number;
  readonly pictureAt: number;
  readonly pictureSize: number;
}

/**
 * Picks the hole size: the given share of the QR's width, as a whole number
 * of modules with the same parity as the QR so the hole sits on the module
 * grid and exactly in the centre.
 */
export function holeFor(moduleCount: number, share: number): number {
  const wanted = moduleCount * share;
  const sameParity = Math.round((wanted - moduleCount) / 2) * 2 + moduleCount;
  return Math.max(1, sameParity);
}

export function nestedLayout(moduleCount: number, options: NestedOptions): NestedLayout {
  const { pixelsPerModule: ppm, holeModules, quietModules = 4, gapModules = 1, patternRatio = 0.5 } = options;
  if ((moduleCount - holeModules) % 2 !== 0) {
    throw new Error('holeModules must be odd when the QR is odd-sized (and even when even), or the hole is off-centre.');
  }
  if (holeModules - gapModules * 2 <= 0) throw new Error('The gap leaves no room for the marker.');
  if (patternRatio <= 0 || patternRatio >= 1) throw new Error('patternRatio must be between 0 and 1.');
  const size = (moduleCount + quietModules * 2) * ppm;
  const centred = (inner: number): number => Math.round((size - inner) / 2);
  const holeSize = holeModules * ppm;
  const squareSize = Math.round((holeModules - gapModules * 2) * ppm);
  const pictureSize = Math.round(squareSize * patternRatio);
  return {
    size,
    holeAt: centred(holeSize),
    holeSize,
    squareAt: centred(squareSize),
    squareSize,
    pictureAt: centred(pictureSize),
    pictureSize,
  };
}

/** Draws the QR code, clears its middle and puts the framed picture there. */
export function nestMarkerInQr(modules: QrModules, picture: Raster, options: NestedOptions): Raster {
  const layout = nestedLayout(modules.size, options);
  const out = qrToRaster(modules, options.pixelsPerModule, options.quietModules ?? 4);
  paint(out, layout.holeAt, layout.holeAt, layout.holeSize, layout.holeSize, WHITE);
  paint(out, layout.squareAt, layout.squareAt, layout.squareSize, layout.squareSize, BLACK);
  const scaled = scaleNearest(picture, layout.pictureSize);
  for (let y = 0; y < scaled.size; y++) {
    const from = y * scaled.size * 4;
    out.data.set(
      scaled.data.subarray(from, from + scaled.size * 4),
      ((y + layout.pictureAt) * out.size + layout.pictureAt) * 4,
    );
  }
  return out;
}
