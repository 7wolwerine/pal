import { h } from '../ui/dom.ts';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export type Draw = (g: CanvasRenderingContext2D, t: number) => void;

/**
 * A small low-resolution canvas scaled up without smoothing. Scenes paint it
 * every frame. Everything the player can act on is a real button laid over
 * the picture, so the scenes work with a keyboard and a screen reader too.
 */
export class PixelStage {
  readonly el: HTMLElement;
  readonly width: number;
  readonly height: number;
  readonly #g: CanvasRenderingContext2D;
  #frame = 0;
  #startedAt: number | undefined;

  constructor(width: number, height: number, label: string) {
    this.width = width;
    this.height = height;
    const canvas = h('canvas', { class: 'scene__canvas', attrs: { role: 'img', 'aria-label': label } });
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext('2d');
    if (!g) throw new Error('Canvas 2D is not available.');
    g.imageSmoothingEnabled = false;
    this.#g = g;
    this.el = h('div', { class: 'scene' }, canvas);
    this.el.style.aspectRatio = `${width} / ${height}`;
  }

  /** Starts painting. `t` is milliseconds since the first frame. */
  run(draw: Draw): void {
    this.stop();
    const tick = (now: number): void => {
      this.#startedAt ??= now;
      draw(this.#g, now - this.#startedAt);
      this.#frame = requestAnimationFrame(tick);
    };
    this.#frame = requestAnimationFrame(tick);
  }

  stop(): void {
    cancelAnimationFrame(this.#frame);
  }

  /** A button over part of the picture, positioned in picture pixels. */
  hotspot(rect: Rect, label: string, onClick: () => void): HTMLButtonElement {
    const button = h('button', {
      class: 'scene__hotspot',
      attrs: { type: 'button', 'aria-label': label },
      on: { click: onClick },
    });
    this.#place(button, rect);
    this.el.append(button);
    return button;
  }

  /** A container over part of the picture for ordinary page content. */
  overlay(rect: Rect, className: string): HTMLElement {
    const box = h('div', { class: className });
    this.#place(box, rect);
    this.el.append(box);
    return box;
  }

  #place(el: HTMLElement, rect: Rect): void {
    el.style.left = `${(rect.x / this.width) * 100}%`;
    el.style.top = `${(rect.y / this.height) * 100}%`;
    el.style.width = `${(rect.w / this.width) * 100}%`;
    el.style.height = `${(rect.h / this.height) * 100}%`;
  }
}

/** Fills a rectangle of whole pixels. */
export function px(g: CanvasRenderingContext2D, colour: string, x: number, y: number, w: number, h: number): void {
  g.fillStyle = colour;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Paints a character grid, one palette colour per character, optionally enlarged. */
export function paintGrid(
  g: CanvasRenderingContext2D,
  rows: readonly string[],
  palette: Readonly<Record<string, string>>,
  x: number,
  y: number,
  scale = 1,
): void {
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const colour = palette[row[rx] ?? ''];
      if (colour) px(g, colour, x + rx * scale, y + ry * scale, scale, scale);
    }
  });
}

/** 0 at `from`, 1 at `to`, clamped. */
export function progress(t: number, from: number, to: number): number {
  return Math.min(1, Math.max(0, (t - from) / (to - from)));
}
