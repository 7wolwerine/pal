import { bugImage, type BugFrame } from './bug-sprite.ts';
import { h, prefersReducedMotion } from './dom.ts';

/** Rendered size of BUG in CSS pixels. */
export const BUG_PX = 56;

/**
 * BUG as a little actor on the panel. It scurries between spots in hopping
 * arcs, turns to face where it is going, squashes as it lands, stomps, cries,
 * panics, and talks in a bubble above its head.
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

  constructor() {
    this.#canvas = h('canvas', { class: 'bug__sprite', attrs: { width: '16', height: '16', 'aria-hidden': 'true' } });
    this.#body = h('div', { class: 'bug__body' }, this.#canvas);
    this.#flip = h('div', { class: 'bug__flip' }, this.#body);
    this.#bubble = h('div', { class: 'bug__bubble', attrs: { 'aria-live': 'assertive' } });
    this.#bubble.hidden = true;
    this.el = h('div', { class: 'bug' }, this.#bubble, this.#flip);
    // Go back to breathing once a landing squash has played.
    this.#body.addEventListener('animationend', (e) => {
      if (e.animationName === 'land') this.#body.classList.remove('bug__body--land');
    });
    this.#draw('stand');
  }

  get busy(): boolean {
    return this.#moving;
  }

  #draw(frame: BugFrame): void {
    const g = this.#canvas.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, 16, 16);
    g.drawImage(bugImage(frame), 0, 0);
  }

  #place(x: number, y: number): void {
    this.#x = x;
    this.#y = y;
    this.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  /** Puts BUG somewhere at once (no animation). */
  jump(x: number, y: number): void {
    this.#place(x, y);
  }

  say(line: string): void {
    this.#bubble.textContent = line;
    this.#bubble.hidden = !line;
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
    cancelAnimationFrame(this.#raf);
    const fromX = this.#x;
    const fromY = this.#y;
    const dist = Math.hypot(x - fromX, y - fromY);
    if (!this.#motion || dist < 2) {
      this.#place(x, y);
      return Promise.resolve();
    }
    if (Math.abs(x - fromX) > 1) this.#flip.style.transform = `scaleX(${x < fromX ? -1 : 1})`;
    const ms = Math.max(260, Math.min(720, dist * 3.2));
    const height = Math.min(30, 10 + dist * 0.12);
    const start = performance.now();
    this.#moving = true;
    return new Promise((resolve) => {
      const step = (now: number): void => {
        const u = Math.min(1, (now - start) / ms);
        const e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
        this.#place(fromX + (x - fromX) * e, fromY + (y - fromY) * e - Math.sin(Math.PI * u) * height);
        this.#draw(Math.floor(now / 90) % 2 ? 'walk1' : 'walk2');
        if (u < 1) {
          this.#raf = requestAnimationFrame(step);
          return;
        }
        this.#moving = false;
        this.#draw(this.#mood);
        this.#squash();
        resolve();
      };
      this.#raf = requestAnimationFrame(step);
    });
  }

  #squash(): void {
    this.#body.classList.remove('bug__body--land');
    void this.#body.offsetWidth;
    this.#body.classList.add('bug__body--land');
  }

  /** Little furious hops on the spot. */
  async stomp(times = 2): Promise<void> {
    this.setMood('angry');
    if (!this.#motion) return;
    for (let i = 0; i < times; i++) await this.#bounce(7, 200);
  }

  /** One small hop straight up and down on the spot, landing with a squash. */
  #bounce(height: number, ms: number): Promise<void> {
    cancelAnimationFrame(this.#raf);
    const x = this.#x;
    const y = this.#y;
    const start = performance.now();
    return new Promise((resolve) => {
      const step = (now: number): void => {
        const u = Math.min(1, (now - start) / ms);
        this.#place(x, y - Math.sin(Math.PI * u) * height);
        if (u < 1) {
          this.#raf = requestAnimationFrame(step);
          return;
        }
        this.#squash();
        resolve();
      };
      this.#raf = requestAnimationFrame(step);
    });
  }

  /** Thrown off by the player: a big spinning hop away. */
  async fling(x: number, y: number): Promise<void> {
    this.#flip.classList.add('bug__flip--spin');
    await this.moveTo(x, y);
    this.#flip.classList.remove('bug__flip--spin');
  }

  stop(): void {
    cancelAnimationFrame(this.#raf);
  }
}
