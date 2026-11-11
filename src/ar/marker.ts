/**
 * Builds an AR.js pattern marker whose inside is a working QR code.
 *
 * One printed square then does two jobs: a phone camera reads the QR and opens
 * the page, and the page's AR tracker recognises the same square and anchors
 * the 3D model to it.
 *
 * Everything here is pure pixel maths so it can be unit tested and run from
 * Node as well as from a browser.
 */

export interface Raster {
  /** Width and height in pixels. Rasters are always square. */
  readonly size: number;
  /** RGBA, row by row. */
  readonly data: Uint8ClampedArray;
}

/** What the `qrcode` package returns as `modules`. */
export interface QrModules {
  readonly size: number;
  get(row: number, col: number): number | boolean;
}

/** AR.js compares markers on a 16x16 grid. */
export const PATT_SIZE = 16;

function blank(size: number, grey: number): Raster {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i + 1] = data[i + 2] = grey;
    data[i + 3] = 255;
  }
  return { size, data };
}

function fillRect(target: Raster, x0: number, y0: number, w: number, h: number, grey: number): void {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const i = (y * target.size + x) * 4;
      target.data[i] = target.data[i + 1] = target.data[i + 2] = grey;
    }
  }
}

/** Draws QR modules black on white, with a white quiet zone around them. */
export function qrToRaster(modules: QrModules, pixelsPerModule: number, quietModules = 3): Raster {
  const size = (modules.size + quietModules * 2) * pixelsPerModule;
  const out = blank(size, 255);
  for (let row = 0; row < modules.size; row++) {
    for (let col = 0; col < modules.size; col++) {
      if (!modules.get(row, col)) continue;
      fillRect(
        out,
        (col + quietModules) * pixelsPerModule,
        (row + quietModules) * pixelsPerModule,
        pixelsPerModule,
        pixelsPerModule,
        0,
      );
    }
  }
  return out;
}

/**
 * Puts the inner image inside the thick black border AR.js looks for, on a
 * white margin. `patternRatio` is inner width divided by border width and has
 * to match the `patternRatio` given to AR.js on the page.
 */
export function frameMarker(inner: Raster, patternRatio: number, marginRatio = 0.12): Raster {
  if (patternRatio <= 0 || patternRatio >= 1) throw new Error('patternRatio must be between 0 and 1.');
  const border = Math.round(inner.size / patternRatio);
  const margin = Math.round(border * marginRatio);
  const out = blank(border + margin * 2, 255);
  fillRect(out, margin, margin, border, border, 0);
  const offset = margin + Math.round((border - inner.size) / 2);
  for (let y = 0; y < inner.size; y++) {
    const from = y * inner.size * 4;
    out.data.set(inner.data.subarray(from, from + inner.size * 4), ((y + offset) * out.size + offset) * 4);
  }
  return out;
}

/** Shrinks a raster by averaging the source pixels that fall into each target pixel. */
export function downsample(source: Raster, size: number): Raster {
  const out = blank(size, 0);
  for (let ty = 0; ty < size; ty++) {
    const y0 = Math.floor((ty * source.size) / size);
    const y1 = Math.max(y0 + 1, Math.floor(((ty + 1) * source.size) / size));
    for (let tx = 0; tx < size; tx++) {
      const x0 = Math.floor((tx * source.size) / size);
      const x1 = Math.max(x0 + 1, Math.floor(((tx + 1) * source.size) / size));
      const sum = [0, 0, 0];
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * source.size + x) * 4;
          sum[0]! += source.data[i]!;
          sum[1]! += source.data[i + 1]!;
          sum[2]! += source.data[i + 2]!;
        }
      }
      const count = (y1 - y0) * (x1 - x0);
      const o = (ty * size + tx) * 4;
      out.data[o] = Math.round(sum[0]! / count);
      out.data[o + 1] = Math.round(sum[1]! / count);
      out.data[o + 2] = Math.round(sum[2]! / count);
    }
  }
  return out;
}

/** Rotates a raster a quarter turn counter-clockwise. */
export function rotateCcw(source: Raster): Raster {
  const n = source.size;
  const out = blank(n, 0);
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const from = (col * n + (n - 1 - row)) * 4;
      const to = (row * n + col) * 4;
      out.data.set(source.data.subarray(from, from + 4), to);
    }
  }
  return out;
}

/**
 * Encodes the inner image as an AR.js `.patt` file: the 16x16 image in four
 * orientations (each a further quarter turn counter-clockwise), every
 * orientation written as blue, green, then red planes.
 */
export function encodePatt(inner: Raster): string {
  let view = downsample(inner, PATT_SIZE);
  const blocks: string[] = [];
  for (let turn = 0; turn < 4; turn++) {
    let block = '';
    for (let channel = 2; channel >= 0; channel--) {
      for (let y = 0; y < PATT_SIZE; y++) {
        const row: string[] = [];
        for (let x = 0; x < PATT_SIZE; x++) {
          row.push(String(view.data[(y * PATT_SIZE + x) * 4 + channel]).padStart(3));
        }
        block += `${row.join(' ')}\n`;
      }
    }
    blocks.push(block);
    view = rotateCcw(view);
  }
  return blocks.join('\n');
}
