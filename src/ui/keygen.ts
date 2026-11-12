import { audio } from '../audio/engine.ts';
import { EGGS, KEYGEN } from '../content/keygen.ts';
import type { WitnessEvent } from '../core/witness.ts';
import { h, prefersReducedMotion, sleep } from './dom.ts';

/** A "serial number" made from everything the player did, so every game gets its own. */
export function serialFor(events: readonly WitnessEvent[], name: string): string {
  let a = 0x811c9dc5;
  const feed = (text: string): void => {
    for (let i = 0; i < text.length; i++) {
      a ^= text.charCodeAt(i);
      a = Math.imul(a, 0x01000193) >>> 0;
    }
  };
  feed(name);
  for (const e of events) feed(`${e.scene}:${e.kind}:${e.trick ?? ''}`);
  const parts: string[] = [];
  for (let i = 0; i < 3; i++) {
    feed(String(i));
    parts.push(a.toString(16).toUpperCase().padStart(8, '0').slice(0, 4));
  }
  return `PAL-${parts.join('-')}`;
}

export interface KeygenOptions {
  readonly name: string;
  readonly events: readonly WitnessEvent[];
  /** Eggs the game saw the player find. */
  readonly found: ReadonlySet<string>;
  /** Called when the keygen closes, to put the music back. */
  readonly onClose: () => void;
}

const GLYPHS = 'アイウエオカキクケコサシスセソ0123456789PALBUG$#*+';

/** Opens the keygen outro over the whole page. Returns a function that closes it. */
export function openKeygen(opts: KeygenOptions): () => void {
  const motion = !prefersReducedMotion();
  let alive = true;
  let raf = 0;

  const rain = h('canvas', { class: 'keygen__rain', attrs: { 'aria-hidden': 'true' } });
  const serial = h('output', { class: 'keygen__serial', text: '----' });
  const generate = h('button', { class: 'keygen__btn', text: KEYGEN.generate, attrs: { type: 'button' } });
  const close = h('button', { class: 'keygen__btn', text: KEYGEN.close, attrs: { type: 'button' } });
  const score = h('p', { class: 'keygen__score', attrs: { 'aria-live': 'polite' } });
  const list = h('ul', { class: 'keygen__eggs' });
  const boxes: HTMLInputElement[] = [];
  for (const egg of EGGS) {
    const auto = opts.found.has(egg.id);
    const box = h('input', { attrs: { type: 'checkbox' } });
    box.checked = auto;
    box.disabled = auto;
    boxes.push(box);
    box.addEventListener('change', updateScore);
    list.append(h('li', {}, h('label', {}, box, ` ${egg.label}`, auto ? h('em', { text: ` ${KEYGEN.eggsAuto}` }) : '')));
  }
  function updateScore(): void {
    score.textContent = KEYGEN.eggsScore(boxes.filter((b) => b.checked).length, EGGS.length);
  }
  updateScore();

  const panel = h(
    'div',
    { class: 'keygen__panel', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': KEYGEN.title } },
    h('div', { class: 'keygen__bar' }, h('strong', { text: KEYGEN.title }), h('span', { text: KEYGEN.cracked })),
    h(
      'div',
      { class: 'keygen__form' },
      h('span', { text: `${KEYGEN.nameLabel}:` }),
      h('output', { class: 'keygen__name', text: opts.name }),
      h('span', { text: `${KEYGEN.serialLabel}:` }),
      serial,
    ),
    h('p', { class: 'keygen__note', text: KEYGEN.serialNote }),
    h('div', { class: 'keygen__row' }, generate, close),
    h('div', { class: 'keygen__scroll', attrs: { 'aria-hidden': 'true' } }, h('span', { text: KEYGEN.greetz })),
    h('h2', { class: 'keygen__h', text: KEYGEN.eggsTitle }),
    list,
    score,
  );
  const root = h('div', { class: 'keygen' }, rain, panel);
  document.body.append(root);
  generate.focus();

  const finalSerial = serialFor(opts.events, opts.name);
  generate.addEventListener('click', async () => {
    generate.disabled = true;
    const steps = motion ? 18 : 1;
    for (let i = 0; i < steps && alive; i++) {
      const hex4 = (): string => Math.floor(Math.random() * 0x10000).toString(16).toUpperCase().padStart(4, '0');
      serial.textContent = `PAL-${hex4()}-${hex4()}-${hex4()}`;
      await sleep(45);
    }
    serial.textContent = finalSerial;
    generate.disabled = false;
  });

  // Matrix rain behind the panel.
  const g = rain.getContext('2d');
  const size = 14;
  let drops: number[] = [];
  const resize = (): void => {
    rain.width = window.innerWidth;
    rain.height = window.innerHeight;
    drops = Array.from({ length: Math.ceil(rain.width / size) }, (_, i) => -((i * 7) % 30));
  };
  resize();
  window.addEventListener('resize', resize);
  let last = 0;
  const tick = (now: number): void => {
    if (!g || !alive) return;
    if (now - last > 60) {
      last = now;
      g.fillStyle = 'rgba(0, 0, 0, 0.12)';
      g.fillRect(0, 0, rain.width, rain.height);
      g.font = `${size}px monospace`;
      drops.forEach((y, i) => {
        const ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? '0';
        g.fillStyle = Math.random() < 0.08 ? '#d8ffd8' : '#28e05a';
        g.fillText(ch, i * size, y * size);
        drops[i] = y * size > rain.height && Math.random() > 0.96 ? 0 : y + 1;
      });
    }
    raf = requestAnimationFrame(tick);
  };
  if (g) {
    g.fillStyle = '#000';
    g.fillRect(0, 0, rain.width, rain.height);
  }
  if (motion) raf = requestAnimationFrame(tick);

  audio.play('keygen');

  const shut = (): void => {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    document.removeEventListener('keydown', onKey);
    root.remove();
    opts.onClose();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') shut();
  };
  document.addEventListener('keydown', onKey);
  close.addEventListener('click', shut);
  return shut;
}
