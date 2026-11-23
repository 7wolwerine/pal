import { audio } from '../audio/engine.ts';
import { KEYGEN } from '../content/keygen.ts';
import type { Scene } from '../core/director.ts';
import { Witness } from '../core/witness.ts';
import { collectDevice } from '../core/device.ts';
import type { GameContext } from '../game.ts';
import { h, icon, ICONS, prefersReducedMotion, sleep } from '../ui/dom.ts';
import { openKeygen } from '../ui/keygen.ts';
import { playNightmare } from '../ui/nightmare.ts';
import { readImageText } from '../ui/read-image.ts';
import { createPalFace } from '../ui/pal-face.ts';
import { buildReveal, buildTimeline, whatIKnow } from './reveal-model.ts';

/**
 * The reveal. Always the last scene. First it replays the player's own game as
 * a cold, typed record under the dark theme; then it names every trick, shows
 * what any page can read about the device, explains the tracking pixel that
 * never got sent, and decodes the saved picture if the player drops it in.
 * It also re-skins the same window: the friendly look was never evidence.
 *
 * Everything fits the width the window had all game and stays short: the
 * record types inside a small box and folds itself up when it is done, and the
 * analysis is rows and sections that unfold on demand.
 */
export const reveal: Scene<GameContext> = {
  id: 'reveal',
  final: true,
  mount(ctx) {
    let alive = true;
    let decoded = false;
    let closeKeygen: (() => void) | undefined;
    const cleanups: (() => void)[] = [];
    const params = new URLSearchParams(location.search);
    const witness = import.meta.env.DEV && (params.has('demo') || params.has('night')) ? demoWitness() : ctx.witness;
    const model = buildReveal(witness);
    const timeline = buildTimeline(witness.events);

    ctx.setTheme('revealed');
    ctx.window.setTitle('PAL.EXE');
    // The window's trust badges move into the page: they are confessed right under the record.
    ctx.window.setBadges([]);

    const face = createPalFace('dark');
    const replayList = h('ol', { class: 'replay__list replay__list--boxed', attrs: { id: 'replay-list' } });
    const count = h('p', { class: 'replay__count' });
    const skip = h('button', { class: 'replay__btn', text: 'Přeskočit', attrs: { type: 'button', 'aria-label': 'Přeskočit záznam' } });
    const foldTop = h('button', {
      class: 'replay__btn',
      attrs: { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'replay-list' },
    });
    const foldEnd = h('button', { class: 'replay__btn replay__btn--end', text: '▴ Sbalit záznam', attrs: { type: 'button' } });
    foldEnd.hidden = true;
    const replay = h(
      'section',
      { class: 'replay', attrs: { 'aria-label': 'Záznam toho, co jsi udělal' } },
      h(
        'div',
        { class: 'replay__head' },
        h('div', { class: 'replay__face' }, face.el),
        h('div', { class: 'replay__titles' }, h('h1', { class: 'replay__title', text: '● REC  Záznam' }), count),
        skip,
      ),
      replayList,
      foldEnd,
    );
    const confession = h(
      'ul',
      { class: 'reveal__badges', attrs: { 'aria-label': 'Odznaky důvěry, které tohle okno celou dobu neslo' } },
      h('li', { class: 'chip' }, icon(ICONS.lock), h('span', { text: 'zámeček jsem si nakreslil sám' })),
      h('li', { class: 'chip' }, icon(ICONS.shield), h('span', { text: 'ověřil jsem se sám' })),
    );
    const rest = h('div', { class: 'reveal__rest' });
    rest.hidden = true;

    ctx.window.body.replaceChildren(h('article', { class: 'reveal' }, replay, confession, rest));

    let skipping = false;
    skip.addEventListener('click', () => {
      skipping = true;
    });

    /** Keeps the newest line in sight inside the box; the page itself never moves. */
    const follow = (): void => {
      replayList.scrollTop = replayList.scrollHeight;
      // Older lines fade out at the top only once there is something above to fade.
      replayList.classList.toggle('replay__list--over', replayList.scrollHeight > replayList.clientHeight + 1);
    };
    const onResize = (): void => {
      if (replayList.classList.contains('replay__list--boxed')) follow();
    };
    window.addEventListener('resize', onResize);

    /** The finished record is the same small box, showing its last lines; it opens and shuts on demand. */
    function setFolded(folded: boolean, byUser = false): void {
      replayList.classList.toggle('replay__list--boxed', folded);
      foldTop.setAttribute('aria-expanded', String(!folded));
      foldTop.textContent = folded ? '▾ Rozbalit' : '▴ Sbalit';
      foldTop.setAttribute('aria-label', folded ? 'Rozbalit celý záznam' : 'Sbalit záznam');
      foldEnd.hidden = folded;
      if (folded) follow();
      if (folded && byUser) {
        // Folding from the far end must not leave the reader staring at whatever slid up from below.
        replay.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        foldTop.focus({ preventScroll: true });
      }
    }
    foldTop.addEventListener('click', () => setFolded(foldTop.getAttribute('aria-expanded') === 'true', true));
    foldEnd.addEventListener('click', () => setFolded(true, true));

    // Leaving the reveal mid-tape must not leave the dark over the next scene.
    const night = new AbortController();
    cleanups.push(() => night.abort());

    async function play(): Promise<void> {
      // First the whole game again, in the dark, the way the player played it.
      if (!(import.meta.env.DEV && params.has('demo'))) await playNightmare(witness.events, ctx.profile, night.signal);
      if (!alive) return;
      const fast = prefersReducedMotion();
      let shown = 0;
      for (const line of timeline) {
        if (!alive) return;
        const text = h('span', { class: 'replay__text' });
        const item = h('li', { class: 'replay__line' }, h('span', { class: 'replay__time', text: line.time }), text);
        replayList.append(item);
        count.textContent = `${++shown} / ${timeline.length}`;
        if (skipping || fast) {
          text.textContent = line.text;
          continue;
        }
        follow();
        for (const ch of line.text) {
          if (!alive || skipping) break;
          text.textContent += ch;
          // A line that wraps grows the list; keep its end in the box.
          follow();
          await sleep(ch === ' ' ? 12 : 26);
        }
        text.textContent = line.text;
        follow();
        if (!skipping) await sleep(420);
      }
      if (!alive) return;
      if (!timeline.length) replayList.append(h('li', { class: 'replay__line replay__line--none', text: 'Nic. Nedotkl ses ničeho. To se nestává.' }));
      count.textContent = lineCount(timeline.length);
      if (timeline.length > FOLD_FROM) {
        skip.replaceWith(foldTop);
        setFolded(true);
      } else {
        // Too short to be worth folding.
        skip.remove();
        replayList.classList.remove('replay__list--boxed');
      }
      showRest();
    }

    function showRest(): void {
      rest.hidden = false;
      rest.replaceChildren(...breakdown());
      // Everything new appears below what is already on screen. On a low screen the page then
      // moves up just enough for the tabs' bar to be in view, never past the start of what is new,
      // so the summary, "Hrát znovu" and the way into the analysis are all in the first screenful.
      rest.querySelector<HTMLButtonElement>('.btn')?.focus({ preventScroll: true });
      requestAnimationFrame(() => {
        const bar = rest.querySelector('.tabs__bar');
        if (!bar) return;
        // Clear of the music button in the bottom corner, too.
        const need = bar.getBoundingClientRect().bottom - (window.innerHeight - 64);
        const room = rest.getBoundingClientRect().top - 8;
        const by = Math.min(need, room);
        if (by > 0) window.scrollBy({ top: by, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      });
    }

    interface Tab {
      readonly label: string;
      readonly meta: string;
      /** The section's full name, said once inside its panel. */
      readonly title: string;
      readonly content: readonly (Node | false)[];
    }
    /**
     * The analysis as tabs: one section at a time in the window's own width, so
     * the page is as tall as the longest section, not all of them stacked.
     */
    function tabs(list: readonly Tab[]): HTMLElement {
      const bar = h('div', { class: 'tabs__bar', attrs: { role: 'tablist', 'aria-label': 'Rozbor hry' } });
      const buttons: HTMLButtonElement[] = [];
      const panels: HTMLElement[] = [];
      const select = (index: number, focus = false): void => {
        buttons.forEach((button, i) => {
          const on = i === index;
          button.setAttribute('aria-selected', String(on));
          button.tabIndex = on ? 0 : -1;
          const panel = panels[i];
          if (panel) panel.hidden = !on;
        });
        if (focus) buttons[index]?.focus();
        // A tab switch only changes what is below the bar: keep the bar where the reader's eye is.
        if (bar.getBoundingClientRect().top < 0) bar.scrollIntoView({ block: 'start' });
      };
      list.forEach((tab, index) => {
        const id = `reveal-tab-${index}`;
        const button = h(
          'button',
          { class: 'tabs__tab', attrs: { type: 'button', role: 'tab', id, 'aria-controls': `${id}-panel` } },
          h('span', { class: 'tabs__label', text: tab.label }),
          h('span', { class: 'tabs__meta', text: tab.meta }),
        );
        button.addEventListener('click', () => select(index));
        button.addEventListener('keydown', (e) => {
          const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          if (e.key === 'Home' || e.key === 'End') {
            e.preventDefault();
            select(e.key === 'Home' ? 0 : list.length - 1, true);
          } else if (step) {
            e.preventDefault();
            select((index + step + list.length) % list.length, true);
          }
        });
        buttons.push(button);
        bar.append(button);
        panels.push(
          h(
            'div',
            { class: 'tabs__panel', attrs: { role: 'tabpanel', id: `${id}-panel`, 'aria-labelledby': id } },
            h('h2', { class: 'tabs__title', text: tab.title }),
            ...tab.content.filter((n): n is Node => n !== false),
          ),
        );
      });
      buttons.forEach((button, i) => {
        button.setAttribute('aria-selected', String(i === 0));
        button.tabIndex = i === 0 ? 0 : -1;
      });
      panels.forEach((panel, i) => (panel.hidden = i !== 0));
      return h('section', { class: 'tabs' }, bar, ...panels);
    }

    /** Facts as small cells, three or two to a row; a long value takes the whole row. */
    function facts(items: readonly { label: string; value: string }[]): HTMLElement {
      const list = h('dl', { class: 'facts' });
      for (const item of items) {
        list.append(
          h(
            'div',
            { class: item.value.length > FULL_FACT ? 'facts__cell facts__cell--full' : item.value.length > WIDE_FACT ? 'facts__cell facts__cell--wide' : 'facts__cell' },
            h('dt', { text: item.label }),
            h('dd', { text: item.value }),
          ),
        );
      }
      return list;
    }

    /**
     * The tricks as small chips that wrap like words. Opening one unfolds its
     * whole story (what this player did, how it went in the game, how it goes in
     * practice) as a strip right under that tile's row, one at a time.
     */
    function trickList(): HTMLElement {
      const list = h('ol', { class: 'tricks' });
      const story = h('li', { class: 'trick__story', attrs: { id: 'reveal-trick-story', 'aria-live': 'polite' } });
      story.hidden = true;
      const tiles: HTMLLIElement[] = [];
      const buttons: HTMLButtonElement[] = [];
      let open = -1;

      /** The story goes after the last tile that shares the open tile's row. */
      const place = (): void => {
        const tile = tiles[open];
        if (!tile) return;
        story.remove();
        const top = tile.offsetTop;
        let last = tile;
        for (let i = open + 1; i < tiles.length; i++) {
          const next = tiles[i];
          if (!next || next.offsetTop !== top) break;
          last = next;
        }
        last.after(story);
      };

      const show = (index: number): void => {
        open = open === index ? -1 : index;
        buttons.forEach((button, i) => button.setAttribute('aria-expanded', String(i === open)));
        const trick = model.tricks[open];
        story.hidden = !trick;
        if (!trick) return;
        story.replaceChildren(
          h('h3', { class: 'trick__name', text: trick.name }),
          ...(trick.detail ? [h('p', { class: 'trick__you' }, h('b', { text: 'Ty: ' }), trick.detail)] : []),
          h('p', {}, h('b', { text: 'Ve hře: ' }), trick.inGame),
          h('p', { class: 'real' }, h('b', { text: 'V praxi: ' }), trick.realWorld),
        );
        place();
      };

      model.tricks.forEach((trick, index) => {
        const button = h(
          'button',
          { class: 'trick__head', attrs: { type: 'button', 'aria-expanded': 'false', 'aria-controls': story.id } },
          h('span', { class: 'trick__no', text: String(index + 1).padStart(2, '0'), attrs: { 'aria-hidden': 'true' } }),
          // The chip carries the short Czech name; the full one (with its textbook term) heads the story.
          h('span', { class: 'trick__what', text: shortName(trick.name), attrs: { title: trick.name } }),
          trick.detail && h('span', { class: 'trick__mine', attrs: { title: 'Tady jde o tebe', 'aria-label': 'týká se přímo tebe' } }),
        );
        button.addEventListener('click', () => show(index));
        buttons.push(button);
        const tile = h('li', { class: 'trick' }, button);
        tiles.push(tile);
        list.append(tile);
      });
      list.append(story);

      // The grid reflows with the width; the story follows its tile.
      const observer = new ResizeObserver(() => place());
      observer.observe(list);
      cleanups.push(() => observer.disconnect());

      // Open the first trick that is about this player, so it is obvious what the tiles do.
      queueMicrotask(() => show(Math.max(0, model.tricks.findIndex((t) => t.detail))));
      return h(
        'div',
        {},
        h(
          'p',
          { class: 'tricks__bar' },
          'Klikni na trik a rozbalí se. ',
          h('span', { class: 'trick__mine trick__mine--legend', attrs: { 'aria-hidden': 'true' } }),
          ' = tady jde přímo o tebe.',
        ),
        list,
      );
    }

    function breakdown(): Node[] {
      const { seconds, clicks, windowButtons, vigilance, bugWarnings } = model.stats;
      const caught = model.anomalies.filter((a) => a.found).length;
      const know = whatIKnow(witness.events);
      const device = collectDevice();

      const again = h('button', {
        class: 'btn btn--quiet',
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
            if (ctx.witness.events.some((e) => e.kind === 'vigilance' && e.data?.what === 'flower-knew')) found.add('flower');
            closeKeygen = openKeygen({
              name: ctx.profile.name ?? 'Ty',
              events: ctx.witness.events,
              found,
              onClose: () => audio.play('reveal'),
            });
          },
        },
      });

      const stat = (value: string, label: string): HTMLElement => h('li', { class: 'stats__cell' }, h('b', { text: value }), h('span', { text: label }));

      const notes: (Node | false)[] = [
        windowButtons > 0 && h('p', { class: 'reveal__note', text: `Pokusů zavřít nebo schovat okno: ${windowButtons}. A přesto jsme tady.` }),
        bugWarnings > 0 &&
          h('p', { class: 'reveal__note', text: `Brouk se ti ${bugWarnings}× postavil do cesty. Nic nevysvětloval, jen překážel. Byl tu jediný, kdo nehrál se mnou.` }),
      ];

      // What a reader needs first is all near the top: the keygen and a way to play again, the
      // summary, then the tabs of the analysis; the longer parts open inside the tabs.
      const nodes: (Node | false)[] = [
        h('div', { class: 'reveal__actions' }, keygen, again),
        h('h1', { class: 'reveal__title', text: 'Congratz, you’ve been scammed!' }),
        h('p', { class: 'reveal__lead', text: `Trvalo to ${seconds} s a ${clicks} kliknutí. Nic z toho jsem si nemusel brát.` }),
        h(
          'ul',
          { class: 'stats' },
          stat(`${seconds} s`, 'trvala hra'),
          stat(String(clicks), 'kliknutí'),
          stat(String(model.tricks.length), 'triků zabralo'),
          stat(String(model.disclosed.length), 'řekl jsi o sobě'),
          stat(`${windowButtons}×`, 'chtěl jsi odejít'),
          stat(String(vigilance), 'ostražitost (body)'),
        ),
        tabs([
          {
            label: 'Triky',
            meta: String(model.tricks.length),
            title: 'Na co to zabralo',
            content: [...notes, model.tricks.length ? trickList() : h('p', { text: 'Na nic. Žádný trik se nechytil. To se nestává.' })],
          },
          {
            label: 'O tobě',
            meta: String(model.disclosed.length),
            title: 'Co o tobě vím',
            content: [
              know.length > 0 && h('p', { class: 'reveal__know', text: know.join(' ') }),
              model.disclosed.length ? facts(model.disclosed) : h('p', { text: 'Nic jsi mi neřekl. Respekt.' }),
            ],
          },
          {
            label: 'Zařízení',
            meta: String(device.length),
            title: 'Co o tobě ví každá stránka, aniž by se zeptala',
            content: [
              facts(device),
              h('h3', { text: 'Sledovací pixel, který v e-mailu nebyl' }),
              h('p', {
                text: 'Do e-mailu s obrázkem stačilo přidat jeden neviditelný pixel načtený z cizího serveru. Ve chvíli, kdy bys zprávu otevřel, prozradil by tvou IP adresu a z ní přibližnou polohu, přesný čas otevření, prohlížeč a zařízení. Žádný tam nebyl. Ale výš vidíš, kolik toho šlo zjistit i bez něj.',
              }),
            ],
          },
          {
            label: 'Nesedělo',
            meta: `${caught}/${model.anomalies.length}`,
            title: 'Co tu nesedělo',
            content: [
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
                  h(
                    'li',
                    { class: a.found ? 'anomalies__found' : 'anomalies__missed' },
                    h('span', { class: 'anomalies__mark', text: a.found ? '✓' : '·', attrs: { 'aria-hidden': 'true' } }),
                    h('span', {}, h('span', { class: 'sr-only', text: a.found ? 'Všiml sis: ' : 'Uniklo ti: ' }), a.text),
                  ),
                ),
              ),
            ],
          },
          { label: 'Obrázek', meta: 'dekodér', title: 'Ten obrázek', content: [decoder()] },
        ]),
        h(
          'footer',
          { class: 'reveal__calm' },
          h('h2', { text: 'Pro klid duše' }),
          h('p', {
            text: ctx.witness.events.some((e) => e.kind === 'mail-sent')
              ? 'Jedinou výjimkou byl certifikát: na tvou adresu jsem poslal ten jeden dopis, o který sis řekl. Adresu nikde neukládám. Nic dalšího neopustilo tvoje zařízení a po zavření stránky to zmizí. Nevěř mi. Otevři DevTools a podívej se na záložku Network.'
              : 'Nic z toho neopustilo tvoje zařízení a po zavření stránky to zmizí. Nevěř mi. Otevři DevTools a podívej se na záložku Network.',
          }),
        ),
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
      window.removeEventListener('resize', onResize);
      closeKeygen?.();
      for (const cleanup of cleanups) cleanup();
      face.stop();
    };
  },
};

/** A record this short is shown whole; anything longer folds itself up. */
const FOLD_FROM = 3;
/** Values longer than this get a wider cell, and longer than the next one a whole row. */
const WIDE_FACT = 14;
const FULL_FACT = 40;

/** "Noha ve dveřích (foot-in-the-door)" → "Noha ve dveřích". */
function shortName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '') || name;
}

function lineCount(n: number): string {
  if (n === 0) return 'prázdný';
  return `${n} ${n === 1 ? 'řádek' : n < 5 ? 'řádky' : 'řádků'}`;
}

/** Development only: a made-up but complete game, so the reveal can be laid out and the dark replay watched on their own (`?scene=reveal&demo`, `&night`). */
function demoWitness(): Witness {
  let now = 0;
  const w = new Witness(() => now);
  const at = (seconds: number): void => {
    now += seconds * 1000;
  };
  const rec = (scene: string, kind: string, trick?: string, data?: Record<string, string | number | boolean>): void => {
    at(3);
    w.record({ scene, kind, trick, data });
  };
  rec('mailbox', 'poked', undefined, { what: 'tree' });
  rec('mailbox', 'opened-mail', 'baiting', { ms: 9000 });
  rec('desk', 'grab-flashka', 'baiting', { fromBug: true });
  rec('desk', 'plugged', 'baiting', { ms: 4000 });
  rec('desk', 'refused', undefined, { n: 1 });
  rec('desk', 'gave-in', 'guilt-trip', { refusals: 1 });
  rec('desk', 'confirmed', 'run-prompt', { refusals: 1 });
  rec('desk', 'not-in-hand', undefined, { n: 1 });
  rec('desk', 'printed-again', 'guilt-trip', { prints: 2, notInHand: 1 });
  rec('desk', 'surprise', undefined, { refusals: 1, opened: true, handheld: false, prints: 2, onPaper: true, notInHand: 1 });
  for (let n = 1; n <= 4; n++) rec('welcome', 'step', 'foot-in-the-door', { n });
  at(2);
  w.disclose('welcome', 'rapport', 'name', 'Tester', { ms: 5200 });
  w.disclose('welcome', 'role-casting', 'role', 'Zachránce');
  w.disclose('welcome', 'security-question', 'assistantKind', 'Kočka', { ms: 3100 });
  w.disclose('welcome', 'osint', 'assistantName', 'Micka');
  rec('welcome', 'vigilance', undefined, { what: 'title-flicker' });
  rec('welcome', 'window-button', undefined, { button: 'close' });
  rec('fidgets', 'first-touch', 'completion-urge', { control: 'tilt', ms: 2400 });
  rec('fidgets', 'gear-back', 'completion-urge');
  rec('fidgets', 'tidied', 'completion-urge', { round: 1, ms: 21000 });
  rec('fidgets', 'bug-warning', undefined, { line: '…' });
  rec('fidgets', 'tidied', 'sunk-cost', { round: 2, ms: 14000 });
  rec('fidgets', 'tidied', 'sunk-cost', { round: 3, ms: 12000 });
  rec('fidgets', 'beetle-overcome', 'sunk-cost', { shoves: 3, ms: 4000 });
  rec('fidgets', 'form', 'smuggled-question', { fields: 5, hints: 1, ms: 31000 });
  w.disclose('fidgets', 'smuggled-question', 'comfortFood', 'svíčková od babičky');
  rec('fidgets', 'conditioned', 'conditioning', { clicks: 14, resets: 1, ms: 18000 });
  rec('fidgets', 'consent', 'blind-consent', { words: 412, ms: 6000, egg: false, skipped: true });
  rec('fidgets', 'role', 'role-casting', { answer: 'Jasně, pomůžu' });
  rec('paint', 'filled', 'irreversible', { tool: 'brush', ms: 7400 });
  rec('paint', 'frame-fixed', 'completion-urge', { knocks: 6 });
  w.disclose('paint', 'osint', 'signature', 'Tester T.');
  rec('rescue', 'attempt', 'guilt-trip', { deaths: 0 });
  rec('rescue', 'death', undefined, { deaths: 1 });
  rec('rescue', 'death', undefined, { deaths: 2 });
  rec('rescue', 'saved', 'guilt-trip', { deaths: 2 });
  rec('shelter', 'shelter', undefined, { path: 'cave' });
  rec('shelter', 'sheltered', 'helpers-high', { path: 'cave', silly: 1, ms: 42000 });
  rec('shelter', 'stay', 'role-casting', { answer: 'Zůstanu' });
  rec('flower', 'glass-broken', undefined, { knocks: 4 });
  rec('flower', 'flower-thanks', 'knows-too-much', { ms: 16000 });
  for (let n = 1; n <= 4; n++) rec('dontclick', 'forbidden-press', 'reactance', { n });
  rec('dontclick', 'guard-off', 'us-vs-them', { presses: 4 });
  rec('chest', 'near-goal', 'goal-gradient');
  rec('chest', 'chest-open', 'small-win', { n: 1, reward: 50 });
  rec('chest', 'chest-open', 'small-win', { n: 2, reward: 120 });
  rec('chest', 'chest-open', 'variable-reward', { n: 3, reward: 5 });
  rec('chest', 'ar-code', 'camera-permission');
  rec('chest', 'gold-open', 'variable-reward', { by: 'card' });
  rec('chest', 'gold-choice', undefined, { pick: 'gold' });
  w.disclose('chest', 'security-question', 'pet', 'Rex', { pick: 'gold' });
  // PAL's polite phrase: asked seven times, obeyed six (demo only).
  for (const s of ['welcome', 'fidgets', 'shelter', 'chest', 'plea', 'download', 'prize']) rec(s, 'kindly-asked');
  for (const s of ['welcome', 'fidgets', 'shelter', 'chest', 'plea', 'download']) rec(s, 'kindly-obeyed');
  rec('plea', 'plea-opener', 'role-casting', { role: 'helper' });
  rec('plea', 'plea-refused', undefined, { n: 1 });
  rec('plea', 'plea-choice', 'romance-scam', { how: 'gave-in', refusals: 1 });
  rec('plea', 'otp-shared', 'otp-scam', { ms: 8200, item: 'klíč', price: 1 });
  rec('download', 'download-started', 'fake-download', { ms: 2600 });
  rec('download', 'uac-declined', undefined, { asked: 0 });
  rec('download', 'ran-download', 'fake-download', { declined: 1 });
  w.disclose('prize', 'real-email', 'email', 'tester@example.cz');
  rec('prize', 'paid-with-data', 'data-as-currency', { field: 'email' });
  rec('prize', 'mail-sent');
  rec('prize', 'saved-image', 'stego-dropper');
  rec('glass', 'mirror', undefined, { glassFallen: false });
  rec('glass', 'glass-bounced', 'broken-physics', { touched: true });
  rec('crash', 'window-button', undefined, { button: 'close' });
  rec('crash', 'called-support', 'tech-support', { ms: 5300 });
  rec('crash', 'dictated-code', 'tech-support');
  w.tally('click', 386);
  return w;
}
