/**
 * BUG, a little beetle who stands on two legs like a person: a round head
 * with big eyes and two antennae, a shell worn like a coat, arms that wave,
 * and feet to stamp with. Drawn from parts at 32x32 so every mood can move
 * the eyes, brows, mouth, arms, legs and antennae on its own.
 */

export const BUG_SIZE = 32;

const C = {
  k: '#2b1a16',
  head: '#4a2c22',
  headHi: '#7a4a36',
  shell: '#b5492f',
  shellHi: '#e0704a',
  shellLo: '#8a3220',
  belly: '#f2d5a0',
  bellyLo: '#d9b47a',
  limb: '#3a2018',
  white: '#ffffff',
  pupil: '#140b08',
  mouth: '#c0485c',
  cheek: '#ff9aa8',
  tear: '#7fc4f0',
  sweat: '#bfe6ff',
  dust: '#d9c9b0',
} as const;

export const BUG_FRAMES = [
  'stand',
  'walk1',
  'walk2',
  'happy',
  'panic',
  'cry',
  'angry',
  'stomp1',
  'stomp2',
  'sad',
  'effort1',
  'effort2',
] as const;

export type BugFrame = (typeof BUG_FRAMES)[number];

type G = CanvasRenderingContext2D;

function dot(g: G, colour: string, x: number, y: number, w = 1, h = 1): void {
  g.fillStyle = colour;
  g.fillRect(Math.round(x), Math.round(y), w, h);
}

function ellipse(g: G, colour: string, cx: number, cy: number, rx: number, ry: number): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const dy = (y + 0.5 - cy) / ry;
    if (Math.abs(dy) > 1) continue;
    const half = rx * Math.sqrt(1 - dy * dy);
    const x0 = Math.round(cx - half);
    const x1 = Math.round(cx + half);
    if (x1 > x0) dot(g, colour, x0, y, x1 - x0, 1);
  }
}

/** A thick line between two points, for arms, legs and antennae. */
function line(g: G, colour: string, x0: number, y0: number, x1: number, y1: number, thick = 2): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const y = y0 + ((y1 - y0) * i) / steps;
    dot(g, colour, x - (thick - 1) / 2, y - (thick - 1) / 2, thick, thick);
  }
}

type Arm = readonly [number, number];
interface Pose {
  readonly left: Arm;
  readonly right: Arm;
  readonly legs: 'stand' | 'a' | 'b' | 'lift' | 'stamp';
  readonly antennae: 'up' | 'droop' | 'zig' | 'bounce';
  readonly eyes: 'open' | 'happy' | 'angry' | 'wide' | 'sad' | 'squeeze';
  readonly mouth: 'smile' | 'grin' | 'frown' | 'o' | 'wobble' | 'teeth' | 'flat';
  readonly lean?: number;
  readonly tears?: boolean;
  readonly sweat?: boolean;
  readonly cheeks?: boolean;
  readonly dust?: boolean;
}

const POSES: Record<BugFrame, Pose> = {
  stand: { left: [6, 24], right: [26, 24], legs: 'stand', antennae: 'up', eyes: 'open', mouth: 'smile' },
  walk1: { left: [5, 22], right: [27, 25], legs: 'a', antennae: 'bounce', eyes: 'open', mouth: 'smile' },
  walk2: { left: [6, 25], right: [26, 22], legs: 'b', antennae: 'up', eyes: 'open', mouth: 'smile' },
  happy: { left: [4, 14], right: [28, 14], legs: 'stand', antennae: 'bounce', eyes: 'happy', mouth: 'grin', cheeks: true },
  panic: { left: [9, 7], right: [23, 7], legs: 'a', antennae: 'zig', eyes: 'wide', mouth: 'o' },
  cry: { left: [11, 12], right: [26, 25], legs: 'stand', antennae: 'droop', eyes: 'squeeze', mouth: 'wobble', tears: true },
  angry: { left: [5, 16], right: [27, 16], legs: 'stand', antennae: 'zig', eyes: 'angry', mouth: 'frown' },
  stomp1: { left: [6, 20], right: [27, 17], legs: 'lift', antennae: 'zig', eyes: 'angry', mouth: 'teeth' },
  stomp2: { left: [5, 22], right: [27, 21], legs: 'stamp', antennae: 'zig', eyes: 'angry', mouth: 'frown', dust: true },
  sad: { left: [8, 25], right: [24, 25], legs: 'stand', antennae: 'droop', eyes: 'sad', mouth: 'flat' },
  effort1: { left: [29, 19], right: [29, 22], legs: 'a', antennae: 'zig', eyes: 'squeeze', mouth: 'teeth', lean: 1, sweat: true },
  effort2: { left: [30, 18], right: [30, 21], legs: 'b', antennae: 'up', eyes: 'squeeze', mouth: 'teeth', lean: 2, sweat: true },
};

function paint(g: G, pose: Pose): void {
  const lean = pose.lean ?? 0;
  const hx = 16 + lean;

  // Legs and feet.
  const leg = (hipX: number, footX: number, footY: number): void => {
    line(g, C.k, hipX, 26, footX, footY - 1, 3);
    line(g, C.limb, hipX, 26, footX, footY - 1, 1);
    ellipse(g, C.k, footX + (footX < 16 ? -1 : 1), footY, 2.6, 1.6);
    ellipse(g, C.limb, footX + (footX < 16 ? -1 : 1), footY, 1.8, 1);
  };
  switch (pose.legs) {
    case 'stand':
      leg(13, 12, 30);
      leg(19, 20, 30);
      break;
    case 'a':
      leg(13, 10, 30);
      leg(19, 21, 28);
      break;
    case 'b':
      leg(13, 12, 28);
      leg(19, 22, 30);
      break;
    case 'lift':
      leg(13, 12, 30);
      leg(19, 23, 25);
      break;
    case 'stamp':
      leg(13, 12, 30);
      leg(19, 21, 30);
      break;
  }
  if (pose.dust) {
    dot(g, C.dust, 24, 29, 2, 1);
    dot(g, C.dust, 26, 28, 1, 1);
    dot(g, C.dust, 16, 30, 1, 1);
    dot(g, C.dust, 27, 30, 2, 1);
  }

  // Arms behind the body.
  const arm = (fromX: number, [x, y]: Arm): void => {
    line(g, C.k, fromX, 19, x + lean, y, 3);
    line(g, C.limb, fromX, 19, x + lean, y, 1);
    ellipse(g, C.k, x + lean, y, 1.9, 1.9);
    ellipse(g, C.limb, x + lean, y, 1.1, 1.1);
  };
  arm(10 + lean, pose.left);
  arm(22 + lean, pose.right);

  // Body: the shell worn like a coat, a striped belly in front.
  ellipse(g, C.k, hx, 21, 8, 6.5);
  ellipse(g, C.shell, hx, 21, 7, 5.6);
  ellipse(g, C.shellHi, hx - 4, 19, 1.6, 2.4);
  ellipse(g, C.shellLo, hx + 5, 23, 1.4, 2);
  ellipse(g, C.belly, hx, 22, 3.6, 4.4);
  dot(g, C.bellyLo, hx - 3, 21, 7, 1);
  dot(g, C.bellyLo, hx - 3, 24, 7, 1);

  // Antennae.
  const tip = (x: number, y: number): void => {
    ellipse(g, C.k, x, y, 1.9, 1.9);
    ellipse(g, C.shellHi, x, y, 1, 1);
  };
  switch (pose.antennae) {
    case 'up':
      line(g, C.k, hx - 4, 6, hx - 7, 1, 1);
      line(g, C.k, hx + 4, 6, hx + 7, 1, 1);
      tip(hx - 7, 1);
      tip(hx + 7, 1);
      break;
    case 'bounce':
      line(g, C.k, hx - 4, 6, hx - 6, 2, 1);
      line(g, C.k, hx + 4, 6, hx + 8, 2, 1);
      tip(hx - 6, 2);
      tip(hx + 8, 2);
      break;
    case 'droop':
      line(g, C.k, hx - 4, 6, hx - 9, 5, 1);
      line(g, C.k, hx - 9, 5, hx - 11, 8, 1);
      line(g, C.k, hx + 4, 6, hx + 9, 5, 1);
      line(g, C.k, hx + 9, 5, hx + 11, 8, 1);
      tip(hx - 11, 8);
      tip(hx + 11, 8);
      break;
    case 'zig':
      line(g, C.k, hx - 4, 6, hx - 5, 3, 1);
      line(g, C.k, hx - 5, 3, hx - 8, 2, 1);
      line(g, C.k, hx + 4, 6, hx + 5, 3, 1);
      line(g, C.k, hx + 5, 3, hx + 8, 2, 1);
      tip(hx - 8, 1);
      tip(hx + 8, 1);
      break;
  }

  // Head.
  ellipse(g, C.k, hx, 11, 9, 7);
  ellipse(g, C.head, hx, 11, 8, 6.1);
  ellipse(g, C.headHi, hx - 4, 7, 2.2, 1.2);

  // Eyes.
  const eye = (cx: number): void => {
    switch (pose.eyes) {
      case 'open':
        dot(g, C.white, cx - 2, 8, 4, 5);
        dot(g, C.pupil, cx - (cx < hx ? 0 : 1), 9, 2, 3);
        dot(g, C.white, cx - (cx < hx ? 0 : 1), 9, 1, 1);
        break;
      case 'wide':
        dot(g, C.white, cx - 2, 7, 5, 6);
        dot(g, C.pupil, cx, 9, 1, 2);
        break;
      case 'happy':
        dot(g, C.white, cx - 2, 10, 1, 1);
        dot(g, C.white, cx - 1, 9, 2, 1);
        dot(g, C.white, cx + 1, 10, 1, 1);
        break;
      case 'angry':
        dot(g, C.white, cx - 2, 9, 4, 4);
        dot(g, C.pupil, cx - 1, 10, 2, 2);
        // brows slanting down towards the middle
        if (cx < hx) line(g, C.k, cx - 3, 7, cx + 2, 9, 1);
        else line(g, C.k, cx - 2, 9, cx + 3, 7, 1);
        break;
      case 'sad':
        dot(g, C.white, cx - 2, 9, 4, 4);
        dot(g, C.pupil, cx - 1, 11, 2, 2);
        if (cx < hx) line(g, C.k, cx - 2, 8, cx + 2, 7, 1);
        else line(g, C.k, cx - 2, 7, cx + 2, 8, 1);
        break;
      case 'squeeze':
        line(g, C.white, cx - 2, 9, cx + 1, 10, 1);
        line(g, C.white, cx - 2, 11, cx + 1, 10, 1);
        break;
    }
  };
  eye(hx - 4);
  eye(hx + 4);

  // Mouth.
  const my = 14;
  switch (pose.mouth) {
    case 'smile':
      dot(g, C.mouth, hx - 2, my, 4, 1);
      dot(g, C.mouth, hx - 3, my - 1, 1, 1);
      dot(g, C.mouth, hx + 2, my - 1, 1, 1);
      break;
    case 'grin':
      dot(g, C.k, hx - 3, my - 1, 7, 3);
      dot(g, C.mouth, hx - 2, my, 5, 1);
      dot(g, C.white, hx - 2, my - 1, 5, 1);
      break;
    case 'frown':
      dot(g, C.mouth, hx - 2, my - 1, 4, 1);
      dot(g, C.mouth, hx - 3, my, 1, 1);
      dot(g, C.mouth, hx + 2, my, 1, 1);
      break;
    case 'o':
      ellipse(g, C.k, hx, my, 1.8, 1.6);
      dot(g, C.mouth, hx - 0.5, my, 1, 1);
      break;
    case 'wobble':
      dot(g, C.mouth, hx - 3, my, 1, 1);
      dot(g, C.mouth, hx - 2, my - 1, 1, 1);
      dot(g, C.mouth, hx - 1, my, 1, 1);
      dot(g, C.mouth, hx, my - 1, 1, 1);
      dot(g, C.mouth, hx + 1, my, 1, 1);
      dot(g, C.mouth, hx + 2, my - 1, 1, 1);
      break;
    case 'teeth':
      dot(g, C.k, hx - 3, my - 1, 7, 3);
      dot(g, C.white, hx - 2, my, 5, 1);
      dot(g, C.k, hx, my, 1, 1);
      break;
    case 'flat':
      dot(g, C.mouth, hx - 2, my, 4, 1);
      break;
  }
  if (pose.cheeks) {
    dot(g, C.cheek, hx - 7, 12, 2, 1);
    dot(g, C.cheek, hx + 6, 12, 2, 1);
  }
  if (pose.tears) {
    dot(g, C.tear, hx - 6, 11, 1, 6);
    dot(g, C.tear, hx + 6, 11, 1, 6);
    dot(g, C.tear, hx - 7, 16, 1, 2);
    dot(g, C.tear, hx + 7, 16, 1, 2);
  }
  if (pose.sweat) {
    dot(g, C.sweat, hx - 9, 5, 1, 2);
    dot(g, C.sweat, hx - 10, 7, 2, 2);
  }
}

const cache = new Map<BugFrame, HTMLCanvasElement>();

/** A cached 32x32 canvas of one frame. */
export function bugImage(frame: BugFrame): HTMLCanvasElement {
  const hit = cache.get(frame);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = BUG_SIZE;
  c.height = BUG_SIZE;
  const g = c.getContext('2d');
  if (g) paint(g, POSES[frame]);
  cache.set(frame, c);
  return c;
}
