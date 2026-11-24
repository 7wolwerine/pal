import { BUG_POKED, pickLine } from '../content/bug.ts';
import { BUG_SIZE, bugImage, type BugFrame } from './bug-sprite.ts';
import { scribble } from './speech.ts';
import { h, prefersReducedMotion } from './dom.ts';

/**
 * Rendered size of BUG in CSS pixels: three screen pixels to each of his own,
 * a little less on a phone, where the whole scene is narrower than he is used to.
 */
/**
 * BUG's size on screen, in whole multiples of his 32-pixel drawing (two, two and a half or three
 * pixels to one), picked by how wide the pictures come out on this screen: about a sixth of a
 * picture, so on a small phone he no longer hides the character and half the house.
 */
export const BUG_PX = typeof window !== 'undefined' ? bugPx(window.innerWidth, window.innerHeight) : 96;

/** How wide a pixel scene comes out (see .scenery > .scene in the styles), and BUG's size for it. */
export function bugPx(viewW: number, viewH: number): number {
  const scene = Math.min(viewW - 32, 760, (viewH - 88) * 1.6);
  return scene < 420 ? 64 : scene < 600 ? 80 : 96;
}
if (typeof document !== 'undefined') document.documentElement.style.setProperty('--bug-px', `${BUG_PX}px`);

/** How long taking off or landing takes when he is shooed, in ms. Matches bug-flyoff in the stylesheet. */
const FLIGHT_MS = 650;

/** The little turns he does to annoy whoever is watching. */
export const ANTICS = ['tongue', 'raspberry', 'turnBack', 'yawn', 'polish', 'flex', 'ignore'] as const;
export type Antic = (typeof ANTICS)[number];

/**
 * BUG as a little actor on the panel. He scurries between spots in hopping
 * arcs or flies with his wing cases open, turns to face where he is going,
 * squashes as he lands, stomps, cries, panics, sticks his tongue out, polishes
 * his shell, and talks in a bubble above his head. Poking him only offends
 * him; the third poke sends him flying off, and after a while he flies back.
 */
export class Beetle {
  readonly el: HTMLElement;
  readonly #flip: HTMLElement;
  readonly #body: HTMLElement;
  readonly #bubble: HTMLElement;
  readonly #canvas: HTMLCanvasElement;
  readonly #motion = !prefersReducedMotion();
  #x = 0;
  #y = 0;
  #mood: BugFrame = 'stand';
  #moving = false;
  #raf = 0;
  /** Lets go of whoever awaits the hop or travel in flight, should a new one cut it short. */
  #settle: (() => void) | undefined;
  #stopped = false;

  constructor() {
    this.#canvas = h('canvas', { class: 'bug__sprite', attrs: { width: String(BUG_SIZE), height: String(BUG_SIZE), 'aria-hidden': 'true' } });
    // Where a tight hit area is wanted (the resident pest), only this patch over his figure takes clicks.
    this.#body = h('div', { class: 'bug__body' }, this.#canvas, h('span', { class: 'bug__hit', attrs: { 'aria-hidden': 'true' } }));
    this.#flip = h('div', { class: 'bug__flip' }, this.#body);
    this.#bubble = h('div', { class: 'bug__bubble', attrs: { 'aria-live': 'assertive' } });
    this.#bubble.hidden = true;
    this.el = h('div', { class: 'bug' }, this.#bubble, this.#flip);
    this.#body.addEventListener('click', (event) => {
      event.stopPropagation();
      this.#poke();
    });
    // A click on what he says shuts him up (it is not a poke): the line stays gone until he says another.
    this.#bubble.addEventListener('click', (event) => {
      event.stopPropagation();
      this.#dismissed = this.#line;
      this.#bubble.hidden = true;
    });
    // Go back to breathing once a landing squash has played.
    this.#body.addEventListener('animationend', (e) => {
      if (e.animationName === 'land') this.#body.classList.remove('bug__body--land');
    });
    this.#draw('stand');
  }

  get busy(): boolean {
    return this.#moving;
  }

  /** When set, a click on BUG does this instead of the three-pokes routine. */
  onPoke: (() => void) | undefined;

  /** Told about every poke of the three-pokes routine: which one it was, and whether it sent him flying. */
  onPoked: ((n: number, flown: boolean) => void) | undefined;

  /** How many pokes it takes before he opens his wing cases and flies off. */
  pokesToShoo = 3;

  /** How long he stays away once shooed, in ms. */
  awayMs = 3500;

  /** When true, the last poke sends him off for good instead of for a while. */
  leaveWhenShooed = false;

  #pokes = 0;
  #pokeReset = 0;

  #poke(): void {
    if (this.away || this.#left) return;
    if (this.onPoke) {
      this.onPoke();
      return;
    }
    this.#pokes++;
    window.clearTimeout(this.#pokeReset);
    const n = this.#pokes;
    const flown = n >= this.pokesToShoo;
    if (flown) {
      this.#pokes = 0;
      if (this.leaveWhenShooed) void this.flyAway();
      else this.#shoo(this.awayMs, true);
    } else {
      // Left alone for a while he forgets he was poked at all.
      this.#pokeReset = window.setTimeout(() => (this.#pokes = 0), 9000);
      this.#quip(pickLine(n === 1 ? BUG_POKED.first : BUG_POKED.second), 1700);
      void (n === 1 ? this.tongue(900) : this.raspberry(1000));
    }
    this.onPoked?.(n, flown);
  }

  #awayUntil = 0;
  #left = false;
  #flap = 0;

  /** True while BUG has been shooed off and is not back yet. */
  get away(): boolean {
    return performance.now() < this.#awayUntil;
  }

  /** True once he has flown off for good. */
  get left(): boolean {
    return this.#left;
  }

  /** Opens his wing cases and flies off for a few seconds, then flies back to where he was. */
  shoo(ms = this.awayMs): void {
    this.#shoo(ms, false);
  }

  #shoo(ms: number, boast: boolean): void {
    if (this.away || this.#left) return;
    ms = Math.max(ms, FLIGHT_MS * 2 + 200);
    this.#awayUntil = performance.now() + ms;
    this.#actId++;
    this.#bubble.hidden = true;
    this.el.classList.add('bug--away');
    this.#startFlap();
    window.setTimeout(() => this.el.classList.add('bug--back'), ms - FLIGHT_MS);
    window.setTimeout(() => {
      this.el.classList.remove('bug--away', 'bug--back');
      this.#stopFlap();
      if (this.#stopped) return;
      this.#draw(this.#mood);
      this.#squash();
      this.#renderBubble();
      if (boast && this.#bubble.hidden) this.#quip(pickLine(BUG_POKED.back), 1900);
    }, ms);
  }

  /** Flies off and does not come back. Resolves once he is out of sight. */
  async flyAway(): Promise<void> {
    if (this.#left) return;
    this.#left = true;
    this.#actId++;
    this.#bubble.hidden = true;
    this.el.classList.add('bug--away');
    this.#startFlap();
    await wait(this.#motion ? FLIGHT_MS : 0);
    this.#stopFlap();
    this.el.classList.add('bug--gone');
  }

  #startFlap(): void {
    if (!this.#motion) return;
    let i = 0;
    window.clearInterval(this.#flap);
    this.#flap = window.setInterval(() => this.#paint(i++ % 2 ? 'fly1' : 'fly2'), 70);
  }

  #stopFlap(): void {
    window.clearInterval(this.#flap);
    this.#flap = 0;
  }

  /** Resolves once BUG is back from being shooed away. */
  async whenBack(): Promise<void> {
    while (this.away && !this.#stopped) await wait(120);
  }

  /** Fades him out where he stands (and back in). He takes no clicks while hidden. */
  hide(hidden = true): void {
    this.el.classList.toggle('bug--gone', hidden);
    if (hidden) this.#bubble.hidden = true;
  }

  #draw(frame: BugFrame): void {
    // While he flaps away nothing else gets to pose him.
    if (!this.#flap) this.#paint(frame);
  }

  #paint(frame: BugFrame): void {
    const g = this.#canvas.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, BUG_SIZE, BUG_SIZE);
    g.drawImage(bugImage(frame), 0, 0);
  }

  #place(x: number, y: number): void {
    this.#x = x;
    this.#y = y;
    this.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    if (!this.#bubble.hidden) this.#fitBubble();
  }

  /** Where he is, in the pixels of whatever he was appended to. */
  get position(): readonly [number, number] {
    return [this.#x, this.#y];
  }

  /** Puts BUG somewhere at once (no animation). */
  jump(x: number, y: number): void {
    this.#place(x, y);
  }

  /** Turns him to look left or right. */
  face(dir: 'left' | 'right'): void {
    this.#flip.style.transform = `scaleX(${dir === 'left' ? -1 : 1})`;
  }

  // What the scene last made him say; a quip from being poked only covers it for a moment.
  #line = '';
  #scribbled = false;
  #quipId = 0;

  #quipping = false;

  /** What the scene last made him say (a quip from being poked shows first and this comes back after it). */
  get line(): string {
    return this.#line;
  }

  /** The line the player clicked away, kept hidden until a new one comes. */
  #dismissed: string | undefined;

  say(line: string): void {
    if (line !== this.#line) this.#dismissed = undefined;
    this.#line = line;
    this.#scribbled = false;
    // A poked reaction stays readable: the scene's line takes over once it is done.
    if (!this.#quipping) this.#renderBubble();
  }

  /** An angry tangle of lines in the bubble: BUG does not like this one bit. */
  grumble(): void {
    this.#line = '';
    this.#scribbled = true;
    if (!this.#quipping) this.#renderBubble();
  }

  /** True while there are words (or a scribble) over his head. */
  get talking(): boolean {
    return !this.#bubble.hidden;
  }

  /** The bubble over his head, for whoever needs to know what it covers. */
  get bubble(): HTMLElement {
    return this.#bubble;
  }

  #renderBubble(): void {
    this.#bubble.classList.toggle('bug__bubble--scribble', this.#scribbled);
    if (this.#scribbled) this.#bubble.replaceChildren(scribble());
    else this.#bubble.textContent = this.#line;
    this.#bubble.hidden = this.away || this.#left || (!this.#scribbled && (!this.#line || this.#dismissed === this.#line));
    if (!this.#bubble.hidden) this.#fitBubble();
  }

  /** A line of his own, on top of whatever the scene had him say, gone again after `ms`. */
  #quip(line: string, ms: number): void {
    const id = ++this.#quipId;
    this.#quipping = true;
    this.#bubble.classList.remove('bug__bubble--scribble');
    this.#bubble.textContent = line;
    this.#bubble.hidden = false;
    this.#fitBubble();
    window.setTimeout(() => {
      if (id !== this.#quipId) return;
      this.#quipping = false;
      this.#renderBubble();
    }, ms);
  }

  /** Keeps the bubble inside whatever he stands in: slid sideways at an edge, hung under him at the top. */
  #fitBubble(): void {
    if (!this.el.offsetParent) return;
    // The nearest box above him that clips (the window's scrolling body, say) fences the bubble
    // in; with none, the edge of the view does.
    let clipper = this.el.parentElement;
    while (clipper) {
      const style = getComputedStyle(clipper);
      if (style.overflowX !== 'visible' || style.overflowY !== 'visible') break;
      clipper = clipper.parentElement;
    }
    const bounds = clipper && clipper !== document.body && clipper !== document.documentElement ? clipper.getBoundingClientRect() : { left: 0, right: window.innerWidth, top: 0 };
    const me = this.el.getBoundingClientRect();
    const lo = Math.max(bounds.left, 0) + 4;
    const hi = Math.min(bounds.right, window.innerWidth) - 4;
    const w = this.#bubble.offsetWidth;
    const left = me.left + me.width / 2 - w / 2;
    let shift = 0;
    if (left < lo) shift = lo - left;
    else if (left + w > hi) shift = hi - (left + w);
    // Never so far that the bubble's tail would leave him.
    const reach = Math.max(0, w / 2 - 12);
    shift = Math.max(-reach, Math.min(reach, shift));
    this.#bubble.style.setProperty('--shift', `${Math.round(shift)}px`);
    const top = me.top - 4 - this.#bubble.offsetHeight;
    this.#bubble.classList.toggle('bug__bubble--below', top < Math.max(bounds.top, 0) + 2);
  }

  /** The face and pose BUG holds while it is not walking. */
  setMood(mood: BugFrame): void {
    this.#mood = mood;
    this.#body.classList.toggle('bug__body--panic', mood === 'panic');
    this.#body.classList.toggle('bug__body--cry', mood === 'cry');
    if (!this.#moving) this.#draw(mood);
  }

  /** Scurries to (x, y) in a hopping arc. Resolves on landing. */
  moveTo(x: number, y: number): Promise<void> {
    return this.#travel(x, y, false);
  }

  /** Flies to (x, y) with his wing cases open, bobbing on the way. Resolves on landing. */
  flyTo(x: number, y: number): Promise<void> {
    return this.#travel(x, y, true);
  }

  async #travel(x: number, y: number, flying: boolean): Promise<void> {
    await this.whenBack();
    if (this.#left || this.#stopped) return;
    this.#interrupt();
    const fromX = this.#x;
    const fromY = this.#y;
    const dist = Math.hypot(x - fromX, y - fromY);
    if (!this.#motion || dist < 2) {
      this.#place(x, y);
      return;
    }
    if (Math.abs(x - fromX) > 1) this.#flip.style.transform = `scaleX(${x < fromX ? -1 : 1})`;
    const ms = flying ? Math.max(420, Math.min(1500, dist * 4.2)) : Math.max(260, Math.min(720, dist * 3.2));
    const height = flying ? Math.min(46, 16 + dist * 0.1) : Math.min(30, 10 + dist * 0.12);
    const start = performance.now();
    this.#moving = true;
    this.#actId++;
    await new Promise<void>((resolve) => {
      const settle = this.#hold(resolve);
      const step = (now: number): void => {
        const u = Math.min(1, (now - start) / ms);
        const e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
        const bob = flying ? Math.sin(u * Math.PI * 6) * 3 * Math.sin(Math.PI * u) : 0;
        this.#place(fromX + (x - fromX) * e, fromY + (y - fromY) * e - Math.sin(Math.PI * u) * height + bob);
        if (flying) this.#draw(Math.floor(now / 70) % 2 ? 'fly1' : 'fly2');
        else this.#draw(Math.floor(now / 90) % 2 ? 'walk1' : 'walk2');
        if (u < 1 && !this.#stopped) {
          this.#raf = requestAnimationFrame(step);
          return;
        }
        this.#moving = false;
        this.#draw(this.#mood);
        this.#squash();
        settle();
      };
      this.#raf = requestAnimationFrame(step);
    });
  }

  /** Walks to (x, y) in several short hops, the way he strolls about when nothing chases him. */
  async stroll(x: number, y: number, hop = 70): Promise<void> {
    const [fromX, fromY] = [this.#x, this.#y];
    const hops = Math.max(1, Math.round(Math.hypot(x - fromX, y - fromY) / hop));
    for (let i = 1; i <= hops; i++) {
      // Taken off the page mid-stroll (his scene is over): no more hops.
      if (this.#left || this.#stopped || !this.el.isConnected) return;
      await this.moveTo(fromX + ((x - fromX) * i) / hops, fromY + ((y - fromY) * i) / hops);
    }
  }

  #squash(): void {
    this.#body.classList.remove('bug__body--land');
    void this.#body.offsetWidth;
    this.#body.classList.add('bug__body--land');
  }

  /** Stamps a foot, again and again, with a little puff of dust each time. */
  async stomp(times = 2): Promise<void> {
    await this.whenBack();
    this.setMood('angry');
    if (!this.#motion) return;
    for (let i = 0; i < times; i++) {
      this.#draw('stomp1');
      await wait(150);
      this.#draw('stomp2');
      this.#squash();
      await wait(170);
    }
    this.#draw(this.#mood);
  }

  /** Strains at something for a while: leaning in, gritting its teeth, sweating. */
  async strain(ms: number): Promise<void> {
    await this.whenBack();
    if (!this.#motion) {
      await wait(ms);
      return;
    }
    const until = performance.now() + ms;
    let i = 0;
    while (performance.now() < until) {
      this.#draw(i++ % 2 ? 'effort1' : 'effort2');
      this.#body.classList.toggle('bug__body--strain', true);
      await wait(140);
    }
    this.#body.classList.remove('bug__body--strain');
    this.#draw(this.#mood);
  }

  /** A happy little hop. */
  async cheer(): Promise<void> {
    await this.whenBack();
    this.setMood('happy');
    if (this.#motion) await this.#bounce(10, 260);
  }

  #actId = 0;

  /**
   * Holds or cycles a few frames for a while, then goes back to his mood.
   * A newer act, a journey or being shooed cuts it short.
   */
  async #act(frames: readonly BugFrame[], ms: number, frameMs = 160, shake = false): Promise<void> {
    await this.whenBack();
    if (this.#left || this.#stopped) return;
    const id = ++this.#actId;
    const live = (): boolean => id === this.#actId && !this.#stopped && !this.away && !this.#left;
    if (shake && this.#motion) this.#body.classList.add('bug__body--strain');
    const until = performance.now() + ms;
    let i = 0;
    while (live() && performance.now() < until) {
      // Without motion he just holds the first frame.
      this.#draw(frames[this.#motion ? i++ % frames.length : 0] ?? 'stand');
      await wait(Math.min(frameMs, Math.max(20, until - performance.now())));
    }
    if (shake) this.#body.classList.remove('bug__body--strain');
    if (live() && !this.#moving) this.#draw(this.#mood);
  }

  /** Sticks his tongue out, thumbs at his ears. */
  tongue(ms = 1000): Promise<void> {
    return this.#act(['tongue'], ms);
  }

  /** Blows a raspberry, spraying a little. */
  raspberry(ms = 1100): Promise<void> {
    return this.#act(['raspberry1', 'raspberry2'], ms, 90, true);
  }

  /** Turns his back on the player: nothing but shell. */
  turnBack(ms = 1700): Promise<void> {
    return this.#act(['back'], ms);
  }

  /** A huge, rude yawn. */
  yawn(ms = 1300): Promise<void> {
    return this.#act(['stand', 'yawn', 'yawn', 'yawn', 'yawn'], ms, 220);
  }

  /** Nods off where he sits. */
  doze(ms = 2600): Promise<void> {
    return this.#act(['sleep1', 'sleep2'], ms, 620);
  }

  /** Polishes his shell until it glints. */
  polish(ms = 1700): Promise<void> {
    return this.#act(['polish1', 'polish2'], ms, 190);
  }

  /** Flexes his arms: look at those muscles. */
  flex(ms = 1500): Promise<void> {
    return this.#act(['flex1', 'flex2'], ms, 280);
  }

  /** Looks away and whistles, as if nobody were there. */
  ignore(ms = 1700): Promise<void> {
    return this.#act(['aloof'], ms);
  }

  /** Reaches out and pretends to press whatever is beside him. */
  press(ms = 1400): Promise<void> {
    return this.#act(['press1', 'press2'], ms, 230);
  }

  /** Apes the player: flapping hands, tongue out. */
  mimic(ms = 1500): Promise<void> {
    return this.#act(['happy', 'tongue', 'happy', 'raspberry1'], ms, 200);
  }

  /** One of his turns, picked at random (or the one asked for). Resolves when it is over. */
  async antic(which: Antic = ANTICS[Math.floor(Math.random() * ANTICS.length)] ?? 'tongue'): Promise<Antic> {
    await this[which]();
    return which;
  }

  /** One small hop straight up and down on the spot, landing with a squash. */
  #bounce(height: number, ms: number): Promise<void> {
    this.#interrupt();
    const x = this.#x;
    const y = this.#y;
    const start = performance.now();
    return new Promise((resolve) => {
      const settle = this.#hold(resolve);
      const step = (now: number): void => {
        const u = Math.min(1, (now - start) / ms);
        this.#place(x, y - Math.sin(Math.PI * u) * height);
        if (u < 1 && !this.#stopped) {
          this.#raf = requestAnimationFrame(step);
          return;
        }
        this.#squash();
        settle();
      };
      this.#raf = requestAnimationFrame(step);
    });
  }

  /** Remembers how to settle the animation starting now; the returned function settles it once. */
  #hold(resolve: () => void): () => void {
    const settle = (): void => {
      if (this.#settle === settle) this.#settle = undefined;
      resolve();
    };
    this.#settle = settle;
    return settle;
  }

  /**
   * Stops the hop or travel in flight and settles its promise, so code awaiting it
   * carries on instead of hanging, and BUG is not left marked as moving for good.
   */
  #interrupt(): void {
    cancelAnimationFrame(this.#raf);
    if (this.#moving) {
      this.#moving = false;
      this.#draw(this.#mood);
    }
    const settle = this.#settle;
    this.#settle = undefined;
    settle?.();
  }

  /** Thrown off by the player: a big spinning hop away. */
  async fling(x: number, y: number): Promise<void> {
    this.#flip.classList.add('bug__flip--spin');
    await this.moveTo(x, y);
    this.#flip.classList.remove('bug__flip--spin');
  }

  stop(): void {
    this.#stopped = true;
    this.#actId++;
    cancelAnimationFrame(this.#raf);
    window.clearTimeout(this.#pokeReset);
    this.#stopFlap();
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
