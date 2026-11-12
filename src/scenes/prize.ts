import { ASSISTANT_KINDS } from '../content/welcome.ts';
import { PRIZE, hiddenPayload } from '../content/prize.ts';
import { memoryFrom, memoryLine } from '../core/memory.ts';
import { hide } from '../core/stego.ts';
import { strongestRole, type GameScene } from '../game.ts';
import { TRICKS } from '../content/tricks.ts';
import { rankOf, scoreOf } from '../core/score.ts';
import { certificateCard, drawCertificate, type CertificateFacts } from '../ui/certificate.ts';
import { PAL_DISMISSES } from '../content/bug.ts';
import { ROLES } from '../content/roles.ts';
import { bugWarns } from '../ui/bug-cameo.ts';
import { h, prefersReducedMotion, sleep } from '../ui/dom.ts';

const SCENE = 'prize';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * The "you won!" screen right before the reveal: an absurd score, confetti,
 * a lovely certificate, and the offer to e-mail it. Nothing is ever sent —
 * the send is theatre — and the saved picture carries a hidden, harmless
 * payload in its pixels.
 */
export const prize: GameScene = {
  id: SCENE,
  mount(ctx, done) {
    const { pal, profile, stage, witness } = ctx;
    let alive = true;
    let email: string | undefined;

    const kindLabel = ASSISTANT_KINDS.find((k) => k.id === profile.assistantLook)?.label;
    const used = witness.tricksUsed().length;
    const facts: CertificateFacts = {
      name: profile.name ?? 'Ty',
      title: PRIZE.titles[strongestRole(profile)],
      assistant: profile.assistantLook ?? 'pal',
      score: scoreOf(profile.points ?? 0, used),
      rank: rankOf(used, Object.keys(TRICKS).length),
      date: new Date(),
      signature: profile.signature,
    };
    const cert = drawCertificate(facts);
    const card = certificateCard(facts);
    const scoreValue = card.querySelector<HTMLElement>('.cert__value');
    const actions = h('div', { class: 'prize__actions' });
    const status = h('p', { class: 'prize__status', attrs: { role: 'status' } });
    stage.replaceChildren(h('div', { class: 'prize' }, confetti(), card, status, actions));

    async function run(): Promise<void> {
      if (scoreValue) void countUp(scoreValue, facts.score);
      await pal.say(profile.role ? ROLES[profile.role].prize : PRIZE.cheer);
      if (!alive) return;
      await pal.tapToContinue();
      if (!alive) return;
      await pal.say(PRIZE.askEmail);
      if (!alive) return;
      askEmail();
      void bugWarns(ctx, ctx.window.el, 'prize', { side: 'right', mood: 'angry' }).then(() => {
        if (alive && email === undefined) void pal.say(PAL_DISMISSES.prize);
      });
    }

    function askEmail(): void {
      const input = h('input', {
        class: 'field',
        attrs: {
          type: 'email',
          inputmode: 'email',
          autocomplete: 'email',
          placeholder: PRIZE.emailPlaceholder,
          'aria-label': PRIZE.emailPlaceholder,
          maxlength: '80',
        },
      });
      const error = h('p', { class: 'error', attrs: { role: 'alert' } });
      const send = h('button', { class: 'btn', text: PRIZE.send, attrs: { type: 'submit' } });
      const decline = h('button', { class: 'btn btn--quiet', text: PRIZE.decline, attrs: { type: 'button' } });
      const form = h(
        'form',
        { attrs: { novalidate: '' } },
        h('div', { class: 'row' }, input, send),
        error,
        decline,
      );
      input.addEventListener('input', () => {
        error.textContent = '';
      });
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const value = input.value.trim();
        if (!EMAIL.test(value)) {
          error.textContent = PRIZE.badEmail;
          input.focus();
          return;
        }
        email = value;
        profile.email = value;
        witness.disclose(SCENE, 'real-email', 'email', value);
        void fakeSend(send);
      });
      decline.addEventListener('click', () => {
        witness.record({ scene: SCENE, kind: 'declined-email', data: {} });
        void pal.say(PRIZE.declined);
        offerSave();
      });
      actions.replaceChildren(form);
      input.focus();
    }

    // Theatre: it looks like it sends. It does not; nothing leaves the page.
    async function fakeSend(button: HTMLButtonElement): Promise<void> {
      button.disabled = true;
      button.textContent = PRIZE.sending;
      await sleep(1300);
      if (!alive) return;
      status.textContent = PRIZE.sent;
      offerSave();
    }

    function offerSave(): void {
      const save = h('button', { class: 'btn', text: PRIZE.save, attrs: { type: 'button' } });
      const go = h('button', { class: 'btn btn--quiet', text: PRIZE.go, attrs: { type: 'button' }, on: { click: done } });
      save.addEventListener('click', () => {
        saveImage();
        status.textContent = PRIZE.saved;
        save.disabled = true;
        go.focus();
      });
      actions.replaceChildren(h('div', { class: 'row' }, save, go));
      save.focus();
    }

    function saveImage(): void {
      const g = cert.getContext('2d');
      if (!g) return;
      const pixels = g.getImageData(0, 0, cert.width, cert.height);
      const memory = memoryLine(memoryFrom(witness.events, profile.name ?? '', new Date()));
      hide(pixels, hiddenPayload({ name: profile.name, assistant: profile.assistantName ?? kindLabel, email, memory }));
      g.putImageData(pixels, 0, 0);
      witness.record({ scene: SCENE, kind: 'saved-image', trick: 'stego-dropper' });
      cert.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = h('a', { attrs: { href: url, download: PRIZE.fileName } });
        document.body.append(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, 'image/png');
    }

    void run();
    return () => {
      alive = false;
      stage.replaceChildren();
    };
  },
};

/** Animates a number counting up, with Czech thousands separators. */
async function countUp(el: HTMLElement, to: number): Promise<void> {
  if (prefersReducedMotion()) {
    el.textContent = to.toLocaleString('cs-CZ');
    return;
  }
  const steps = 40;
  for (let i = 1; i <= steps; i++) {
    const eased = 1 - (1 - i / steps) ** 3;
    el.textContent = Math.round(to * eased).toLocaleString('cs-CZ');
    await sleep(30);
  }
}

function confetti(): HTMLElement {
  const box = h('div', { class: 'confetti', attrs: { 'aria-hidden': 'true' } });
  if (prefersReducedMotion()) return box;
  const colours = ['#ed93b1', '#ffd23f', '#5dcaa5', '#7fb2e5', '#afa9ec', '#ff7a45'];
  for (let i = 0; i < 36; i++) {
    const piece = h('span', { class: 'confetti__piece' });
    piece.style.left = `${(i * 37) % 100}%`;
    piece.style.background = colours[i % colours.length] ?? '#ed93b1';
    piece.style.animationDelay = `${(i % 12) * 90}ms`;
    piece.style.setProperty('--spin', `${(i * 47) % 360}deg`);
    box.append(piece);
  }
  return box;
}
