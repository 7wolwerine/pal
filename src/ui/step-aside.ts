import type { GameContext } from '../game.ts';

/**
 * When a scene needs the whole window, PAL, the conversation and the trust badges step aside,
 * and PAL's lines pop up as a bubble of their own over the top of it. `false` brings PAL back.
 */
export function stepAside(ctx: Pick<GameContext, 'pal' | 'window'>, on: boolean): void {
  const { pal } = ctx;
  const screen = ctx.window.el.parentElement;
  ctx.window.el.classList.toggle('win--focus', on);
  pal.el.classList.toggle('pal--float', on);
  if (on && screen) screen.append(pal.el);
  else if (!on && pal.el.parentElement !== ctx.window.body) ctx.window.body.prepend(pal.el);
}
