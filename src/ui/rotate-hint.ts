import { h } from './dom.ts';
import { UPRIGHT_QUERY } from './upright.ts';

const TEXT = 'Na šířku je to hezčí. Otoč si telefon.';
/** How long the offer stays if it is left alone. */
const SHOW_MS = 7000;

/**
 * A pixel scene on a phone held upright comes out small: the picture is wide. Once a game, the
 * first time that happens, a quiet note offers to turn the phone. It never insists: it goes by
 * itself, on a tap, or as soon as the phone is turned. Nothing is locked; the game plays upright too.
 */
export function createRotateHint(): { offer(): void } {
  const upright = window.matchMedia(UPRIGHT_QUERY);
  let offered = false;
  return {
    offer() {
      if (offered || !upright.matches) return;
      offered = true;
      const close = h('button', { class: 'rotate-hint__x', text: '×', attrs: { type: 'button', 'aria-label': 'Zavřít' } });
      const note = h('div', { class: 'rotate-hint', attrs: { role: 'status' } }, h('span', { class: 'rotate-hint__icon', text: '↻', attrs: { 'aria-hidden': 'true' } }), h('span', { text: TEXT }), close);
      const gone = (): void => {
        window.clearTimeout(timer);
        upright.removeEventListener('change', gone);
        note.remove();
      };
      close.addEventListener('click', gone);
      upright.addEventListener('change', gone);
      const timer = window.setTimeout(gone, SHOW_MS);
      document.body.append(note);
    },
  };
}
