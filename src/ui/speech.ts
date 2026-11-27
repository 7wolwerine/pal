import { h, prefersReducedMotion, sleep } from './dom.ts';

export type Speaker = 'hero' | 'pal' | 'bug';

export interface SayOptions {
  /** Who is talking; sets the bubble's look. */
  readonly who?: Speaker;
  /** Wait for a click on the bubble (or the picture) before resolving. */
  readonly tap?: boolean;
  /** Keep the bubble up after resolving; otherwise it stays until the next line anyway. */
  readonly ms?: number;
  /** Hang the bubble under the speaker instead of over it. */
  readonly below?: boolean;
  /** BUG's angry scribble instead of words. */
  readonly scribble?: boolean;
}

/** Where a speaker's head is, in picture pixels; may move every frame. */
export type Anchor = () => { x: number; y: number };

/**
 * Speech bubbles that hang over the speaker inside a pixel picture, instead of
 * a caption line under it. Text types out; a click finishes the line, and a
 * second click moves on when the line waits for one.
 */
export class Speech {
  readonly #host: HTMLElement;
  readonly #w: number;
  readonly #h: number;
  readonly #bubble: HTMLElement;
  readonly #text: HTMLElement;
  #anchor: Anchor | undefined;
  #below = false;
  #line = 0;
  #skip = false;
  #tap: (() => void) | undefined;
  #frame = 0;

  /** `host` is the picture's positioned wrapper; `w`/`h` its size in picture pixels. */
  constructor(host: HTMLElement, width: number, height: number) {
    this.#host = host;
    this.#w = width;
    this.#h = height;
    this.#text = h('span');
    this.#bubble = h('div', { class: 'say', attrs: { role: 'status', 'aria-live': 'polite' } }, this.#text);
    this.#bubble.hidden = true;
    this.#bubble.addEventListener('click', (event) => {
      event.stopPropagation();
      this.advance();
    });
    // While a line waits on the bubble it is a button: Enter or Space goes on, like a click.
    this.#bubble.addEventListener('keydown', (event) => {
      if (!this.#tap || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      event.stopPropagation();
      this.advance();
    });
    host.append(this.#bubble);
    window.addEventListener('resize', this.#onResize);
  }

  /**
   * Keeps the bubble over its speaker while one is shown. It used to run for the whole life of the
   * scene, measuring the host and the bubble on every frame even with nothing to say; now it runs
   * only while a bubble is up, works from sizes measured when they can have changed, and touches
   * the page only when the bubble has actually moved.
   */
  #follow = (): void => {
    if (this.#bubble.hidden) {
      this.#frame = 0;
      return;
    }
    this.#place(false);
    this.#frame = requestAnimationFrame(this.#follow);
  };

  #track(): void {
    if (!this.#frame && !this.#bubble.hidden) this.#frame = requestAnimationFrame(this.#follow);
  }

  #onResize = (): void => this.#place();

  /** Finishes typing, or answers a waiting tap; a finished line nobody has to click away is put away by a click. */
  advance(): void {
    if (this.#tap) {
      const tap = this.#tap;
      this.#tap = undefined;
      tap();
    } else if (this.#typing) {
      this.#skip = true;
    } else {
      this.#bubble.hidden = true;
    }
  }

  /** True while a line is being typed out. */
  #typing = false;

  /** True while a line waits for a click. */
  get waiting(): boolean {
    return this.#tap !== undefined;
  }

  async say(text: string, anchor: Anchor, opts: SayOptions = {}): Promise<void> {
    const line = ++this.#line;
    this.#cancelTap();
    this.#skip = false;
    this.#typing = false;
    this.#anchor = anchor;
    this.#below = opts.below ?? false;
    const who = opts.who ?? 'hero';
    this.#bubble.className = `say say--${who}${opts.scribble ? ' say--scribble' : ''}`;
    this.#bubble.hidden = false;
    this.#bubble.setAttribute('aria-label', text);
    this.#place();
    this.#track();
    if (opts.scribble) {
      this.#text.textContent = '';
      this.#text.append(scribble());
    } else if (prefersReducedMotion()) {
      this.#text.textContent = text;
    } else {
      this.#text.textContent = '';
      this.#typing = true;
      for (const char of text) {
        if (line !== this.#line) return;
        if (this.#skip) break;
        this.#text.textContent += char;
        this.#place();
        await sleep(char === ' ' ? 12 : 26);
      }
      if (line !== this.#line) return;
      this.#typing = false;
      this.#text.textContent = text;
    }
    this.#place();
    if (opts.tap) {
      const bubble = this.#bubble;
      bubble.classList.add('say--tap');
      bubble.setAttribute('role', 'button');
      bubble.tabIndex = 0;
      await new Promise<void>((resolve) => {
        this.#tap = resolve;
        bubble.focus({ preventScroll: true });
      });
      bubble.setAttribute('role', 'status');
      bubble.removeAttribute('tabindex');
      if (line === this.#line) bubble.classList.remove('say--tap');
    } else if (opts.ms) {
      await sleep(opts.ms);
    } else {
      // A line nobody has to click away fades by itself, unless a newer one took its place.
      window.setTimeout(() => {
        if (line === this.#line && !this.#tap) this.#bubble.hidden = true;
      }, 2200 + text.length * 55);
    }
  }

  /** Hides the bubble (only if no newer line has started). */
  hide(): void {
    ++this.#line;
    this.#cancelTap();
    this.#bubble.hidden = true;
  }

  stop(): void {
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    window.removeEventListener('resize', this.#onResize);
    this.hide();
    this.#bubble.remove();
  }

  #cancelTap(): void {
    const tap = this.#tap;
    this.#tap = undefined;
    tap?.();
  }

  /** The last sizes measured, and where the bubble was last put. */
  #size = { hostW: 0, hostH: 0, bw: 0, bh: 0 };
  #at = { left: 0, top: 0, tail: 0, above: true };

  /**
   * Keeps the bubble over its speaker and inside the picture. `measure` reads the sizes again:
   * the caller does that when the text or the page can have changed, never once a frame.
   */
  #place(measure = true): void {
    if (this.#bubble.hidden || !this.#anchor) return;
    if (measure) {
      this.#size = { hostW: this.#host.clientWidth, hostH: this.#host.clientHeight, bw: this.#bubble.offsetWidth, bh: this.#bubble.offsetHeight };
    }
    const { hostW, hostH, bw, bh } = this.#size;
    const { x, y } = this.#anchor();
    if (!hostW || !hostH) return;
    const ax = (x / this.#w) * hostW;
    const ay = (y / this.#h) * hostH;
    const margin = 6;
    let left = ax - bw / 2;
    left = Math.max(margin, Math.min(hostW - bw - margin, left));
    // Above the head when there is room, otherwise below it.
    const above = !this.#below && ay - bh - 12 >= margin;
    const top = above ? ay - bh - 12 : Math.min(hostH - bh - margin, ay + 12);
    const at = { left: Math.round(left), top: Math.round(top), tail: Math.round(Math.max(14, Math.min(bw - 14, ax - left))), above };
    const was = this.#at;
    if (at.left === was.left && at.top === was.top && at.tail === was.tail && at.above === was.above) return;
    this.#at = at;
    this.#bubble.style.left = `${at.left}px`;
    this.#bubble.style.top = `${at.top}px`;
    this.#bubble.style.setProperty('--tail', `${at.tail}px`);
    this.#bubble.classList.toggle('say--below', !above);
  }
}

/** BUG's angry scribble: a tangle of strokes in a speech bubble. */
export function scribble(): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 60 22');
  svg.setAttribute('class', 'say__scribble');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(NS, 'path');
  let d = 'M4 11';
  for (let i = 0; i < 14; i++) {
    const x = 6 + i * 3.6 + Math.random() * 3;
    const y = 3 + Math.random() * 16;
    d += ` Q ${(x - 4).toFixed(1)} ${(22 - y).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2.2');
  path.setAttribute('stroke-linecap', 'round');
  svg.append(path);
  return svg;
}
