import { audio } from '../audio/engine.ts';
import { DOWNLOAD } from '../content/download.ts';
import type { GameScene } from '../game.ts';
import { WELL_H, WELL_W, drawBlocks } from '../ui/blocks.ts';
import { bugWarns } from '../ui/bug-cameo.ts';
import { h, prefersReducedMotion, sleep } from '../ui/dom.ts';
import { sprite } from '../ui/sprites.ts';

const SCENE = 'download';
/** A real-feeling download takes a while. */
const DOWNLOAD_MS = 6500;
/** One block of the download well, in canvas pixels (shown at twice that). */
const BLOCK = 8;

/**
 * PAL Pro as a reward: a tidy download card with an antivirus badge and one
 * button to run it. The trust built so far does the rest. The download and
 * the install are theatre; nothing is fetched, saved or run.
 */
export const download: GameScene = {
  id: SCENE,
  mount(ctx, done) {
    const { pal, profile, stage, witness } = ctx;
    let alive = true;
    let stopBlocks = (): void => undefined;
    const shownAt = performance.now();
    const motion = !prefersReducedMotion();

    const icon = sprite(profile.assistantLook ?? 'pal');
    icon.classList.add('pro__icon');
    const get = h('button', { class: 'btn btn--go pro__get', text: DOWNLOAD.get, attrs: { type: 'button' } });
    const after = h('div', { class: 'pro__after' });
    const card = h(
      'div',
      { class: 'pro' },
      h('div', { class: 'pro__head' }, icon, h('div', {}, h('strong', { class: 'pro__name', text: DOWNLOAD.name }), h('span', { class: 'pro__version', text: DOWNLOAD.version }))),
      h('span', { class: 'pro__badge', text: DOWNLOAD.badge }),
      h('ul', { class: 'pro__perks' }, ...DOWNLOAD.perks.map((p) => h('li', { text: p }))),
      get,
      after,
    );
    stage.replaceChildren(card);

    get.addEventListener('click', () => void take());

    async function take(): Promise<void> {
      get.remove();
      witness.record({
        scene: SCENE,
        kind: 'download-started',
        trick: 'fake-download',
        data: { ms: Math.round(performance.now() - shownAt) },
      });
      // A download that takes its time, the way real ones do; four-square blocks fall and stack as it goes.
      const well = h('canvas', { class: 'dl__blocks', attrs: { width: String(WELL_W * BLOCK), height: String(WELL_H * BLOCK), 'aria-hidden': 'true' } });
      const wg = well.getContext('2d');
      const label = h('span', { text: DOWNLOAD.progress(0) });
      after.replaceChildren(h('div', { class: 'dl__file' }, h('strong', { text: DOWNLOAD.file }), well, label));
      let shown = 0;
      let target = 0;
      let raf = 0;
      const animate = (): void => {
        shown += Math.min(0.012, Math.max(0, target - shown));
        if (wg) drawBlocks(wg, shown, BLOCK);
        if (alive && shown < 1) raf = requestAnimationFrame(animate);
      };
      if (wg) drawBlocks(wg, 0, BLOCK);
      raf = requestAnimationFrame(animate);
      stopBlocks = () => cancelAnimationFrame(raf);
      const steps = motion ? 50 : 1;
      for (let i = 1; i <= steps; i++) {
        // uneven, like a real connection
        const pct = Math.round(100 * (i / steps) ** 1.2);
        target = pct / 100;
        label.textContent = DOWNLOAD.progress(pct);
        await sleep((DOWNLOAD_MS / steps) * (0.5 + Math.random()));
        if (!alive) return;
      }
      if (!motion && wg) {
        shown = 1;
        drawBlocks(wg, 1, BLOCK);
      }
      label.textContent = DOWNLOAD.downloaded;
      audio.click(84, 0.3);
      void bugWarns(ctx, ctx.window.el, 'download', { side: 'left', mood: 'angry' });
      const run = h('button', { class: 'btn', text: DOWNLOAD.run, attrs: { type: 'button' } });
      after.append(run);
      run.focus();
      run.addEventListener('click', () => void ran(run));
    }

    async function ran(run: HTMLButtonElement): Promise<void> {
      witness.record({ scene: SCENE, kind: 'ran-download', trick: 'fake-download' });
      const status = h('p', { class: 'dl__installing', text: DOWNLOAD.installing });
      run.replaceWith(status);
      await sleep(motion ? 2200 : 200);
      if (!alive) return;
      status.textContent = DOWNLOAD.installed;
      audio.treasure();
      await pal.say(DOWNLOAD.palRan);
      if (!alive) return;
      await pal.tapToContinue();
      if (alive) done();
    }

    void pal.say(DOWNLOAD.palIntro((profile.points ?? 0).toLocaleString('cs-CZ')));

    return () => {
      alive = false;
      stopBlocks();
      stage.replaceChildren();
    };
  },
};
