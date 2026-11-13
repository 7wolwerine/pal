import { audio } from '../audio/engine.ts';
import { KEYGEN } from '../content/keygen.ts';
import type { Scene } from '../core/director.ts';
import { collectDevice } from '../core/device.ts';
import type { GameContext } from '../game.ts';
import { h, prefersReducedMotion, sleep } from '../ui/dom.ts';
import { openKeygen } from '../ui/keygen.ts';
import { playNightmare } from '../ui/nightmare.ts';
import { readImageText } from '../ui/read-image.ts';
import { createPalFace } from '../ui/pal-face.ts';
import { buildReveal, buildTimeline } from './reveal-model.ts';

/**
 * The reveal. Always the last scene. First it replays the player's own game as
 * a cold, typed record under the dark theme; then it names every trick, shows
 * what any page can read about the device, explains the tracking pixel that
 * never got sent, and decodes the saved picture if the player drops it in.
 * It also re-skins the same window: the friendly look was never evidence.
 */
export const reveal: Scene<GameContext> = {
  id: 'reveal',
  final: true,
  mount(ctx) {
    let alive = true;
    let decoded = false;
    let closeKeygen: (() => void) | undefined;
    const model = buildReveal(ctx.witness);
    const timeline = buildTimeline(ctx.witness.events);

    ctx.setTheme('revealed');
    ctx.window.setTitle('PAL.EXE');
    ctx.window.setBadges([
      { icon: 'lock', label: 'zámeček jsem si nakreslil sám' },
      { icon: 'shield', label: 'ověřil jsem se sám' },
    ]);

    const face = createPalFace('dark');
    const replayList = h('ol', { class: 'replay__list' });
    const skip = h('button', { class: 'replay__skip', text: 'Přeskočit záznam', attrs: { type: 'button' } });
    const replay = h(
      'section',
      { class: 'replay', attrs: { 'aria-label': 'Záznam toho, co jsi udělal' } },
      h('div', { class: 'replay__head' }, h('div', { class: 'replay__face' }, face.el), h('h1', { class: 'replay__title', text: '● REC  Záznam' })),
      replayList,
      skip,
    );
    const rest = h('div', { class: 'reveal__rest' });
    rest.hidden = true;

    ctx.window.body.replaceChildren(h('article', { class: 'reveal' }, replay, rest));

    let skipping = false;
    skip.addEventListener('click', () => {
      skipping = true;
    });

    async function play(): Promise<void> {
      // First the whole game again, in the dark, the way the player played it.
      const night = import.meta.env.DEV && new URLSearchParams(location.search).has('night') ? demoEvents() : ctx.witness.events;
      await playNightmare(night, ctx.profile);
      if (!alive) return;
      const fast = prefersReducedMotion();
      for (const line of timeline) {
        if (!alive) return;
        const text = h('span', { class: 'replay__text' });
        const item = h('li', { class: 'replay__line' }, h('span', { class: 'replay__time', text: line.time }), text);
        replayList.append(item);
        if (skipping || fast) {
          text.textContent = line.text;
          continue;
        }
        for (const ch of line.text) {
          if (!alive || skipping) break;
          text.textContent += ch;
          await sleep(ch === ' ' ? 12 : 26);
        }
        text.textContent = line.text;
        // Follow the newest line inside the list only; the page itself stays put.
        replayList.scrollTop = replayList.scrollHeight;
        if (!skipping) await sleep(420);
      }
      if (!alive) return;
      if (!timeline.length) replayList.append(h('li', { class: 'replay__line', text: 'Nic. Nedotkl ses ničeho. To se nestává.' }));
      skip.remove();
      showRest();
    }

    function showRest(): void {
      rest.hidden = false;
      rest.replaceChildren(...breakdown());
      // Start reading from the top of the summary, not from its last button.
      rest.querySelector<HTMLButtonElement>('.btn')?.focus({ preventScroll: true });
      rest.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }

    function breakdown(): Node[] {
      const { seconds, clicks, windowButtons, vigilance, bugWarnings } = model.stats;

      const disclosed = h('dl');
      for (const item of model.disclosed) disclosed.append(h('dt', { text: item.label }), h('dd', { text: item.value }));

      const device = h('dl');
      for (const fact of collectDevice()) device.append(h('dt', { text: fact.label }), h('dd', { text: fact.value }));

      const tricks = h('ol');
      for (const trick of model.tricks) {
        tricks.append(
          h(
            'li',
            {},
            h('strong', { text: trick.name }),
            h('span', { text: trick.inGame }),
            trick.detail && h('div', { text: trick.detail }),
            h('div', { class: 'real', text: `V praxi: ${trick.realWorld}` }),
          ),
        );
      }

      const again = h('button', {
        class: 'btn',
        text: 'Hrát znovu',
        attrs: { type: 'button' },
        on: { click: () => location.reload() },
      });

      const keygen = h('button', {
        class: 'btn btn--keygen',
        text: KEYGEN.open,
        attrs: { type: 'button' },
        on: {
          click: () => {
            const found = new Set<string>(['keygen']);
            if (ctx.witness.events.some((e) => e.kind === 'consent' && e.data?.egg === true)) found.add('contract');
            if (decoded) found.add('stego');
            if (ctx.witness.events.some((e) => e.kind === 'ar-code')) found.add('smiley');
            closeKeygen = openKeygen({
              name: ctx.profile.name ?? 'Ty',
              events: ctx.witness.events,
              found,
              onClose: () => audio.play('dark'),
            });
          },
        },
      });

      const nodes: (Node | false)[] = [
        h('h1', { text: 'Congratz, you’ve been scammed!' }),
        h('p', { text: `Trvalo to ${seconds} s a ${clicks} kliknutí. Nic z toho jsem si nemusel brát.` }),
        h('h2', { text: 'Co o tobě vím' }),
        model.disclosed.length ? disclosed : h('p', { text: 'Nic jsi mi neřekl. Respekt.' }),
        h('h2', { text: 'Co o tobě ví každá stránka, aniž by se zeptala' }),
        device,
        h('h2', { text: 'Sledovací pixel, který jsem neposlal' }),
        h('p', {
          text: 'Kdyby ten e-mail s obrázkem opravdu odešel, stačil by v něm jeden neviditelný pixel načtený z cizího serveru. Ve chvíli, kdy bys zprávu otevřel, prozradil by tvou IP adresu a z ní přibližnou polohu, přesný čas otevření, prohlížeč a zařízení. Neodešel. Ale výš vidíš, kolik toho šlo zjistit i bez něj.',
        }),
        h('h2', { text: 'Na co to zabralo' }),
        tricks,
        windowButtons > 0 && h('p', { text: `Pokusů zavřít nebo schovat okno: ${windowButtons}. A přesto jsme tady.` }),
        h('h2', { text: 'Ten obrázek' }),
        decoder(),
        bugWarnings > 0 &&
          h('p', { text: `Brouk tě varoval ${bugWarnings}×. Pokaždé měl pravdu. A ty jsi poslouchal mě.` }),
        h('h2', { text: 'Ostražitost' }),
        h('p', {
          text:
            vigilance > 0
              ? `Body za ostražitost: ${vigilance}. Něco nesedělo a šlo se to prověřit. To dělá málokdo.`
              : 'Body za ostražitost: 0. Pár věcí nesedělo a šlo na ně sáhnout. Nikdo to neřekl nahlas.',
        }),
        h(
          'ul',
          { class: 'anomalies' },
          ...model.anomalies.map((a) =>
            h('li', { class: a.found ? 'anomalies__found' : 'anomalies__missed' }, h('span', { text: a.found ? '✓ ' : '· ' }), a.text),
          ),
        ),
        h('h2', { text: 'Pro klid duše' }),
        h('p', {
          text: 'Nic z toho neopustilo tvoje zařízení a po zavření stránky to zmizí. Nevěř mi. Otevři DevTools a podívej se na záložku Network.',
        }),
        keygen,
        again,
      ];
      return nodes.filter((n): n is Node => n !== false);
    }

    /** Drop the saved certificate back in to read what was hidden in its pixels. */
    function decoder(): HTMLElement {
      const out = h('pre', { class: 'decoder__out', attrs: { 'aria-live': 'polite' } });
      const input = h('input', { attrs: { type: 'file', accept: 'image/png', id: 'decoder-file' }, class: 'sr-only' });
      const label = h('label', { class: 'decoder__drop', attrs: { for: 'decoder-file' }, text: 'Přetáhni sem uložený obrázek, nebo klikni a vyber ho.' });
      const read = async (file: File | undefined): Promise<void> => {
        if (!file) return;
        try {
          const text = await readImageText(file);
          if (text) decoded = true;
          out.textContent = text
            ? `${text}\n\n— Tohle bylo schované v pixelech. Dropper by ten kód spustil; já ho jen ukazuju.`
            : 'V tomhle obrázku nic schovaného není.';
        } catch {
          out.textContent = 'Tenhle soubor neumím přečíst.';
        }
      };
      input.addEventListener('change', () => void read(input.files?.[0]));
      label.addEventListener('dragover', (e) => {
        e.preventDefault();
        label.classList.add('decoder__drop--over');
      });
      label.addEventListener('dragleave', () => label.classList.remove('decoder__drop--over'));
      label.addEventListener('drop', (e) => {
        e.preventDefault();
        label.classList.remove('decoder__drop--over');
        void read(e.dataTransfer?.files?.[0]);
      });
      return h(
        'div',
        { class: 'decoder' },
        h('p', { text: 'Obrázek, co sis uložil, vypadá nevinně. Ale v nejnižším bitu jeho pixelů něco nese.' }),
        input,
        label,
        out,
      );
    }

    void play();
    return () => {
      alive = false;
      closeKeygen?.();
      face.stop();
    };
  },
};

/** Development only: a made-up game, so the dark replay can be watched on its own with `?scene=reveal&night`. */
function demoEvents(): import('../core/witness.ts').WitnessEvent[] {
  const scenes = ['mailbox', 'desk', 'welcome', 'fidgets', 'paint', 'rescue', 'shelter', 'flower', 'dontclick', 'chest', 'plea', 'download', 'prize'];
  const events: import('../core/witness.ts').WitnessEvent[] = scenes.map((scene, i) => ({ seq: i, t: i * 1000, scene, kind: 'step' }));
  events.push({ seq: 90, t: 90, scene: 'rescue', kind: 'death' });
  events.push({ seq: 91, t: 91, scene: 'shelter', kind: 'shelter', data: { path: 'cave' } });
  events.push({ seq: 92, t: 92, scene: 'chest', kind: 'disclose', data: { field: 'street', value: 'Lipová' } });
  for (let i = 0; i < 4; i++) events.push({ seq: 93 + i, t: 93 + i, scene: 'dontclick', kind: 'forbidden-press' });
  return events;
}
