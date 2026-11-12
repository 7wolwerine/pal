import { paintGrid } from './stage.ts';

/** Colours shared by the hand-drawn intro scenes. */
export const INK = '#3b2a3a';

const CAST_PALETTE: Record<string, string> = {
  k: INK,
  h: '#6b4a2b', // hair, boots
  s: '#f5c4b3', // skin
  c: '#f29bb0', // cheeks
  t: '#5dcaa5', // jumper
  d: '#3c9b80', // jumper shade
  p: '#5b6bb5', // trousers
  q: '#45539a', // trouser seam
  g: '#c9c9d1', // metal
  r: '#ed93b1', // drive body
  w: '#ffffff',
  b: '#7fb2e5', // tear
};

// 14 x 20: big enough to sit right next to the mailbox and read as a person.
const HEAD = [
  '....hhhhhh....',
  '...hhhhhhhh...',
  '..hhhhhhhhhh..',
  '..hhsssssshh..',
  '..hskssssksh..',
  '..hssssssssh..',
  '...csskkssc...',
  '....ssssss....',
];

const BODY = ['...tttttttt...', '..tttttttttt..', '.sttdttttdtts.', '.stttttttttts.', '..tttttttttt..', '..pppppppppp..'];

const LEGS_STAND = ['..ppppqqpppp..', '..pppp..pppp..', '..ppp....ppp..', '..ppp....ppp..', '..hhh....hhh..', '.hhhh....hhhh.'];
const LEGS_STRIDE = ['..pppppppppp..', '.pppp....ppp..', '.ppp......ppp.', 'ppp........ppp', 'hhh........hhh', 'hhh........hhh'];
const LEGS_PASS = ['..pppppppppp..', '...pppppppp...', '....pppppp....', '....ppp.ppp...', '....hhh.hhh...', '...hhhh.hhhh..'];

const POSES = {
  stand: [...HEAD, ...BODY, ...LEGS_STAND],
  walkA: [...HEAD, ...BODY, ...LEGS_STRIDE],
  walkB: [...HEAD, ...BODY, ...LEGS_PASS],
  amazed: [
    ...HEAD.slice(0, 4),
    's.hskssssksh.s',
    's.hssssssssh.s',
    '.s.csskkssc.s.',
    '..s.ssssss.s..',
    '...tttttttt...',
    '..tttttttttt..',
    '..tttdttdttt..',
    '..tttttttttt..',
    '..tttttttttt..',
    '..pppppppppp..',
    ...LEGS_STAND,
  ],
} as const;

export type Pose = keyof typeof POSES;

export const CHARACTER_WIDTH = 14;
export const CHARACTER_HEIGHT = 20;

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
