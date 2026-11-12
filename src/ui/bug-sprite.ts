/**
 * BUG, drawn at 16x16 with an outline and a shaded shell, in every mood it
 * goes through: calm, walking, panicking with its hands on its head, crying,
 * furious, and finally giving up.
 */

export const BUG_SIZE = 16;

const PALETTE: Record<string, string> = {
  k: '#2b1a16',
  H: '#5a3426',
  h: '#7a4a36',
  w: '#ffffff',
  e: '#1a0f0c',
  m: '#c0485c',
  L: '#f0b07a',
  s: '#c4703f',
  S: '#8f4a28',
  d: '#5e2e18',
  a: '#7a4a36',
  t: '#7fc4f0',
  r: '#ff8a8a',
};

export const BUG_FRAMES = {
  stand: [
    '..k..........k..',
    '...k........k...',
    '....k......k....',
    '.....kkkkkk.....',
    '....khHHHHhk....',
    '...kHwwHHwwHk...',
    '...kHweHHweHk...',
    '...kHHHmmHHHk...',
    '....kkkkkkkk....',
    '...kLLssdsssk...',
    '..kkLsssdsssSkk.',
    '.kakLsssdsssSkak',
    '...kssssdssSSk..',
    '....kSSSdSSSk...',
    '.....kak.kak....',
    '....kkak.kakk...',
  ],
  walk1: [
    '..k..........k..',
    '...k........k...',
    '....k......k....',
    '.....kkkkkk.....',
    '....khHHHHhk....',
    '...kHwwHHwwHk...',
    '...kHweHHweHk...',
    '...kHHHmmHHHk...',
    '....kkkkkkkk....',
    '...kLLssdsssk...',
    '..kkLsssdsssSkk.',
    '.kakLsssdsssSkak',
    '...kssssdssSSk..',
    '....kSSSdSSSk...',
    '....kak...kak...',
    '...kkak....kakk.',
  ],
  walk2: [
    '..k..........k..',
    '...k........k...',
    '....k......k....',
    '.....kkkkkk.....',
    '....khHHHHhk....',
    '...kHwwHHwwHk...',
    '...kHweHHweHk...',
    '...kHHHmmHHHk...',
    '....kkkkkkkk....',
    '...kLLssdsssk...',
    '..kkLsssdsssSkk.',
    '.kakLsssdsssSkak',
    '...kssssdssSSk..',
    '....kSSSdSSSk...',
    '......kakak.....',
    '.....kkakakk....',
  ],
  panic: [
    '.k............k.',
    '..k..........k..',
    '...k........k...',
    '..kak.kkkk.kak..',
    '..kakhHHHHhkak..',
    '...kHwwHHwwHk...',
    '...kHwwHHwwHk...',
    '...kHHkmmkHHk...',
    '....kkkmmkkk....',
    '...kLLssdsssk...',
    '...kLsssdsssk...',
    '...ksssdssssk...',
    '...kssssdssSk...',
    '....kSSSdSSSk...',
    '.....kak.kak....',
    '....kkak.kakk...',
  ],
  cry: [
    '....k......k....',
    '...k........k...',
    '..k..........k..',
    '.....kkkkkk.....',
    '....khHHHHhk....',
    '...kHkkHHkkHk...',
    '...kHtHHHHtHk...',
    '...kHtHmmHtHk...',
    '....ktkkkktk....',
    '...kLLssdsssk...',
    '..kkLsssdsssSkk.',
    '.kakLsssdsssSkak',
    '...kssssdssSSk..',
    '....kSSSdSSSk...',
    '.....kak.kak....',
    '....kkak.kakk...',
  ],
  angry: [
    '..k..........k..',
    '...k........k...',
    '....k......k....',
    '.kak.kkkkkk.kak.',
    '.kak.hHHHHh.kak.',
    '..kkkHHHHHHkkk..',
    '...kHweHHewHk...',
    '...kHHrmmrHHk...',
    '....kkkkkkkk....',
    '...kLLssdsssk...',
    '...kLsssdsssk...',
    '...ksssdssssk...',
    '...kssssdssSk...',
    '....kSSSdSSSk...',
    '.....kak.kak....',
    '....kkak.kakk...',
  ],
  sad: [
    '................',
    '................',
    '.k............k.',
    '..kk.kkkkkk.kk..',
    '....khHHHHhk....',
    '...kHHHHHHHHk...',
    '...kHkkHHkkHk...',
    '...kHHHkkHHHk...',
    '....kkkkkkkk....',
    '...kLLssdsssk...',
    '..kkLsssdsssSkk.',
    '.kakLsssdsssSkak',
    '...kssssdssSSk..',
    '....kSSSdSSSk...',
    '.....kak.kak....',
    '....kkak.kakk...',
  ],
} as const;

export type BugFrame = keyof typeof BUG_FRAMES;

const cache = new Map<BugFrame, HTMLCanvasElement>();

/** A cached 16x16 canvas of one frame. */
export function bugImage(frame: BugFrame): HTMLCanvasElement {
  const hit = cache.get(frame);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = BUG_SIZE;
  c.height = BUG_SIZE;
  const g = c.getContext('2d');
  if (g) {
    BUG_FRAMES[frame].forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const colour = PALETTE[row[x] ?? ''];
        if (!colour) continue;
        g.fillStyle = colour;
        g.fillRect(x, y, 1, 1);
      }
    });
  }
  cache.set(frame, c);
  return c;
}
