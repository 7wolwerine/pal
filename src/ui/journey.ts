import { h } from './dom.ts';

export interface Journey {
  readonly el: HTMLElement;
  /** Marks the scene the player is in; hides the path once the goal is reached. */
  show(sceneId: string): void;
  /** How many steps are left before the goal (0 at the goal). */
  left(sceneId: string): number;
}

/**
 * A path of hearts across the top of the screen, ending in a gift: the
 * prize. Every finished scene fills a heart. The goal is always in sight,
 * and the closer it gets, the less anybody stops to ask why.
 */
export function createJourney(sceneIds: readonly string[], goalId: string): Journey {
  const goal = sceneIds.indexOf(goalId);
  const steps = sceneIds.slice(0, goal);
  const hearts = steps.map(() => h('span', { class: 'journey__heart', attrs: { 'aria-hidden': 'true' } }));
  const gift = h('span', { class: 'journey__gift', attrs: { 'aria-hidden': 'true' } });
  const el = h('div', { class: 'journey', attrs: { role: 'progressbar', 'aria-label': 'Cesta k výhře', 'aria-valuemin': '0', 'aria-valuemax': String(steps.length) } }, ...hearts, gift);
  el.hidden = true;
  return {
    el,
    show(sceneId) {
      const at = sceneIds.indexOf(sceneId);
      el.hidden = at < 0 || at > goal;
      hearts.forEach((heart, i) => {
        heart.classList.toggle('journey__heart--done', i < at);
        heart.classList.toggle('journey__heart--now', i === at);
      });
      gift.classList.toggle('journey__gift--now', at === goal);
      el.setAttribute('aria-valuenow', String(Math.max(0, at)));
    },
    left(sceneId) {
      return Math.max(0, goal - sceneIds.indexOf(sceneId));
    },
  };
}
