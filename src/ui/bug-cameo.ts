import { BUG_WARNINGS, type WarningScene } from '../content/bug.ts';
import type { GameContext } from '../game.ts';
import { BUG_SIZE, bugImage, type BugFrame } from './bug-sprite.ts';
import { h, prefersReducedMotion, sleep } from './dom.ts';

/** BUG warns the player (and the witness notes that it did). */
export function bugWarns(ctx: GameContext, host: HTMLElement, where: WarningScene, opts: CameoOptions = {}): Promise<void> {
  ctx.witness.record({ scene: where, kind: 'bug-warning', data: { line: BUG_WARNINGS[where] } });
  return bugCameo(host, BUG_WARNINGS[where], opts);
}

export interface CameoOptions {
  readonly side?: 'left' | 'right';
  readonly mood?: BugFrame;
  /** How long BUG stays, in ms. */
  readonly ms?: number;
}

/**
 * BUG pops in at the bottom corner of `host`, hopping up and down in
 * distress, blurts out a warning, and scurries off again. `host` must be
 * positioned. Resolves once BUG has gone.
 */
export async function bugCameo(host: HTMLElement, line: string, opts: CameoOptions = {}): Promise<void> {
  const side = opts.side ?? 'right';
  const mood = opts.mood ?? 'panic';
  const canvas = h('canvas', { class: 'cameo__sprite', attrs: { width: String(BUG_SIZE), height: String(BUG_SIZE), 'aria-hidden': 'true' } });
  const bubble = h('div', { class: 'cameo__bubble', text: line, attrs: { role: 'status' } });
  const el = h('div', { class: `cameo cameo--${side}` }, bubble, h('div', { class: 'cameo__body' }, canvas));
  const g = canvas.getContext('2d');
  const draw = (frame: BugFrame): void => {
    if (!g) return;
    g.clearRect(0, 0, BUG_SIZE, BUG_SIZE);
    g.drawImage(bugImage(frame), 0, 0);
  };
  draw('walk1');
  host.append(el);

  // Scurry in, then flap between the mood and a jump of despair.
  let frame = 0;
  const timer = prefersReducedMotion()
    ? 0
    : window.setInterval(() => {
        frame++;
        draw(mood === 'angry' ? (frame % 2 ? 'stomp1' : 'stomp2') : frame % 4 === 3 ? 'stand' : mood);
      }, 180);
  if (!timer) draw(mood);
  await sleep(opts.ms ?? 2600);
  window.clearInterval(timer);
  draw('sad');
  el.classList.add('cameo--leave');
  await sleep(prefersReducedMotion() ? 0 : 450);
  el.remove();
}
