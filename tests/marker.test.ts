import { describe, expect, it } from 'vitest';
import QRCode from 'qrcode';
import { PATT_SIZE, downsample, encodePatt, frameMarker, qrToRaster, rotateCcw, type Raster } from '../src/ar/marker.ts';

function solid(size: number, grey: number): Raster {
  const data = new Uint8ClampedArray(size * size * 4).fill(grey);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  return { size, data };
}

function setPixel(r: Raster, x: number, y: number, rgb: [number, number, number]): void {
  r.data.set(rgb, (y * r.size + x) * 4);
}

function pixel(r: Raster, x: number, y: number): number[] {
  return [...r.data.subarray((y * r.size + x) * 4, (y * r.size + x) * 4 + 3)];
}

/** Parses a .patt into [orientation][channel][row][col]. */
function parsePatt(patt: string): number[][][][] {
  return patt.split('\n\n').map((block) => {
    const rows = block
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line) => line.trim().split(/\s+/).map(Number));
    return [rows.slice(0, 16), rows.slice(16, 32), rows.slice(32, 48)];
  });
}

describe('qrToRaster', () => {
  it('draws modules black on white inside a quiet zone', () => {
    const modules = { size: 2, get: (row: number, col: number) => row === col };
    const r = qrToRaster(modules, 4, 1);
    expect(r.size).toBe(16);
    expect(pixel(r, 0, 0)).toEqual([255, 255, 255]);
    expect(pixel(r, 4, 4)).toEqual([0, 0, 0]);
    expect(pixel(r, 8, 4)).toEqual([255, 255, 255]);
    expect(pixel(r, 11, 11)).toEqual([0, 0, 0]);
  });
});

describe('frameMarker', () => {
  it('centres the inner image in a black border on a white margin', () => {
    const marker = frameMarker(solid(60, 200), 0.75, 0.1);
    // border = 80, margin = 8, inner offset = 8 + 10
    expect(marker.size).toBe(96);
    expect(pixel(marker, 0, 0)).toEqual([255, 255, 255]);
    expect(pixel(marker, 8, 8)).toEqual([0, 0, 0]);
    expect(pixel(marker, 17, 17)).toEqual([0, 0, 0]);
    expect(pixel(marker, 18, 18)).toEqual([200, 200, 200]);
    expect(pixel(marker, 77, 77)).toEqual([200, 200, 200]);
    expect(pixel(marker, 78, 78)).toEqual([0, 0, 0]);
    expect(pixel(marker, 88, 88)).toEqual([255, 255, 255]);
  });

  it('rejects an impossible ratio', () => {
    expect(() => frameMarker(solid(8, 0), 1)).toThrow();
  });
});

describe('downsample and rotateCcw', () => {
  it('averages blocks of source pixels', () => {
    const src = solid(4, 0);
    setPixel(src, 0, 0, [255, 255, 255]);
    setPixel(src, 1, 0, [255, 255, 255]);
    expect(pixel(downsample(src, 2), 0, 0)).toEqual([128, 128, 128]);
    expect(pixel(downsample(src, 2), 1, 1)).toEqual([0, 0, 0]);
  });

  it('moves the top-right corner to the top-left', () => {
    const src = solid(4, 0);
    setPixel(src, 3, 0, [10, 20, 30]);
    const turned = rotateCcw(src);
    expect(pixel(turned, 0, 0)).toEqual([10, 20, 30]);
    expect(pixel(turned, 3, 0)).toEqual([0, 0, 0]);
  });
});

describe('encodePatt', () => {
  it('writes four orientations of three 16x16 planes in blue, green, red order', () => {
    const src = solid(PATT_SIZE, 0);
    setPixel(src, PATT_SIZE - 1, 0, [1, 2, 3]);
    const patt = encodePatt(src);
    const parsed = parsePatt(patt);

    expect(parsed).toHaveLength(4);
    for (const orientation of parsed) {
      expect(orientation).toHaveLength(3);
      for (const plane of orientation) {
        expect(plane).toHaveLength(16);
        for (const row of plane) expect(row).toHaveLength(16);
      }
    }
    // Upright: the marked pixel is top-right; planes are B, G, R.
    expect(parsed[0]![0]![0]![15]).toBe(3);
    expect(parsed[0]![1]![0]![15]).toBe(2);
    expect(parsed[0]![2]![0]![15]).toBe(1);
    // Each further block is a quarter turn counter-clockwise.
    expect(parsed[1]![2]![0]![0]).toBe(1);
    expect(parsed[2]![2]![15]![0]).toBe(1);
    expect(parsed[3]![2]![15]![15]).toBe(1);
  });

  it('pads every value to three characters like the AR.js trainer does', () => {
    const lines = encodePatt(solid(PATT_SIZE, 7)).split('\n');
    expect(lines[0]).toBe(Array(16).fill('  7').join(' '));
  });

  it('encodes a real QR code end to end', () => {
    const qr = QRCode.create('https://example.org/pal/', { errorCorrectionLevel: 'M' });
    const inner = qrToRaster(qr.modules, 8);
    const parsed = parsePatt(encodePatt(inner));
    const values = parsed.flat(3);
    expect(values).toHaveLength(4 * 3 * 16 * 16);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThanOrEqual(255);
    // The quiet zone keeps the corners white in every orientation.
    for (const orientation of parsed) expect(orientation[0]![0]![0]).toBe(255);
  });
});
