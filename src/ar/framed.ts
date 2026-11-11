/**
 * The printed code with the marker on the outside: a thick dark frame, which
 * is what AR.js looks for, and a working QR code inside it.
 *
 * The frame is most of the printed width, so the tracker sees it from about
 * three times as far as a marker tucked into the middle of a QR code. The QR
 * is drawn to look friendly: coloured dots instead of black squares, rounded
 * corner squares and a pixel-art bear's head in the middle.
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
}

/** The code to print: pink dots in a dark plum frame. */
export const PRINT_COLOURS: FramedColours = {
  paper: [255, 255, 255],
  frame: [28, 12, 36],
  code: [204, 28, 108],
};

/**
 * The code to show on a screen: blue dots in a dark navy frame. The colour
 * tells people which code is which; the tracker tells them apart by the QR
 * itself, which encodes a different address.
 */
export const SCREEN_COLOURS: FramedColours = {
  paper: [255, 255, 255],
  frame: [12, 18, 44],
  code: [34, 96, 204],
};

export const FRAMED_COLOURS = PRINT_COLOURS;

/**
 * The bear's head as pixel art, in the colours of the 3D model that appears
 * above the code. A dot is a transparent pixel: the head has no background,
 * the QR dots simply stop short of it.
 */
export const BEAR_HEAD: readonly string[] = [
  '........................',
  '........................',
  '...oooo..........oooo...',
  '..oBBBBo........oBBBBo..',
  '.oBeeeBBooooooooBBeeeBo.',
  '.oBeeeBBBBBBBBBBBBeeeBo.',
  '.oBBeBBBBBBBBBBBBBBeBBo.',
  '..oBBBBBBBBBBBBBBBBBBo..',
  '.oBBBBBBBBBBBBBBBBBBBBo.',
  '.oBBBBBBBBBBBBBBBBBBBBo.',
  'oBBBBBBBBBBBBBBBBBBBBBBo',
  'oBBBBBwkBBBBBBBBwkBBBBBo',
  'oBBBBBkkBBccccBBkkBBBBBo',
  'oBBBBBkkBccnnccBkkBBBBBo',
  'oBpppBBBcccnncccBBBpppBo',
  'oBpppBBBcmccccmcBBBpppBo',
  '.oBBBBBBccmmmmccBBBBBBo.',
  '.oBBBBBBBccccccBBBBBBBo.',
  '..oBBBBBBBBBBBBBBBBBBo..',
  '...oddBBBBBBBBBBBBddo...',
  '....ooddddddddddddoo....',
  '......oooooooooooo......',
  '........................',
  '........................',
];

export const BEAR_HEAD_COLOURS: Readonly<Record<string, Rgb>> = {
  o: [112, 64, 36],
  B: [190, 124, 74],
  d: [160, 98, 56],
  e: [232, 208, 180],
  c: [240, 222, 198],
  p: [232, 128, 132],
  k: [44, 26, 22],
  w: [255, 255, 255],
  n: [72, 38, 28],
  m: [130, 72, 44],
};

/** Turns rows of palette characters into a raster, one pixel per character; a dot stays transparent. */
export function spriteWithGaps(rows: readonly string[], colours: Readonly<Record<string, Rgb>>): Raster {
  const size = rows.length;
  const data = new Uint8ClampedArray(size * size * 4);
  rows.forEach((row, y) => {
    if (row.length !== size) throw new Error(`Sprite row ${y} is ${row.length} wide, expected ${size}.`);
    [...row].forEach((char, x) => {
      if (char === '.') return;
      const rgb = colours[char];
      if (!rgb) throw new Error(`Sprite uses "${char}", which has no colour.`);
      data.set([...rgb, 255], (y * size + x) * 4);
    });
  });
  return { size, data };
}

export interface FramedOptions {
  readonly pixelsPerModule: number;
  /** Width inside the frame divided by the frame's width. The AR page has to use the same number. */
  readonly patternRatio?: number;
  /** White modules between the QR and the frame. */
  readonly quietModules?: number;
  /** White modules around the frame. The tracker needs light around the dark square. */
  readonly marginModules?: number;
  /** Roughly how wide the picture in the middle is, in modules. */
  readonly pictureModules?: number;
  /** Side of the picture in its own pixels. Each of them becomes a whole number of image pixels. */
  readonly pictureSize?: number;
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
  /** Where the picture's square goes; zero size when there is no picture. */
  readonly pictureAt: number;
  readonly pictureSpan: number;
}

/** Corner squares of a QR code are seven modules wide. */
const FINDER = 7;
/**
 * How round the inside corners of the frame are, in modules. The three corners
 * next to the QR's corner squares are rounder than the fourth. That makes the
 * code look different from each side, which is how the tracker knows which way
 * it is turned; without it the four rotations look too much alike from afar.
 */
const INNER_RADIUS = 3;
const PLAIN_CORNER_RADIUS = 9;
/** How close to the picture a dot's centre may be, in modules. A dot's radius is 0.43. */
const PICTURE_GAP = 0.9;

export function framedLayout(moduleCount: number, options: FramedOptions): FramedLayout {
  const { pixelsPerModule: ppm, patternRatio = 0.75, quietModules = 3, marginModules = 4, pictureModules = 13, pictureSize = 0 } = options;
  if (!Number.isInteger(ppm) || ppm < 1) throw new Error('pixelsPerModule must be a whole number of pixels.');
  if (patternRatio <= 0 || patternRatio >= 1) throw new Error('patternRatio must be between 0 and 1.');
  if (pictureSize > 0 && (pictureModules <= 0 || pictureModules > moduleCount - 2 * (FINDER + 2))) {
    throw new Error('The picture does not fit between the corner squares.');
  }
  const innerSize = (moduleCount + quietModules * 2) * ppm;
  const frameSize = innerSize / patternRatio;
  const border = (frameSize - innerSize) / 2;
  if (!Number.isInteger(border)) {
    throw new Error(`The frame would be ${border} pixels thick. Pick pixelsPerModule so that it is a whole number.`);
  }
  const frameAt = marginModules * ppm;
  const size = frameSize + frameAt * 2;
  const pictureSpan = pictureSize > 0 ? Math.max(1, Math.round((pictureModules * ppm) / pictureSize)) * pictureSize : 0;
  if ((size - pictureSpan) % 2 !== 0) throw new Error('The picture cannot be centred on whole pixels. Use a picture with an even side.');
  return {
    size,
    frameAt,
    frameSize,
    innerAt: frameAt + border,
    innerSize,
    qrAt: frameAt + border + quietModules * ppm,
    qrSize: moduleCount * ppm,
    pictureAt: (size - pictureSpan) / 2,
    pictureSpan,
  };
}

/** Distance in pixels to the edge of a shape: negative inside, positive outside. */
type Shape = (x: number, y: number) => number;

const disc = (cx: number, cy: number, r: number): Shape => (x, y) => Math.hypot(x - cx, y - cy) - r;

/**
 * A square with rounded corners, given by its centre and half its side. The
 * bottom right corner can have a radius of its own.
 */
const roundSquare = (cx: number, cy: number, half: number, radius: number, lastRadius = radius): Shape => (x, y) => {
  const r = x > cx && y > cy ? lastRadius : radius;
  const qx = Math.abs(x - cx) - half + r;
  const qy = Math.abs(y - cy) - half + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};

const without = (shape: Shape, hole: Shape): Shape => (x, y) => Math.max(shape(x, y), -hole(x, y));

/**
 * Paints a shape with soft edges: a pixel the edge passes through gets a mix
 * of the old and the new colour. `reach` is how far from the centre the shape
 * can extend, so only that square is visited.
 */
function paint(target: Raster, cx: number, cy: number, reach: number, shape: Shape, rgb: Rgb): void {
  const x0 = Math.max(0, Math.floor(cx - reach - 1));
  const y0 = Math.max(0, Math.floor(cy - reach - 1));
  const x1 = Math.min(target.size, Math.ceil(cx + reach + 1));
  const y1 = Math.min(target.size, Math.ceil(cy + reach + 1));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const cover = Math.min(1, Math.max(0, 0.5 - shape(x + 0.5, y + 0.5)));
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

/**
 * Draws the whole code: white margin, dark frame, pink QR and, when a picture
 * is given, the picture in the middle. The picture is enlarged without
 * blending, so pixel art keeps its hard edges, and the dots keep clear of it.
 */
export function frameQr(modules: QrModules, options: FramedOptions, picture?: Raster): Raster {
  const layout = framedLayout(modules.size, { ...options, pictureSize: picture?.size ?? 0 });
  const colours = options.colours ?? FRAMED_COLOURS;
  const ppm = options.pixelsPerModule;
  const n = modules.size;
  const out = blank(layout.size, colours.paper);
  const middle = layout.size / 2;
  const pixel = picture ? layout.pictureSpan / picture.size : 0;
  /** Is any solid pixel of the picture within `reach` image pixels of this point? */
  const nearPicture = (x: number, y: number, reach: number): boolean => {
    if (!picture) return false;
    const from = (v: number): number => Math.max(0, Math.floor((v - reach - layout.pictureAt) / pixel));
    const to = (v: number): number => Math.min(picture.size - 1, Math.floor((v + reach - layout.pictureAt) / pixel));
    for (let py = from(y); py <= to(y); py++) {
      for (let px = from(x); px <= to(x); px++) {
        if (picture.data[(py * picture.size + px) * 4 + 3]! > 0) return true;
      }
    }
    return false;
  };

  // The outer corners are rounded only a little. The tracker fits a straight
  // line to the middle nine tenths of each side, so a corner this small is
  // outside what it measures. The inside can be as round as we like.
  const frame = without(
    roundSquare(middle, middle, layout.frameSize / 2, 1.5 * ppm),
    roundSquare(middle, middle, layout.innerSize / 2, INNER_RADIUS * ppm, PLAIN_CORNER_RADIUS * ppm),
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
      // Dots under the picture and right next to it are left out; the scanner repairs them.
      if (nearPicture(x, y, PICTURE_GAP * ppm)) continue;
      paint(out, x, y, 0.43 * ppm, disc(x, y, 0.43 * ppm), colours.code);
    }
  }
  const near = layout.qrAt + 3.5 * ppm;
  const far = layout.qrAt + (n - 3.5) * ppm;
  paintFinder(out, near, near, ppm, colours);
  paintFinder(out, far, near, ppm, colours);
  paintFinder(out, near, far, ppm, colours);
  for (const [row, col] of squares) paintAlignment(out, centreOf(col), centreOf(row), ppm, colours);

  if (picture) {
    for (let py = 0; py < picture.size; py++) {
      for (let px = 0; px < picture.size; px++) {
        const from = (py * picture.size + px) * 4;
        if (picture.data[from + 3] === 0) continue;
        for (let y = 0; y < pixel; y++) {
          const to = ((layout.pictureAt + py * pixel + y) * out.size + layout.pictureAt + px * pixel) * 4;
          for (let x = 0; x < pixel; x++) out.data.set(picture.data.subarray(from, from + 3), to + x * 4);
        }
      }
    }
  }
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
 * What AR.js would compare if it took a dark square inside the code for the
 * marker: the middle of that square, in the same proportion as the real frame.
 */
export function seenAsMarker(square: Raster, patternRatio = 0.75): Raster {
  const inner = Math.round(square.size * patternRatio);
  return crop(square, Math.round((square.size - inner) / 2), inner);
}

/** One of the QR's corner squares on its own, to check the tracker cannot take it for the marker. */
export function finderSquare(colours: FramedColours = FRAMED_COLOURS): Raster {
  const module = 32;
  const size = FINDER * module;
  const out = blank(size, colours.paper);
  paintFinder(out, size / 2, size / 2, module, colours);
  return out;
}
