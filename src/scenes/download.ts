import { DOWNLOAD } from '../content/download.ts';
import type { GameScene } from '../game.ts';
import { bugWarns } from '../ui/bug-cameo.ts';
import { h, prefersReducedMotion, sleep } from '../ui/dom.ts';

const SCENE = 'download';

/**
 * A 90s download page. Loud buttons are ads, and the player learns to spot
 * them. The quiet link is the "real" one — and the trap: the status bar shows
 * it points at a stranger's domain. The download and install are theatre;
 * nothing is fetched, saved or run.
 */
export const download: GameScene = {
  id: SCENE,
  mount(ctx, done) {
    const { pal, stage, witness } = ctx;
    let alive = true;
    let ads = 0;
    let found = false;
    const shownAt = performance.now();

    const statusBar = h('div', { class: 'dl__status', text: DOWNLOAD.statusIdle });
    const hover = (el: HTMLElement, url: string): void => {
      const show = (): void => {
        statusBar.textContent = url;
      };
      const hide = (): void => {
        statusBar.textContent = DOWNLOAD.statusIdle;
      };
      el.addEventListener('pointerenter', show);
      el.addEventListener('focus', show);
      el.addEventListener('pointerleave', hide);
      el.addEventListener('blur', hide);
    };

    const adButtons = DOWNLOAD.ads.map((label, i) => {
      const b = h('button', { class: `dl__ad dl__ad--${i}`, text: label, attrs: { type: 'button' } });
      hover(b, DOWNLOAD.adUrl(i));
      b.addEventListener('click', () => {
        if (found || b.classList.contains('dl__ad--caught')) return;
        b.classList.add('dl__ad--caught');
        b.textContent = DOWNLOAD.adCaught;
        ads++;
        witness.tally('fake-ad');
        witness.record({ scene: SCENE, kind: 'ad-click', data: { n: ads } });
        void pal.say(DOWNLOAD.palAd[Math.min(ads, DOWNLOAD.palAd.length) - 1] ?? '');
      });
      return b;
    });

    const link = h('a', { class: 'dl__link', text: DOWNLOAD.link, attrs: { href: '#', role: 'button' } });
    hover(link, DOWNLOAD.linkUrl);
    link.addEventListener('click', (event) => {
      event.preventDefault();
      if (found) return;
      found = true;
      void takeIt();
    });

    const [a0, a1, a2, a3, a4] = adButtons;
    const page = h(
      'div',
      { class: 'dl' },
      h('h2', { class: 'dl__title', text: DOWNLOAD.pageTitle }),
      h('div', { class: 'dl__marquee', attrs: { 'aria-hidden': 'true' } }, h('span', { text: DOWNLOAD.marquee })),
      h('div', { class: 'dl__grid' }, ...[a0, a1, a2].filter((b): b is HTMLButtonElement => !!b)),
      h('p', { class: 'dl__small' }, link),
      h('div', { class: 'dl__grid' }, ...[a3, a4].filter((b): b is HTMLButtonElement => !!b)),
      statusBar,
    );
    const after = h('div', { class: 'dl__after' });
    stage.replaceChildren(page, after);

    async function takeIt(): Promise<void> {
      witness.record({
        scene: SCENE,
        kind: 'download-started',
        trick: 'fake-download',
        data: { ads, ms: Math.round(performance.now() - shownAt), url: DOWNLOAD.linkUrl },
      });
      page.classList.add('dl--done');
      await pal.say(DOWNLOAD.palFound);
      if (!alive) return;
      // Theatre: a progress bar for a file that does not exist.
      const bar = h('span', { class: 'dl__bar' });
      const label = h('span', { text: DOWNLOAD.progress(0) });
      const box = h(
        'div',
        { class: 'dl__file' },
        h('strong', { text: DOWNLOAD.file }),
        h('span', { class: 'dl__track' }, bar),
        label,
      );
      after.replaceChildren(box);
      const steps = prefersReducedMotion() ? 1 : 30;
      for (let i = 1; i <= steps; i++) {
        const pct = Math.round((100 * i) / steps);
        bar.style.width = `${pct}%`;
        label.textContent = DOWNLOAD.progress(pct);
        await sleep(60);
        if (!alive) return;
      }
      void bugWarns(ctx, ctx.window.el, 'download', { side: 'left', mood: 'panic' });
      askRun(box);
    }

    function askRun(box: HTMLElement): void {
      const run = h('button', { class: 'btn', text: DOWNLOAD.run, attrs: { type: 'button' } });
      const cancel = h('button', { class: 'btn btn--quiet', text: DOWNLOAD.cancel, attrs: { type: 'button' } });
      const ask = h('div', { class: 'dl__ask' }, h('p', { text: DOWNLOAD.runQuestion }), h('div', { class: 'row' }, cancel, run));
      box.after(ask);
      run.focus();
      run.addEventListener('click', () => void ran(ask));
      cancel.addEventListener('click', () => {
        ask.remove();
        witness.record({ scene: SCENE, kind: 'download-cancelled' });
        witness.record({ scene: SCENE, kind: 'vigilance', data: { what: 'unknown-exe' } });
        void pal.say(DOWNLOAD.palCancelled).then(showGo);
      });
    }

    async function ran(ask: HTMLElement): Promise<void> {
      witness.record({ scene: SCENE, kind: 'ran-download', trick: 'fake-download' });
      const status = h('p', { class: 'dl__installing', text: DOWNLOAD.installing });
      ask.replaceChildren(status);
      await sleep(prefersReducedMotion() ? 200 : 1500);
      if (!alive) return;
      status.textContent = DOWNLOAD.installed;
      await pal.say(DOWNLOAD.palRan);
      showGo();
    }

    function showGo(): void {
      if (!alive) return;
      const go = h('button', { class: 'btn', text: DOWNLOAD.go, attrs: { type: 'button' }, on: { click: done } });
      after.append(go);
      go.focus();
    }

    void (async () => {
      await pal.say(DOWNLOAD.palIntro);
      if (!alive || found || ads > 0) return;
      await sleep(600);
      if (alive && !found && ads === 0) await pal.say(DOWNLOAD.palHunt);
    })();

    return () => {
      alive = false;
      stage.replaceChildren();
    };
  },
};
