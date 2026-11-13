import type { Profile } from '../game.ts';
import { h } from './dom.ts';
import { createPalFace } from './pal-face.ts';
import { drawSprite } from './sprites.ts';

/** What the notification says while the window is minimised, and how it looks saying it. */
export const MINIMIZED_LINES: readonly { text: string; mood: 'sad' | 'happy' }[] = [
  { text: 'Nezapomněl jsi na mě?', mood: 'sad' },
  { text: 'Jsem tady!', mood: 'happy' },
  { text: 'Čekám tu na tebe.', mood: 'happy' },
  { text: 'Pojď si hrát!', mood: 'happy' },
];

/**
 * Minimising really minimises: the window drops into the taskbar, and a
 * notification pops up in the corner of the screen with PAL (or the
 * assistant) taking turns at being sad and cheerful until the player comes
 * back. A click on the notification or the taskbar button restores it.
 */
export function minimizeWindow(win: HTMLElement, screen: HTMLElement, profile: Profile): void {
  if (win.classList.contains('win--min')) return;
  win.classList.add('win--min');

  const taskbar = screen.querySelector('.pc__taskbar');
  const tab = h('button', { class: 'pc__tab', text: 'PAL', attrs: { type: 'button', 'aria-label': 'Obnovit okno PAL' } });
  taskbar?.querySelector('.pc__start')?.after(tab);

  // The face: the assistant once it is free, PAL's own face before that.
  const look = profile.bonded ? profile.assistantLook : undefined;
  let faceEl: HTMLCanvasElement;
  let setFace: (mood: 'sad' | 'happy') => void;
  let stopFace = (): void => undefined;
  if (look) {
    faceEl = h('canvas', { class: 'sprite', attrs: { width: '20', height: '20', 'aria-hidden': 'true' } });
    setFace = (mood) => drawSprite(faceEl, look, 'base', mood);
  } else {
    const face = createPalFace('happy');
    faceEl = face.el;
    setFace = (mood) => face.setMood(mood);
    stopFace = () => face.stop();
  }
  const text = h('p', { class: 'notify__text' });
  const note = h(
    'button',
    { class: 'notify', attrs: { type: 'button', 'aria-label': 'Obnovit okno PAL' } },
    h('span', { class: 'notify__face' }, faceEl),
    h('span', { class: 'notify__body' }, h('strong', { class: 'notify__who', text: profile.bonded && profile.assistantName ? profile.assistantName : 'PAL' }), text),
  );
  screen.append(note);

  let i = 0;
  const show = (): void => {
    const line = MINIMIZED_LINES[i % MINIMIZED_LINES.length];
    if (!line) return;
    text.textContent = line.text;
    setFace(line.mood);
    note.classList.remove('notify--bump');
    void note.offsetWidth;
    note.classList.add('notify--bump');
    i++;
  };
  show();
  const timer = window.setInterval(show, 3200);

  const restore = (): void => {
    window.clearInterval(timer);
    stopFace();
    note.remove();
    tab.remove();
    win.classList.remove('win--min');
  };
  note.addEventListener('click', restore);
  tab.addEventListener('click', restore);
}
