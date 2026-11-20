import { audio } from '../audio/engine.ts';
import { CONSOLE } from '../content/console.ts';
import type { Profile } from '../game.ts';
import { px } from '../pixel/stage.ts';
import { h, prefersReducedMotion } from './dom.ts';
import type { Journey } from './journey.ts';

export interface ConsoleOptions {
  /** PAL's window: the coins pour from its top edge (or from the top of the screen while it is not shown). */
  readonly window: HTMLElement;
  readonly profile: Profile;
  readonly journey: Journey;
  /** Opens a scene straight away, as the debug arrows do. */
  readonly jump: (sceneId: string) => void;
}

/**
 * The cheat console, for anyone who knows the old tricks. A semicolon opens a
 * line at the bottom of the screen; a few words do something silly:
 * `kaching` and `motherlode` pour money (and add the points), `32167` sends
 * five black dragons across the screen, and `edit` turns the hearts of the
 * path into buttons that open any scene without playing the ones before it.
 * Nothing here is recorded and nothing leaves the page.
 */
export function attachConsole(opts: ConsoleOptions): void {
  const input = h('input', {
    class: 'console__input',
    attrs: { type: 'text', autocomplete: 'off', spellcheck: 'false', maxlength: '24', 'aria-label': CONSOLE.label },
  });
  const said = h('span', { class: 'console__said', attrs: { 'aria-live': 'polite' } });
  const form = h('form', { class: 'console', attrs: { 'aria-label': CONSOLE.label } }, h('span', { class: 'console__prompt', text: '>', attrs: { 'aria-hidden': 'true' } }), input, said);
  form.hidden = true;
  document.body.append(form);
  let editing = false;
  let before: HTMLElement | null = null;

  const open = (): void => {
    before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    form.hidden = false;
    input.value = '';
    said.textContent = '';
    input.focus();
  };
  const close = (): void => {
    if (form.hidden) return;
    form.hidden = true;
    // Back to where the player was, once; a later close (a heart clicked in edit mode) leaves focus alone.
    before?.focus({ preventScroll: true });
    before = null;
  };

  document.addEventListener('keydown', (event) => {
    // Open, it closes on Escape wherever the focus has wandered off to.
    if (event.key === 'Escape' && !form.hidden) {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== ';') return;
    if (!form.hidden) {
      if (event.target !== input) {
        event.preventDefault();
        input.focus();
      }
      return;
    }
    // A semicolon typed into a field is just a semicolon.
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable)) return;
    event.preventDefault();
    open();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      // Only the console closes: the keygen (or anything else listening for Escape) stays.
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const command = input.value.trim().toLowerCase();
    input.value = '';
    said.textContent = run(command);
  });

  function run(command: string): string {
    switch (command) {
      case '':
        close();
        return '';
      case 'kaching':
        opts.profile.points = (opts.profile.points ?? 0) + 1000;
        pour(opts.window, 40, 900);
        return CONSOLE.kaching;
      case 'motherlode':
        opts.profile.points = (opts.profile.points ?? 0) + 50000;
        pour(opts.window, 420, 2600);
        return CONSOLE.motherlode;
      case '32167':
        dragons();
        return CONSOLE.dragons;
      case 'edit':
        editing = !editing;
        opts.journey.setEditable(editing, (id) => {
          close();
          opts.jump(id);
        });
        return editing ? CONSOLE.editOn : CONSOLE.editOff;
      default:
        return CONSOLE.unknown;
    }
  }
}

/** Coins pouring down from the top edge of the window, spinning as they fall. */
function pour(from: HTMLElement, count: number, overMs: number): void {
  // A minimised or hidden window pours nothing from where it was: the coins come from the top of the screen.
  const shown = from.offsetParent !== null && !from.hidden && !from.classList.contains('win--min');
  const box = shown ? from.getBoundingClientRect() : null;
  const left = box && box.width > 0 ? box.left : 0;
  const width = box && box.width > 0 ? box.width : window.innerWidth;
  const top = box && box.width > 0 ? box.top : -20;
  const motion = !prefersReducedMotion();
  const layer = h('div', { class: 'coinrain', attrs: { 'aria-hidden': 'true' } });
  document.body.append(layer);
  for (let i = 0; i < count; i++) {
    const coin = h('span', { class: 'coinrain__coin' });
    // Spread evenly but not in rows: a fixed scatter from the index, no randomness needed.
    const u = (i * 0.618034) % 1;
    coin.style.left = `${left + u * width}px`;
    coin.style.top = `${top}px`;
    coin.style.setProperty('--fall', `${window.innerHeight - top + 40}px`);
    coin.style.setProperty('--drift', `${Math.round(((i * 37) % 60) - 30)}px`);
    // When it falls is scattered independently of where (a different stride), so the coins come down all over.
    coin.style.animationDelay = `${Math.round((((i * 7919) % 1000) / 1000) * overMs)}ms`;
    coin.style.animationDuration = `${motion ? 1100 + ((i * 53) % 700) : 1}ms`;
    layer.append(coin);
  }
  const ring = Math.min(14, Math.ceil(count / 30));
  for (let i = 0; i < ring; i++) window.setTimeout(() => audio.click(88 + (i % 5), 0.25), i * (overMs / ring));
  window.setTimeout(() => layer.remove(), overMs + 2000);
}

/** A black dragon, 24 x 16, two frames: wings up, wings down. o outline, b body, d dark, e eye, w wing membrane, t teeth. */
const DRAGON: readonly (readonly string[])[] = [
  [
    '......oo........oo......',
    '.....owwo......owwo.....',
    '....owwwwo....owwwwo....',
    '...owwwwwwo..owwwwwwo...',
    '...owwwwwwwoowwwwwwwo.oo',
    '....oowwwwbbbbwwwwoo.obo',
    '......oobbbbbbbboo..obbo',
    '.oo..obbbbbbbbbbbbooobeo',
    'obboobbddddddddbbbbbbbbt',
    '.obbbbbddddddddbbbbbooo.',
    '..ooobbbbbbbbbbbbo......',
    '.....oobboooobboo.......',
    '......obo....obo........',
    '......oo.....oo.........',
    '........................',
    '........................',
  ],
  [
    '........................',
    '........................',
    '......................oo',
    '.....................obo',
    '......oobbbbbbbboo..obbo',
    '.oo..obbbbbbbbbbbbooobeo',
    'obboobbddddddddbbbbbbbbt',
    '.obbbbbddddddddbbbbbooo.',
    '..ooobbbbwwwwbbbbo......',
    '....oowwwwwwwwwwoo......',
    '...owwwwwwooowwwwwwo....',
    '...owwwwwo...owwwwwo....',
    '....owwwo.....owwwo.....',
    '.....owo.......owo......',
    '......o.........o.......',
    '........................',
  ],
];
const DRAGON_COLOURS: Record<string, string> = { o: '#000000', b: '#1c1a22', d: '#3a3542', e: '#ff3030', w: '#2a2632', t: '#f2efe6' };

let dragonSheet: string | undefined;

/** Both frames side by side, as an image the CSS can step through. */
function dragonImage(): string {
  if (dragonSheet) return dragonSheet;
  const c = document.createElement('canvas');
  c.width = 48;
  c.height = 16;
  const g = c.getContext('2d');
  if (g) {
    DRAGON.forEach((frame, f) =>
      frame.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const colour = DRAGON_COLOURS[row[x] ?? ''];
          if (colour) px(g, colour, f * 24 + x, y, 1, 1);
        }
      }),
    );
  }
  dragonSheet = c.toDataURL();
  return dragonSheet;
}

/** Five black dragons flying across the screen in a ragged line, wings beating. */
function dragons(): void {
  const motion = !prefersReducedMotion();
  const layer = h('div', { class: 'dragons', attrs: { 'aria-hidden': 'true' } });
  const image = `url(${dragonImage()})`;
  for (let i = 0; i < 5; i++) {
    const dragon = h('span', { class: 'dragons__one' });
    dragon.style.backgroundImage = image;
    dragon.style.top = `${12 + ((i * 17) % 50)}%`;
    dragon.style.animationDelay = `${i * 380}ms, ${i * 90}ms`;
    dragon.style.setProperty('--size', `${4 + (i % 3)}`);
    layer.append(dragon);
  }
  document.body.append(layer);
  if (motion) for (let i = 0; i < 5; i++) window.setTimeout(() => audio.click(30 + i * 2, 0.4), 300 + i * 380);
  window.setTimeout(() => layer.remove(), motion ? 6500 : 1500);
}
