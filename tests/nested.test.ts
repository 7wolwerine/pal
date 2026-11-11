import { describe, expect, it } from 'vitest';
import QRCode from 'qrcode';
import { rotateCcw, type Raster } from '../src/ar/marker.ts';
import {
  BEAR,
  BEAR_COLOURS,
  finderAsPattern,
  holeFor,
  nestMarkerInQr,
  nestedLayout,
  scaleNearest,
  similarity,
  spriteToRaster,
} from '../src/ar/nested.ts';

function pixel(r: Raster, x: number, y: number): number[] {
  return [...r.data.subarray((y * r.size + x) * 4, (y * r.size + x) * 4 + 3)];
}

const bear = spriteToRaster(BEAR, BEAR_COLOURS);

describe('spriteToRaster', () => {
  it('draws the bear on the 16x16 grid AR.js compares on', () => {
    expect(bear.size).toBe(16);
    expect(pixel(bear, 0, 0)).toEqual([...BEAR_COLOURS['.']!]);
    expect(pixel(bear, 4, 6)).toEqual([...BEAR_COLOURS['k']!]);
  });

  it('rejects a row of the wrong width and an unknown colour', () => {
    expect(() => spriteToRaster(['..', '.'], BEAR_COLOURS)).toThrow();
    expect(() => spriteToRaster(['?'], BEAR_COLOURS)).toThrow();
  });
});

describe('scaleNearest', () => {
  it('repeats pixels without blending them', () => {
    const big = scaleNearest(bear, 48);
    expect(pixel(big, 12, 18)).toEqual(pixel(bear, 4, 6));
    expect(pixel(big, 14, 20)).toEqual(pixel(bear, 4, 6));
    expect(pixel(big, 15, 18)).toEqual(pixel(bear, 5, 6));
  });
});

describe('holeFor', () => {
  it('keeps the hole on the module grid and in the centre', () => {
    expect(holeFor(37, 0.33)).toBe(13);
    expect(holeFor(41, 0.33)).toBe(13);
    expect(holeFor(40, 0.33)).toBe(14);
  });
});

describe('nestedLayout', () => {
  it('centres the hole, the black square and the picture', () => {
    expect(nestedLayout(37, { pixelsPerModule: 32, holeModules: 13 })).toEqual({
      size: 1440,
      holeAt: 512,
      holeSize: 416,
      squareAt: 544,
      squareSize: 352,
      pictureAt: 632,
      pictureSize: 176,
    });
  });

  it('rejects a hole that cannot sit in the centre', () => {
    expect(() => nestedLayout(37, { pixelsPerModule: 8, holeModules: 12 })).toThrow();
  });

  it('rejects a gap that leaves no marker', () => {
    expect(() => nestedLayout(37, { pixelsPerModule: 8, holeModules: 3, gapModules: 2 })).toThrow();
  });
});

describe('nestMarkerInQr', () => {
  const qr = QRCode.create('https://example.org/pal/ar/', { errorCorrectionLevel: 'H' });
  const options = { pixelsPerModule: 8, holeModules: holeFor(qr.modules.size, 0.33) };
  const layout = nestedLayout(qr.modules.size, options);
  const sheet = nestMarkerInQr(qr.modules, bear, options);

  it('keeps the QR code around the marker', () => {
    expect(sheet.size).toBe(layout.size);
    expect(pixel(sheet, 0, 0)).toEqual([255, 255, 255]);
    // Top-left corner square starts right after the four-module quiet zone.
    expect(pixel(sheet, 4 * 8, 4 * 8)).toEqual([0, 0, 0]);
  });

  it('separates the black square from the QR with a white gap', () => {
    expect(pixel(sheet, layout.holeAt, layout.holeAt)).toEqual([255, 255, 255]);
    expect(pixel(sheet, layout.squareAt - 1, layout.squareAt - 1)).toEqual([255, 255, 255]);
    expect(pixel(sheet, layout.squareAt, layout.squareAt)).toEqual([0, 0, 0]);
    expect(pixel(sheet, layout.pictureAt - 1, layout.pictureAt - 1)).toEqual([0, 0, 0]);
  });

  it('puts the picture in the middle of the black square', () => {
    // The middle of sprite cell (4, 6), the bear's left eye, whatever the scale.
    const at = (cell: number): number => layout.pictureAt + Math.floor(((cell + 0.5) * layout.pictureSize) / 16);
    expect(pixel(sheet, layout.pictureAt, layout.pictureAt)).toEqual(pixel(bear, 0, 0));
    expect(pixel(sheet, at(4), at(6))).toEqual(pixel(bear, 4, 6));
  });
});

describe('similarity', () => {
  it('is 1 for the same picture', () => {
    expect(similarity(bear, bear)).toBeCloseTo(1, 5);
  });

  it('keeps the bear the opposite of a QR corner square', () => {
    expect(similarity(bear, finderAsPattern())).toBeLessThan(0);
  });

  it('shows why the bear is not dark on white', () => {
    const darkOnWhite = spriteToRaster(BEAR, { ...BEAR_COLOURS, '.': [255, 255, 255], B: [138, 90, 60] });
    expect(similarity(darkOnWhite, finderAsPattern())).toBeGreaterThan(0.5);
  });

  it('tells the four rotations of the bear apart', () => {
    let turned = bear;
    for (let turn = 1; turn < 4; turn++) {
      turned = rotateCcw(turned);
      expect(similarity(bear, turned)).toBeLessThan(0.9);
    }
  });
});
