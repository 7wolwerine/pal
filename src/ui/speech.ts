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
    host.append(this.#bubble);
    const follow = (): void => {
      this.#place();
      this.#frame = requestAnimationFrame(follow);
    };
    this.#frame = requestAnimationFrame(follow);
  }

  /** Finishes typing, or answers a waiting tap. */
  advance(): void {
    if (this.#tap) {
      const tap = this.#tap;
      this.#tap = undefined;
      tap();
    } else {
      this.#skip = true;
    }
  }

  /** True while a line waits for a click. */
  get waiting(): boolean {
    return this.#tap !== undefined;
  }

  async say(text: string, anchor: Anchor, opts: SayOptions = {}): Promise<void> {
    const line = ++this.#line;
    this.#cancelTap();
    this.#skip = false;
    this.#anchor = anchor;
    this.#below = opts.below ?? false;
    const who = opts.who ?? 'hero';
    this.#bubble.className = `say say--${who}${opts.scribble ? ' say--scribble' : ''}`;
    this.#bubble.hidden = false;
    this.#bubble.setAttribute('aria-label', text);
    this.#place();
    if (opts.scribble) {
      this.#text.textContent = '';
      this.#text.append(scribble());
    } else if (prefersReducedMotion()) {
      this.#text.textContent = text;
    } else {
      this.#text.textContent = '';
      for (const char of text) {
        if (line !== this.#line) return;
        if (this.#skip) break;
        this.#text.textContent += char;
        this.#place();
        await sleep(char === ' ' ? 12 : 26);
      }
      if (line !== this.#line) return;
      this.#text.textContent = text;
    }
    this.#place();
    if (opts.tap) {
      this.#bubble.classList.add('say--tap');
      await new Promise<void>((resolve) => {
        this.#tap = resolve;
      });
      if (line === this.#line) this.#bubble.classList.remove('say--tap');
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
    this.hide();
    this.#bubble.remove();
  }

  #cancelTap(): void {
    const tap = this.#tap;
    this.#tap = undefined;
    tap?.();
  }

  /** Keeps the bubble over its speaker and inside the picture. */
  #place(): void {
    if (this.#bubble.hidden || !this.#anchor) return;
    const { x, y } = this.#anchor();
    const hostW = this.#host.clientWidth;
    const hostH = this.#host.clientHeight;
    if (!hostW || !hostH) return;
    const ax = (x / this.#w) * hostW;
    const ay = (y / this.#h) * hostH;
    const bw = this.#bubble.offsetWidth;
    const bh = this.#bubble.offsetHeight;
    const margin = 6;
    let left = ax - bw / 2;
    left = Math.max(margin, Math.min(hostW - bw - margin, left));
    // Above the head when there is room, otherwise below it.
    const above = !this.#below && ay - bh - 12 >= margin;
    const top = above ? ay - bh - 12 : Math.min(hostH - bh - margin, ay + 12);
    this.#bubble.style.left = `${Math.round(left)}px`;
    this.#bubble.style.top = `${Math.round(top)}px`;
    this.#bubble.style.setProperty('--tail', `${Math.round(Math.max(14, Math.min(bw - 14, ax - left)))}px`);
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
