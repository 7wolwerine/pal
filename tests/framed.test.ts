import { describe, expect, it } from 'vitest';
import QRCode from 'qrcode';
import type { Raster } from '../src/ar/marker.ts';
import {
  BEAR_HEAD,
  BEAR_HEAD_COLOURS,
  PRINT_COLOURS,
  SCREEN_COLOURS,
  alignmentCentres,
  frameQr,
  framedLayout,
  spriteWithGaps,
} from '../src/ar/framed.ts';

function pixel(r: Raster, x: number, y: number): number[] {
  const i = (Math.floor(y) * r.size + Math.floor(x)) * 4;
  return [...r.data.subarray(i, i + 3)];
}

const head = spriteWithGaps(BEAR_HEAD, BEAR_HEAD_COLOURS);

describe('spriteWithGaps', () => {
  it('leaves dots transparent and paints the rest', () => {
    expect(head.size).toBe(BEAR_HEAD.length);
    expect(head.data[3]).toBe(0);
    const middle = (12 * head.size + 12) * 4;
    expect(head.data[middle + 3]).toBe(255);
  });

  it('rejects a row of the wrong width and an unknown colour', () => {
    expect(() => spriteWithGaps(['..', '.'], BEAR_HEAD_COLOURS)).toThrow();
    expect(() => spriteWithGaps(['?'], BEAR_HEAD_COLOURS)).toThrow();
  });
});

describe('framedLayout', () => {
  it('puts the frame, the QR and the picture where the AR page expects them', () => {
    expect(framedLayout(37, { pixelsPerModule: 24, pictureSize: head.size })).toEqual({
      size: 1568,
      frameAt: 96,
      frameSize: 1376,
      innerAt: 268,
      innerSize: 1032,
      qrAt: 340,
      qrSize: 888,
      pictureAt: 628,
      pictureSpan: 312,
    });
  });

  it('keeps the inside at three quarters of the frame', () => {
    const layout = framedLayout(37, { pixelsPerModule: 24 });
    expect(layout.innerSize / layout.frameSize).toBe(0.75);
  });

  it('rejects a frame that would not be a whole number of pixels thick', () => {
    expect(() => framedLayout(37, { pixelsPerModule: 25 })).toThrow();
  });

  it('rejects a picture wider than the space between the corner squares', () => {
    expect(() => framedLayout(37, { pixelsPerModule: 24, pictureSize: 24, pictureModules: 30 })).toThrow();
  });
});

describe('alignmentCentres', () => {
  it('matches the positions in the QR standard', () => {
    expect(alignmentCentres(21)).toEqual([]);
    expect(alignmentCentres(25)).toEqual([[18, 18]]);
    expect(alignmentCentres(37)).toEqual([[30, 30]]);
    expect(alignmentCentres(45)).toHaveLength(6);
    expect(alignmentCentres(45)).toContainEqual([22, 22]);
    expect(alignmentCentres(45)).not.toContainEqual([6, 6]);
  });
});

describe('frameQr', () => {
  const qr = QRCode.create('https://example.org/pal/ar/', { errorCorrectionLevel: 'H' });
  const options = { pixelsPerModule: 12 };
  const layout = framedLayout(qr.modules.size, { ...options, pictureSize: head.size });
  const print = frameQr(qr.modules, { ...options, colours: PRINT_COLOURS }, head);
  const screen = frameQr(qr.modules, { ...options, colours: SCREEN_COLOURS }, head);
  const ppm = options.pixelsPerModule;
  const border = layout.innerAt - layout.frameAt;

  it('leaves white paper around a dark frame', () => {
    expect(print.size).toBe(layout.size);
    expect(pixel(print, 2, 2)).toEqual([...PRINT_COLOURS.paper]);
    expect(pixel(print, layout.frameAt + border / 2, layout.size / 2)).toEqual([...PRINT_COLOURS.frame]);
  });

  it('rounds the inside corner without a QR corner square more than the other three', () => {
    const near = layout.innerAt + 2 * ppm;
    const far = layout.innerAt + layout.innerSize - 2 * ppm;
    expect(pixel(print, near, near)).toEqual([...PRINT_COLOURS.paper]);
    expect(pixel(print, far, near)).toEqual([...PRINT_COLOURS.paper]);
    expect(pixel(print, near, far)).toEqual([...PRINT_COLOURS.paper]);
    expect(pixel(print, far, far)).toEqual([...PRINT_COLOURS.frame]);
  });

  it('draws the QR in the code colour', () => {
    const finder = layout.qrAt + 3.5 * ppm;
    expect(pixel(print, finder, finder)).toEqual([...PRINT_COLOURS.code]);
    expect(pixel(screen, finder, finder)).toEqual([...SCREEN_COLOURS.code]);
  });

  it('puts the bear in the middle in its own colours', () => {
    const middle = layout.size / 2;
    expect(pixel(print, middle, middle)).toEqual(pixel(screen, middle, middle));
    const fur = [...BEAR_HEAD_COLOURS['B']!];
    expect(pixel(print, layout.pictureAt + 12 * (layout.pictureSpan / head.size), layout.pictureAt + 8.5 * (layout.pictureSpan / head.size))).toEqual(fur);
  });

  it('keeps the print and screen colours apart', () => {
    expect(PRINT_COLOURS.code).not.toEqual(SCREEN_COLOURS.code);
    expect(PRINT_COLOURS.frame).not.toEqual(SCREEN_COLOURS.frame);
  });
});
