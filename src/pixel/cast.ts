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

// 16 x 24 chibi with an outline and two-tone shading: hair with a highlight,
// eyes with a glint, rosy cheeks. walkA/walkB lift one foot and then the other.
const POSES = {
  stand: [
    '......kkkk......',
    '....kkhhhhkk....',
    '...khhyyhhhhk...',
    '..khhyhhhhhhhk..',
    '..khhhhhhhhhhk..',
    '.khHhsshhsshHhk.',
    '.khHssssssssHhk.',
    '.khsswesswesshk.',
    '.khsseesseesshk.',
    '.kSccssssssccSk.',
    '..kSsssmmsssSk..',
    '...kkSSSSSSkk...',
    '....ktTTTTtk....',
    '...klttttttTk...',
    '..kklttttttTkk..',
    '..kslttttttTsk..',
    '..kSktttttTkSk..',
    '...kppppppppk...',
    '...kpppPPpppk...',
    '...kpppkkpppk...',
    '...kpppkkpppk...',
    '...kPPPkkPPPk...',
    '..kooookkooook..',
    '..kkkkkkkkkkkk..',
  ],
  walkA: [
    '......kkkk......',
    '....kkhhhhkk....',
    '...khhyyhhhhk...',
    '..khhyhhhhhhhk..',
    '..khhhhhhhhhhk..',
    '.khHhsshhsshHhk.',
    '.khHssssssssHhk.',
    '.khsswesswesshk.',
    '.khsseesseesshk.',
    '.kSccssssssccSk.',
    '..kSsssmmsssSk..',
    '...kkSSSSSSkk...',
    '....ktTTTTtk....',
    '...klttttttTk...',
    '..kklttttttTkk..',
    '..kslttttttTsk..',
    '..kSktttttTkSk..',
    '...kppppppppk...',
    '...kpppPPpppk...',
    '...kpppkkpppk...',
    '...kPPPkkpppk...',
    '..kooookkPPPk...',
    '..kkkkkkkooook..',
    '........kkkkkk..',
  ],
  walkB: [
    '......kkkk......',
    '....kkhhhhkk....',
    '...khhyyhhhhk...',
    '..khhyhhhhhhhk..',
    '..khhhhhhhhhhk..',
    '.khHhsshhsshHhk.',
    '.khHssssssssHhk.',
    '.khsswesswesshk.',
    '.khsseesseesshk.',
    '.kSccssssssccSk.',
    '..kSsssmmsssSk..',
    '...kkSSSSSSkk...',
    '....ktTTTTtk....',
    '...klttttttTk...',
    '..kklttttttTkk..',
    '..kslttttttTsk..',
    '..kSktttttTkSk..',
    '...kppppppppk...',
    '...kpppPPpppk...',
    '...kpppkkpppk...',
    '...kpppkkPPPk...',
    '...kPPPkkooook..',
    '..kooookkkkkkk..',
    '..kkkkkk........',
  ],
  amazed: [
    '......kkkk......',
    '....kkhhhhkk....',
    '...khhyyhhhhk...',
    '..khhyhhhhhhhk..',
    '..khhhhhhhhhhk..',
    '.khHhsshhsshHhk.',
    '.khHssssssssHhk.',
    '.khsswesswesshk.',
    '.khsseesseesshk.',
    'ksSccssssssccSsk',
    'kskSssskksssSksk',
    '.kkkkSSSSSSkkkk.',
    '....ktTTTTtk....',
    '...klttttttTk...',
    '..kklttttttTkk..',
    '..kklttttttTkk..',
    '...kktttttTkk...',
    '...kppppppppk...',
    '...kpppPPpppk...',
    '...kpppkkpppk...',
    '...kpppkkpppk...',
    '...kPPPkkPPPk...',
    '..kooookkooook..',
    '..kkkkkkkkkkkk..',
  ],
} as const;

export type Pose = keyof typeof POSES;

export const CHARACTER_WIDTH = 16;
export const CHARACTER_HEIGHT = 24;

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
