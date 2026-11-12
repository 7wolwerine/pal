import { h, prefersReducedMotion, sleep } from './dom.ts';
import { createPalFace, type PalFace, type PalMood } from './pal-face.ts';
import { livingSprite, setSpriteMood, type SpriteId, type SpriteMood } from './sprites.ts';

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
  /** PAL's own 16x16 face while it is still PAL; null once it becomes the assistant. */
  #face: PalFace | null;

  constructor() {
    this.#face = createPalFace('neutral');
    this.#avatar = h('div', { class: 'pal__avatar' }, this.#face.el);
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

  /** Switch the avatar to one of the cast sprites (the freed assistant). */
  setAvatar(id: SpriteId): void {
    this.#face?.stop();
    this.#face = null;
    this.#look = { id, canvas: livingSprite(id) };
    this.#avatar.replaceChildren(this.#look.canvas);
  }

  #look: { id: SpriteId; canvas: HTMLCanvasElement } | undefined;

  /** The freed assistant looks happy or sad (PAL's own face uses setMood). */
  setLookMood(mood: SpriteMood): void {
    if (this.#look) setSpriteMood(this.#look.canvas, this.#look.id, mood);
    else this.setMood(mood === 'sad' ? 'sad' : 'happy');
  }

  /** Shows a name tag under the avatar. An empty name hides it. */
  setName(name: string): void {
    this.#name.textContent = name;
    this.#name.hidden = !name;
  }

  /** PAL's own expression: before it notices you, once it does, or its true face. */
  setMood(mood: PalMood): void {
    if (!this.#face) {
      this.#face = createPalFace(mood);
      this.#avatar.replaceChildren(this.#face.el);
    } else {
      this.#face.setMood(mood);
    }
  }

  /** A one-shot four-pointed-star sparkle over the avatar, for when PAL spots you. */
  noticeYou(): void {
    if (prefersReducedMotion()) return;
    const star = h('span', { class: 'sparkle', attrs: { 'aria-hidden': 'true' } });
    star.addEventListener('animationend', () => star.remove());
    this.#avatar.append(star);
  }

  /** A "!" pops up over the avatar: PAL did not see that coming. */
  exclaim(): void {
    const bang = h('span', { class: 'pal__bang', text: '!', attrs: { 'aria-hidden': 'true' } });
    bang.addEventListener('animationend', () => bang.remove());
    (this.#avatar.parentElement ?? this.#avatar).append(bang);
    if (prefersReducedMotion()) window.setTimeout(() => bang.remove(), 900);
  }

  /** Blinks a cursor a few times, then types the line. For the very first greeting. */
  async blinkThenSay(text: string, blinks = 2): Promise<void> {
    const line = ++this.#line;
    this.#skip = false;
    this.#spoken.textContent = text;
    if (prefersReducedMotion()) {
      this.#typed.textContent = text;
      return;
    }
    for (let i = 0; i < blinks * 2; i++) {
      if (line !== this.#line) return;
      this.#typed.textContent = i % 2 === 0 ? '_' : ' ';
      await sleep(260);
    }
    await this.#type(text, line, 30);
  }

  /** Resolves on the next tap of the bubble; shows a little "tap to go on" hint. */
  tapToContinue(): Promise<void> {
    this.#bubble.classList.add('pal__bubble--tap');
    return new Promise((resolve) => {
      const onTap = (): void => {
        this.#bubble.removeEventListener('click', onTap);
        this.#bubble.classList.remove('pal__bubble--tap');
        this.#cancelTap = undefined;
        resolve();
      };
      this.#cancelTap = onTap;
      this.#bubble.addEventListener('click', onTap);
    });
  }

  /** Stops waiting for a tap (as if it happened), when something else moved the story on. */
  cancelTap(): void {
    this.#cancelTap?.();
  }

  #cancelTap: (() => void) | undefined;

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
    await this.#type(text, line, msPerChar);
  }

  /** Types `text` character by character, if this is still the current line. */
  async #type(text: string, line: number, msPerChar: number): Promise<void> {
    this.#typed.textContent = '';
    for (const char of text) {
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
