/**
 * BUG, a little beetle who stands on two legs like a person: a round head
 * with big eyes and two antennae, a shell worn like a coat, arms that wave,
 * and feet to stamp with. Drawn from parts at 32x32 so every mood can move
 * the eyes, brows, mouth, arms, legs and antennae on its own. The colours are
 * soft and pastel, like the rest of the game.
 */

export const BUG_SIZE = 32;

const C = {
  k: '#7d5a6e',
  head: '#c9a3b4',
  headHi: '#ead0d9',
  shell: '#f4a091',
  shellHi: '#ffd0c2',
  shellLo: '#dc8082',
  belly: '#fff3d6',
  bellyLo: '#f4d9a8',
  limb: '#ad8799',
  white: '#ffffff',
  pupil: '#3b2536',
  mouth: '#d9607a',
  tongue: '#ff8fab',
  tongueLo: '#e86a8c',
  cheek: '#ffb3c1',
  tear: '#8fd0f5',
  sweat: '#c9ecff',
  dust: '#e6d8c4',
  wing: '#e3f5ff',
  wingLo: '#b9def2',
  wingLine: '#8fbfe0',
  zed: '#8fb1e6',
  note: '#9a7fc4',
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
  'sit',
  'tongue',
  'raspberry1',
  'raspberry2',
  'fly1',
  'fly2',
  'back',
  'yawn',
  'sleep1',
  'sleep2',
  'polish1',
  'polish2',
  'flex1',
  'flex2',
  'aloof',
  'smug',
  'press1',
  'press2',
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
  /** Where the arm bends, for poses that need an elbow (flexing). */
  readonly leftElbow?: Arm;
  readonly rightElbow?: Arm;
  readonly legs: 'stand' | 'a' | 'b' | 'lift' | 'stamp' | 'tuck' | 'sit';
  readonly antennae: 'up' | 'droop' | 'zig' | 'bounce';
  readonly eyes: 'open' | 'happy' | 'angry' | 'wide' | 'sad' | 'squeeze' | 'side' | 'closed' | 'wink' | 'smug';
  readonly mouth: 'smile' | 'grin' | 'frown' | 'o' | 'wobble' | 'teeth' | 'flat' | 'tongue' | 'yawn' | 'whistle';
  readonly lean?: number;
  readonly tears?: boolean;
  readonly sweat?: boolean;
  readonly cheeks?: boolean;
  readonly dust?: boolean;
  /** Wing cases open, with the thin wings under them up or down. */
  readonly wings?: 'up' | 'down';
  /** Seen from behind: all shell, no face. */
  readonly back?: boolean;
  /** Droplets flying from a raspberry, in two alternating patterns. */
  readonly spit?: 1 | 2;
  /** Little z's of a nap, one or two. */
  readonly zzz?: 1 | 2;
  /** A glint on the shell he has just polished. */
  readonly shine?: 1 | 2;
  /** A whistled note: he has not seen anybody, no sir. */
  readonly note?: boolean;
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
  sit: { left: [7, 25], right: [25, 25], legs: 'sit', antennae: 'up', eyes: 'smug', mouth: 'smile' },
  tongue: { left: [5, 9], right: [27, 9], legs: 'stand', antennae: 'bounce', eyes: 'wink', mouth: 'tongue' },
  raspberry1: { left: [4, 8], right: [28, 10], legs: 'stand', antennae: 'zig', eyes: 'squeeze', mouth: 'tongue', spit: 1 },
  raspberry2: { left: [4, 10], right: [28, 8], legs: 'stand', antennae: 'bounce', eyes: 'squeeze', mouth: 'tongue', spit: 2 },
  fly1: { left: [9, 25], right: [23, 25], legs: 'tuck', antennae: 'bounce', eyes: 'open', mouth: 'grin', wings: 'up' },
  fly2: { left: [8, 24], right: [24, 24], legs: 'tuck', antennae: 'up', eyes: 'open', mouth: 'grin', wings: 'down' },
  back: { left: [7, 22], right: [25, 22], legs: 'stand', antennae: 'up', eyes: 'open', mouth: 'flat', back: true },
  yawn: { left: [14, 16], right: [26, 24], legs: 'stand', antennae: 'droop', eyes: 'squeeze', mouth: 'yawn' },
  sleep1: { left: [8, 25], right: [24, 25], legs: 'sit', antennae: 'droop', eyes: 'closed', mouth: 'flat', zzz: 1 },
  sleep2: { left: [8, 25], right: [24, 25], legs: 'sit', antennae: 'droop', eyes: 'closed', mouth: 'o', zzz: 2 },
  polish1: { left: [12, 19], right: [27, 16], legs: 'stand', antennae: 'up', eyes: 'smug', mouth: 'smile', shine: 1 },
  polish2: { left: [10, 22], right: [27, 16], legs: 'stand', antennae: 'bounce', eyes: 'smug', mouth: 'smile', shine: 2 },
  flex1: { left: [6, 11], leftElbow: [3, 17], right: [26, 11], rightElbow: [29, 17], legs: 'stand', antennae: 'up', eyes: 'smug', mouth: 'grin' },
  flex2: { left: [7, 10], leftElbow: [2, 16], right: [25, 10], rightElbow: [30, 16], legs: 'stand', antennae: 'bounce', eyes: 'happy', mouth: 'grin', cheeks: true },
  aloof: { left: [9, 24], right: [23, 24], legs: 'stand', antennae: 'up', eyes: 'side', mouth: 'whistle', note: true },
  smug: { left: [5, 16], right: [27, 16], legs: 'stand', antennae: 'up', eyes: 'smug', mouth: 'grin' },
  press1: { left: [6, 24], right: [30, 17], legs: 'stand', antennae: 'up', eyes: 'side', mouth: 'smile' },
  press2: { left: [6, 24], right: [31, 20], legs: 'stand', antennae: 'bounce', eyes: 'side', mouth: 'grin' },
};

function paint(g: G, pose: Pose): void {
  const lean = pose.lean ?? 0;
  const hx = 16 + lean;

  // Open wing cases and the thin wings under them, behind everything else.
  if (pose.wings) {
    const up = pose.wings === 'up';
    for (const side of [-1, 1] as const) {
      const wx = hx + side * 10;
      const wy = up ? 11.5 : 23.5;
      ellipse(g, C.wingLine, wx, wy, 6, 4.2);
      ellipse(g, C.wing, wx, wy, 5, 3.2);
      dot(g, C.wingLo, wx - 3, Math.floor(wy), 6, 1);
      dot(g, C.white, wx - side * 2, Math.floor(wy) - 2, 2, 1);
      // The wing case, tipped up and out.
      ellipse(g, C.k, hx + side * 10, 17.5, 3.8, 5.2);
      ellipse(g, C.shell, hx + side * 10, 17.5, 2.8, 4.2);
      dot(g, C.shellHi, hx + side * 10 - 1, 14, 1, 3);
    }
  }

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
    case 'tuck':
      leg(13, 12, 29);
      leg(19, 20, 29);
      break;
    case 'sit':
      leg(12, 7, 30);
      leg(20, 25, 30);
      break;
  }
  if (pose.dust) {
    dot(g, C.dust, 24, 29, 2, 1);
    dot(g, C.dust, 26, 28, 1, 1);
    dot(g, C.dust, 16, 30, 1, 1);
    dot(g, C.dust, 27, 30, 2, 1);
  }

  // Arms behind the body.
  const arm = (fromX: number, [x, y]: Arm, elbow?: Arm): void => {
    const ex = elbow ? elbow[0] + lean : fromX;
    const ey = elbow ? elbow[1] : 19;
    if (elbow) {
      line(g, C.k, fromX, 19, ex, ey, 3);
      line(g, C.limb, fromX, 19, ex, ey, 1);
    }
    line(g, C.k, ex, ey, x + lean, y, 3);
    line(g, C.limb, ex, ey, x + lean, y, 1);
    ellipse(g, C.k, x + lean, y, 1.9, 1.9);
    ellipse(g, C.limb, x + lean, y, 1.1, 1.1);
  };
  if (!pose.back) {
    arm(10 + lean, pose.left, pose.leftElbow);
    arm(22 + lean, pose.right, pose.rightElbow);
  }

  // Body: the shell worn like a coat, a striped belly in front.
  ellipse(g, C.k, hx, 21, 8, 6.5);
  ellipse(g, C.shell, hx, 21, 7, 5.6);
  ellipse(g, C.shellHi, hx - 4, 19, 1.6, 2.4);
  ellipse(g, C.shellLo, hx + 5, 23, 1.4, 2);
  if (pose.back) {
    // From behind there is only shell: the seam between the wing cases and a few spots.
    dot(g, C.shellLo, hx, 16, 1, 10);
    dot(g, C.shellLo, hx - 4, 23, 2, 2);
    dot(g, C.shellLo, hx + 3, 19, 2, 2);
    // Arms folded, elbows sticking out at the sides.
    arm(10, pose.left);
    arm(22, pose.right);
  } else {
    ellipse(g, C.belly, hx, 22, 3.6, 4.4);
    dot(g, C.bellyLo, hx - 3, 21, 7, 1);
    dot(g, C.bellyLo, hx - 3, 24, 7, 1);
  }
  if (pose.shine) {
    const sx = hx - 5;
    const sy = pose.shine === 1 ? 18 : 20;
    dot(g, C.white, sx - 1, sy, 3, 1);
    dot(g, C.white, sx, sy - 1, 1, 3);
    if (pose.shine === 2) dot(g, C.white, hx + 5, 18, 1, 1);
  }

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
  if (pose.back) return;

  // Eyes.
  const eye = (cx: number): void => {
    const kind = pose.eyes === 'wink' ? (cx < hx ? 'open' : 'happy') : pose.eyes;
    switch (kind) {
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
      case 'side':
        // Both eyes rolled up and away: nobody here but us beetles.
        dot(g, C.white, cx - 2, 8, 4, 5);
        dot(g, C.pupil, cx, 8, 2, 2);
        break;
      case 'closed':
        dot(g, C.k, cx - 2, 11, 4, 1);
        break;
      case 'smug':
        // Half-closed lids: very pleased with himself.
        dot(g, C.white, cx - 2, 10, 4, 3);
        dot(g, C.pupil, cx - 1, 10, 2, 2);
        dot(g, C.k, cx - 2, 9, 4, 1);
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
    case 'tongue':
      // The tongue hangs right out over the chin.
      dot(g, C.k, hx - 3, my - 1, 6, 1);
      dot(g, C.k, hx - 2, my, 4, 4);
      dot(g, C.tongue, hx - 1, my, 2, 3);
      dot(g, C.tongueLo, hx - 1, my + 2, 2, 1);
      break;
    case 'yawn':
      ellipse(g, C.k, hx, my, 3, 2.6);
      ellipse(g, C.mouth, hx, my + 0.5, 1.8, 1.4);
      break;
    case 'whistle':
      dot(g, C.k, hx + 1, my - 1, 2, 2);
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
  if (pose.spit) {
    const a = pose.spit === 1;
    dot(g, C.sweat, hx - (a ? 6 : 7), a ? 17 : 15, 1, 1);
    dot(g, C.sweat, hx + (a ? 5 : 6), a ? 15 : 17, 1, 1);
    dot(g, C.sweat, hx - (a ? 4 : 5), a ? 19 : 18, 1, 1);
    dot(g, C.sweat, hx + (a ? 4 : 3), a ? 18 : 19, 1, 1);
  }
  if (pose.zzz) {
    const zed = (x: number, y: number): void => {
      dot(g, C.zed, x, y, 3, 1);
      dot(g, C.zed, x + 1, y + 1, 1, 1);
      dot(g, C.zed, x, y + 2, 3, 1);
    };
    zed(hx + 9, 3);
    if (pose.zzz === 2) zed(hx + 12, 0);
  }
  if (pose.note) {
    dot(g, C.note, hx + 12, 6, 1, 5);
    dot(g, C.note, hx + 13, 6, 2, 1);
    dot(g, C.note, hx + 10, 10, 3, 2);
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
