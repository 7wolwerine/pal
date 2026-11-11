import { paintGrid } from './stage.ts';

/** Colours shared by the hand-drawn intro scenes. */
export const INK = '#3b2a3a';

const CAST_PALETTE: Record<string, string> = {
  k: INK,
  h: '#6b4a2b', // hair, boots
  s: '#f5c4b3', // skin
  t: '#5dcaa5', // jumper
  p: '#5b6bb5', // trousers
  g: '#c9c9d1', // metal
  r: '#ed93b1', // drive body
  w: '#ffffff',
  b: '#7fb2e5', // tear
};

const HEAD = ['...hhhh...', '..hhhhhh..', '..hssssh..', '..skssks..'];

const POSES = {
  stand: [
    ...HEAD,
    '..ssssss..',
    '...ssss...',
    '..tttttt..',
    '.tttttttt.',
    '.stttttts.',
    '.stttttts.',
    '..tttttt..',
    '..pppppp..',
    '..pp..pp..',
    '..pp..pp..',
    '..pp..pp..',
    '..hh..hh..',
  ],
  step: [
    ...HEAD,
    '..ssssss..',
    '...ssss...',
    '..tttttt..',
    '.tttttttt.',
    '.stttttts.',
    '.stttttts.',
    '..tttttt..',
    '..pppppp..',
    '...pppp...',
    '..pp..pp..',
    '.pp....pp.',
    '.hh....hh.',
  ],
  amazed: [
    ...HEAD,
    '..sskkss..',
    's..ssss..s',
    's.tttttt.s',
    'stttttttts',
    '..tttttt..',
    '..tttttt..',
    '..tttttt..',
    '..pppppp..',
    '..pp..pp..',
    '..pp..pp..',
    '..pp..pp..',
    '..hh..hh..',
  ],
} as const;

export type Pose = keyof typeof POSES;

export const CHARACTER_WIDTH = 10;
export const CHARACTER_HEIGHT = 16;

/** The player's character. Deliberately plain: it is whoever is playing. */
export function paintCharacter(g: CanvasRenderingContext2D, pose: Pose, x: number, y: number): void {
  paintGrid(g, POSES[pose], CAST_PALETTE, x, y);
}

const DRIVE = [
  '.gggg.',
  '.gkkg.',
  '.gggg.',
  'rrrrrr',
  'rwrrwr',
  'rwwwwr',
  'rrwwrr',
  'rrrrrr',
  'rrrrrr',
  '.rrrr.',
] as const;

export const DRIVE_WIDTH = 6;
export const DRIVE_HEIGHT = 10;

/** The flash drive with a little heart on it. */
export function paintDrive(g: CanvasRenderingContext2D, x: number, y: number, scale = 1): void {
  paintGrid(g, DRIVE, CAST_PALETTE, x, y, scale);
}

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
