import { h, prefersReducedMotion, sleep } from './dom.ts';
import { livingSprite, type SpriteId } from './sprites.ts';

const GLITCH_CHARS = '▓▒░█#@%&?!';

/**
 * PAL's avatar and speech bubble. Text is typed out letter by letter; a click
 * or tap on the bubble finishes the current line at once.
 */
export class Dialogue {
  readonly el: HTMLElement;
  readonly #avatar: HTMLElement;
  readonly #name: HTMLElement;
  readonly #bubble: HTMLElement;
  readonly #typed: HTMLElement;
  readonly #spoken: HTMLElement;
  #skip = false;
  #line = 0;

  constructor(initial: SpriteId = 'pal') {
    this.#avatar = h('div', { class: 'pal__avatar' }, livingSprite(initial));
    this.#name = h('div', { class: 'pal__name' });
    this.#name.hidden = true;
    // Screen readers get the whole line at once instead of one letter at a time.
    this.#typed = h('span', { attrs: { 'aria-hidden': 'true' } });
    this.#spoken = h('span', { class: 'sr-only', attrs: { 'aria-live': 'polite' } });
    this.#bubble = h(
      'div',
      {
        class: 'pal__bubble',
        on: {
          click: () => {
            this.#skip = true;
          },
        },
      },
      this.#typed,
      this.#spoken,
    );
    this.el = h('div', { class: 'pal' }, h('div', { class: 'pal__who' }, this.#avatar, this.#name), this.#bubble);
  }

  setAvatar(id: SpriteId): void {
    this.#avatar.replaceChildren(livingSprite(id));
  }

  /** Shows a name tag under the avatar. An empty name hides it. */
  setName(name: string): void {
    this.#name.textContent = name;
    this.#name.hidden = !name;
  }

  /** Puts the avatar behind bars, or lets it out with a little jump. */
  setCaged(caged: boolean): void {
    const wasCaged = this.#avatar.classList.contains('pal__avatar--caged');
    this.#avatar.classList.toggle('pal__avatar--caged', caged);
    this.#avatar.classList.toggle('pal__avatar--freed', wasCaged && !caged);
  }

  /** Types a line into the bubble and resolves when it is fully shown. */
  async say(text: string, msPerChar = 26): Promise<void> {
    const line = ++this.#line;
    this.#skip = false;
    this.#spoken.textContent = text;
    this.#typed.textContent = '';
    if (prefersReducedMotion()) {
      this.#typed.textContent = text;
      return;
    }
    for (const char of text) {
      // A newer line took over, or the player skipped ahead.
      if (line !== this.#line) return;
      if (this.#skip) break;
      this.#typed.textContent += char;
      await sleep(char === ' ' ? msPerChar / 2 : msPerChar);
    }
    if (line === this.#line) this.#typed.textContent = text;
  }

  /** Scrambles whatever is in the bubble, then wipes it. */
  async glitch(durationMs = 520): Promise<void> {
    const line = ++this.#line;
    if (prefersReducedMotion()) {
      this.#typed.textContent = '';
      return;
    }
    const length = Math.max(8, this.#typed.textContent?.length ?? 0);
    this.#bubble.classList.add('pal__bubble--glitch');
    const until = performance.now() + durationMs;
    while (performance.now() < until && line === this.#line) {
      let noise = '';
      for (let i = 0; i < length; i++) {
        noise += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
      }
      this.#typed.textContent = noise;
      await sleep(45);
    }
    this.#bubble.classList.remove('pal__bubble--glitch');
    if (line === this.#line) this.#typed.textContent = '';
  }
}
