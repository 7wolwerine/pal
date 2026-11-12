import { describe, expect, it } from 'vitest';
import { HOLE, HOLE_CENTRE, PAINTING_H, PAINTING_W, Painting, SKY, paintingRows } from '../src/scenes/paint/model.ts';

describe('Painting.fill', () => {
  it('fills only the connected area of the same colour', () => {
    const p = new Painting(['aab', 'abb', 'baa']);
    const changed = p.fill(0, 0, 'c');
    expect(changed).toHaveLength(3);
    expect(p.rows()).toEqual(['ccb', 'cbb', 'baa']);
  });

  it('does nothing on the same colour or outside the picture', () => {
    const p = new Painting(['ab']);
    expect(p.fill(0, 0, 'a')).toEqual([]);
    expect(p.fill(5, 0, 'c')).toEqual([]);
    expect(p.rows()).toEqual(['ab']);
  });

  it('does not leak diagonally', () => {
    const p = new Painting(['ab', 'ba']);
    expect(p.fill(0, 0, 'c')).toHaveLength(1);
  });
});

describe('the painting', () => {
  const rows = paintingRows();

  it('has the stated size', () => {
    expect(rows).toHaveLength(PAINTING_H);
    for (const row of rows) expect(row).toHaveLength(PAINTING_W);
  });

  it('has a hole in the sky, centred where the scene aims the keyboard fill', () => {
    const p = new Painting(rows);
    expect(p.at(...HOLE_CENTRE)).toBe(HOLE);
    expect(p.count(HOLE)).toBeGreaterThan(30);
  });

  it('closes the hole with one bucket of sky, and it all becomes sky', () => {
    const p = new Painting(rows);
    const holes = p.count(HOLE);
    const changed = p.fill(...HOLE_CENTRE, SKY);
    expect(changed).toHaveLength(holes);
    expect(p.count(HOLE)).toBe(0);
  });

  it('keeps the hole surrounded by sky only', () => {
    const p = new Painting(rows);
    for (let y = 0; y < p.height; y++) {
      for (let x = 0; x < p.width; x++) {
        if (p.at(x, y) !== HOLE) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const n = p.at(x + dx, y + dy);
          expect(n === HOLE || n === SKY).toBe(true);
        }
      }
    }
  });
});
