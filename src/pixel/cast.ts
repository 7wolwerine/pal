import { paintGrid } from './stage.ts';

/** Colours shared by the hand-drawn intro scenes. */
export const INK = '#3b2a3a';

const CAST_PALETTE: Record<string, string> = {
  k: '#3b2a3a',
  H: '#5a3a22',
  h: '#7a5232',
  y: '#a87447',
  s: '#f8d6c0',
  S: '#e9b39c',
  e: '#2b1d24',
  w: '#ffffff',
  c: '#f4a3b4',
  m: '#9a3f52',
  t: '#5dcaa5',
  T: '#3c9b80',
  l: '#95e3c8',
  p: '#5b6bb5',
  P: '#45539a',
  o: '#4a3426',
  g: '#c9c9d1',
  r: '#ed93b1',
  b: '#7fb2e5',
};

const FACE_HAPPY = [
  '..rrrrrr..',
  '.rrrrrrrr.',
  'rrkrrrrkrr',
  'rrkrrrrkrr',
  'rrrrrrrrrr',
  'rkrrrrrrkr',
  'rrkkkkkkrr',
  '.rrrrrrrr.',
  '..rrrrrr..',
] as const;

const FACE_SAD = [
  '..rrrrrr..',
  '.rrrrrrrr.',
  'rrkrrrrkrr',
  'rrkrrrrkrr',
  'rrbrrrrrrr',
  'rrbkkkkrrr',
  'rrkrrrrkrr',
  '.rrrrrrrr.',
  '..rrrrrr..',
] as const;

/** PAL's face as it appears on the in-game monitor. */
export function paintFace(g: CanvasRenderingContext2D, sad: boolean, x: number, y: number, scale = 1): void {
  paintGrid(g, sad ? FACE_SAD : FACE_HAPPY, CAST_PALETTE, x, y, scale);
}
