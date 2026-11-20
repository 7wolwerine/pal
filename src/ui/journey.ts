import { CONSOLE } from '../content/console.ts';
import { h } from './dom.ts';

export interface Journey {
  readonly el: HTMLElement;
  /** Marks the scene the player is in; hides the path once the goal is reached. */
  show(sceneId: string): void;
  /** How many steps are left before the goal (0 at the goal). */
  left(sceneId: string): number;
  /** The console's edit mode: every heart (and the gift) becomes a button that opens its scene. */
  setEditable(on: boolean, open: (sceneId: string) => void): void;
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
  let editing = false;
  let current = -1;
  // In edit mode the path stays in sight even past the prize, so there is always a way back.
  const reveal = (): void => {
    el.hidden = !editing && (current < 0 || current > goal);
  };
  return {
    el,
    show(sceneId) {
      const at = sceneIds.indexOf(sceneId);
      current = at;
      reveal();
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
    setEditable(on, open) {
      editing = on;
      reveal();
      el.classList.toggle('journey--edit', on);
      [...hearts, gift].forEach((item, i) => {
        const id = sceneIds[i];
        if (on && id) {
          item.setAttribute('role', 'button');
          item.setAttribute('aria-hidden', 'false');
          item.setAttribute('aria-label', i < hearts.length ? CONSOLE.heart(i + 1) : CONSOLE.gift);
          item.tabIndex = 0;
          item.onclick = () => open(id);
          item.onkeydown = (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              open(id);
            }
          };
        } else {
          item.removeAttribute('role');
          item.removeAttribute('aria-label');
          item.setAttribute('aria-hidden', 'true');
          item.removeAttribute('tabindex');
          item.onclick = null;
          item.onkeydown = null;
        }
      });
    },
  };
}
