/**
 * The printed code with the marker on the outside: a thick dark frame, which
 * is what AR.js looks for, and a working QR code inside it.
 *
 * The frame is most of the printed width, so the tracker sees it from about
 * three times as far as a marker tucked into the middle of a QR code. The QR
 * is drawn to look friendly: pink dots instead of black squares, rounded
 * corner squares and a bear's face in the middle.
 *
 * What AR.js compares is everything inside the frame, shrunk to 16x16. That is
 * a blur of the QR code, which is fine: the three corner squares still make
 * the four rotations look different.
 */
import type { QrModules, Raster } from './marker.ts';

export type Rgb = readonly [number, number, number];

export interface FramedColours {
  readonly paper: Rgb;
  /** Has to stay close to black: the tracker finds the frame by its darkness. */
  readonly frame: Rgb;
  /** The QR dots. Dark enough for a scanner to tell them from the paper. */
  readonly code: Rgb;
  readonly fur: Rgb;
  readonly muzzle: Rgb;
  readonly ear: Rgb;
  readonly face: Rgb;
  readonly blush: Rgb;
}

export const FRAMED_COLOURS: FramedColours = {
  paper: [255, 255, 255],
  frame: [28, 12, 36],
  code: [224, 37, 122],
  fur: [198, 132, 82],
  muzzle: [248, 230, 206],
  ear: [243, 182, 172],
  face: [58, 34, 28],
  blush: [255, 143, 179],
};

export interface FramedOptions {
  readonly pixelsPerModule: number;
  /** Width inside the frame divided by the frame's width. The AR page has to use the same number. */
  readonly patternRatio?: number;
  /** White modules between the QR and the frame. */
  readonly quietModules?: number;
  /** White modules around the frame. The tracker needs light around the dark square. */
  readonly marginModules?: number;
  /** Width of the area cleared for the bear, in modules. */
  readonly badgeModules?: number;
  readonly colours?: FramedColours;
}

export interface FramedLayout {
  /** Side of the whole image in pixels. */
  readonly size: number;
  readonly frameAt: number;
  readonly frameSize: number;
  /** The part AR.js compares: everything inside the frame. */
  readonly innerAt: number;
  readonly innerSize: number;
  readonly qrAt: number;
  readonly qrSize: number;
  /** Radius of the area cleared for the bear, in pixels. */
  readonly badgeRadius: number;
}

/** Corner squares of a QR code are seven modules wide. */
const FINDER = 7;
/** How round the inside corners of the frame are, in modules. */
const INNER_RADIUS = 3;

export function framedLayout(moduleCount: number, options: FramedOptions): FramedLayout {
  const { pixelsPerModule: ppm, patternRatio = 0.75, quietModules = 3, marginModules = 4, badgeModules = 10 } = options;
  if (!Number.isInteger(ppm) || ppm < 1) throw new Error('pixelsPerModule must be a whole number of pixels.');
  if (patternRatio <= 0 || patternRatio >= 1) throw new Error('patternRatio must be between 0 and 1.');
  if (badgeModules < 0 || badgeModules > moduleCount - 2 * (FINDER + 1)) {
    throw new Error('The bear does not fit between the corner squares.');
  }
  const innerSize = (moduleCount + quietModules * 2) * ppm;
  const frameSize = innerSize / patternRatio;
  const border = (frameSize - innerSize) / 2;
  if (!Number.isInteger(border)) {
    throw new Error(`The frame would be ${border} pixels thick. Pick pixelsPerModule so that it is a whole number.`);
  }
  const frameAt = marginModules * ppm;
  return {
    size: frameSize + frameAt * 2,
    frameAt,
    frameSize,
    innerAt: frameAt + border,
    innerSize,
    qrAt: frameAt + border + quietModules * ppm,
    qrSize: moduleCount * ppm,
    badgeRadius: (badgeModules / 2) * ppm,
  };
}

/** Distance in pixels to the edge of a shape: negative inside, positive outside. */
type Shape = (x: number, y: number) => number;

const disc = (cx: number, cy: number, r: number): Shape => (x, y) => Math.hypot(x - cx, y - cy) - r;

const ellipse = (cx: number, cy: number, rx: number, ry: number): Shape => (x, y) =>
  (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry);

/** A square with rounded corners, given by its centre and half its side. */
const roundSquare = (cx: number, cy: number, half: number, radius: number): Shape => (x, y) => {
  const qx = Math.abs(x - cx) - half + radius;
  const qy = Math.abs(y - cy) - half + radius;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
};

const without = (shape: Shape, hole: Shape): Shape => (x, y) => Math.max(shape(x, y), -hole(x, y));

/** The lower half of a ring: a smile. */
const smile = (cx: number, cy: number, r: number, width: number): Shape => (x, y) =>
  Math.max(Math.abs(Math.hypot(x - cx, y - cy) - r) - width / 2, cy - y);

/**
 * Paints a shape with soft edges: a pixel the edge passes through gets a mix
 * of the old and the new colour. `reach` is how far from the centre the shape
 * can extend, so only that square is visited.
 */
function paint(target: Raster, cx: number, cy: number, reach: number, shape: Shape, rgb: Rgb, opacity = 1): void {
  const x0 = Math.max(0, Math.floor(cx - reach - 1));
  const y0 = Math.max(0, Math.floor(cy - reach - 1));
  const x1 = Math.min(target.size, Math.ceil(cx + reach + 1));
  const y1 = Math.min(target.size, Math.ceil(cy + reach + 1));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const cover = Math.min(1, Math.max(0, 0.5 - shape(x + 0.5, y + 0.5))) * opacity;
      if (cover === 0) continue;
      const i = (y * target.size + x) * 4;
      for (let c = 0; c < 3; c++) {
        target.data[i + c] = Math.round(target.data[i + c]! * (1 - cover) + rgb[c]! * cover);
      }
    }
  }
}

function blank(size: number, rgb: Rgb): Raster {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
    data[i + 3] = 255;
  }
  return { size, data };
}

/** A corner square with rounded corners: a ring and a rounded block in it. */
function paintFinder(target: Raster, cx: number, cy: number, module: number, colours: FramedColours): void {
  const ring = without(roundSquare(cx, cy, 3.5 * module, 2.2 * module), roundSquare(cx, cy, 2.5 * module, 1.4 * module));
  paint(target, cx, cy, 3.5 * module, ring, colours.code);
  paint(target, cx, cy, 1.5 * module, roundSquare(cx, cy, 1.5 * module, 0.9 * module), colours.code);
}

/**
 * Where the small alignment squares sit, as module indexes of their centres.
 * A scanner uses them to straighten the grid, so they are drawn whole, not as
 * loose dots. Codes of 21 modules have none.
 */
export function alignmentCentres(moduleCount: number): Array<readonly [number, number]> {
  const version = (moduleCount - 17) / 4;
  if (version < 2) return [];
  const intervals = Math.floor(version / 7) + 1;
  const distance = 4 * version + 4;
  let step = Math.round(distance / intervals);
  step += step & 1;
  const along = [6];
  for (let i = 1; i <= intervals; i++) along.push(6 + distance - step * (intervals - i));
  const last = along.length - 1;
  const centres: Array<readonly [number, number]> = [];
  along.forEach((row, r) => {
    along.forEach((col, c) => {
      // The three corners that hold the big squares have no small one.
      if ((r === 0 && c === 0) || (r === 0 && c === last) || (r === last && c === 0)) return;
      centres.push([row, col]);
    });
  });
  return centres;
}

/** An alignment square: a small rounded ring with a dot in it. */
function paintAlignment(target: Raster, cx: number, cy: number, module: number, colours: FramedColours): void {
  const ring = without(roundSquare(cx, cy, 2.5 * module, 1.2 * module), roundSquare(cx, cy, 1.5 * module, 0.6 * module));
  paint(target, cx, cy, 2.5 * module, ring, colours.code);
  paint(target, cx, cy, 0.5 * module, disc(cx, cy, 0.5 * module), colours.code);
}

/** The bear's face. `unit` is a fifth of the radius of the cleared area. */
function paintBear(target: Raster, cx: number, cy: number, unit: number, colours: FramedColours): void {
  const at = (x: number): number => cx + x * unit;
  const down = (y: number): number => cy + y * unit;
  for (const side of [-1, 1]) {
    paint(target, at(side * 2.6), down(-2.5), 1.35 * unit, disc(at(side * 2.6), down(-2.5), 1.35 * unit), colours.fur);
    paint(target, at(side * 2.6), down(-2.5), 0.75 * unit, disc(at(side * 2.6), down(-2.5), 0.75 * unit), colours.ear);
  }
  paint(target, at(0), down(0.35), 3.9 * unit, ellipse(at(0), down(0.35), 3.9 * unit, 3.5 * unit), colours.fur);
  paint(target, at(0), down(1.5), 1.8 * unit, ellipse(at(0), down(1.5), 1.8 * unit, 1.35 * unit), colours.muzzle);
  for (const side of [-1, 1]) {
    paint(target, at(side * 2.6), down(1.2), 0.65 * unit, disc(at(side * 2.6), down(1.2), 0.65 * unit), colours.blush, 0.85);
    paint(target, at(side * 1.5), down(-0.15), 0.46 * unit, disc(at(side * 1.5), down(-0.15), 0.46 * unit), colours.face);
    paint(target, at(side * 1.5 - 0.15), down(-0.32), 0.15 * unit, disc(at(side * 1.5 - 0.15), down(-0.32), 0.15 * unit), colours.paper);
    paint(target, at(side * 0.4), down(1.45), 0.5 * unit, smile(at(side * 0.4), down(1.45), 0.4 * unit, 0.16 * unit), colours.face);
  }
  paint(target, at(0), down(0.95), 0.56 * unit, ellipse(at(0), down(0.95), 0.56 * unit, 0.4 * unit), colours.face);
}

/** Draws the whole code: white margin, dark frame, pink QR, bear. */
export function frameQr(modules: QrModules, options: FramedOptions): Raster {
  const layout = framedLayout(modules.size, options);
  const colours = options.colours ?? FRAMED_COLOURS;
  const ppm = options.pixelsPerModule;
  const n = modules.size;
  const out = blank(layout.size, colours.paper);
  const middle = layout.size / 2;

  // The outer corners are rounded only a little. The tracker fits a straight
  // line to the middle nine tenths of each side, so a corner this small is
  // outside what it measures. The inside can be as round as we like.
  const frame = without(
    roundSquare(middle, middle, layout.frameSize / 2, 1.5 * ppm),
    roundSquare(middle, middle, layout.innerSize / 2, INNER_RADIUS * ppm),
  );
  paint(out, middle, middle, layout.frameSize / 2, frame, colours.frame);

  const centreOf = (index: number): number => layout.qrAt + (index + 0.5) * ppm;
  const inFinder = (row: number, col: number): boolean =>
    (row < FINDER && col < FINDER) || (row < FINDER && col >= n - FINDER) || (row >= n - FINDER && col < FINDER);
  const squares = alignmentCentres(n);
  const inAlignment = (row: number, col: number): boolean =>
    squares.some(([r, c]) => Math.abs(row - r) <= 2 && Math.abs(col - c) <= 2);
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (!modules.get(row, col) || inFinder(row, col) || inAlignment(row, col)) continue;
      const x = centreOf(col);
      const y = centreOf(row);
      // A dot that would touch the bear is left out; the scanner repairs it.
      if (Math.hypot(x - middle, y - middle) < layout.badgeRadius + 0.2 * ppm) continue;
      paint(out, x, y, 0.43 * ppm, disc(x, y, 0.43 * ppm), colours.code);
    }
  }
  const near = layout.qrAt + 3.5 * ppm;
  const far = layout.qrAt + (n - 3.5) * ppm;
  paintFinder(out, near, near, ppm, colours);
  paintFinder(out, far, near, ppm, colours);
  paintFinder(out, near, far, ppm, colours);
  for (const [row, col] of squares) paintAlignment(out, centreOf(col), centreOf(row), ppm, colours);

  if (layout.badgeRadius > 0) paintBear(out, middle, middle, layout.badgeRadius / 5, colours);
  return out;
}

/** Cuts a square out of a raster. */
export function crop(source: Raster, at: number, size: number): Raster {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    const from = ((y + at) * source.size + at) * 4;
    data.set(source.data.subarray(from, from + size * 4), y * size * 4);
  }
  return { size, data };
}

/**
 * What AR.js would compare if it took one of the QR's corner squares for a
 * marker: the middle of the square, in the same proportion as the real frame.
 */
export function finderAsFramedPattern(patternRatio = 0.75, colours: FramedColours = FRAMED_COLOURS): Raster {
  const module = 32;
  const size = FINDER * module;
  const out = blank(size, colours.paper);
  paintFinder(out, size / 2, size / 2, module, colours);
  const inner = Math.round(size * patternRatio);
  return crop(out, Math.round((size - inner) / 2), inner);
}
