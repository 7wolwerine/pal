import { audio } from '../audio/engine.ts';
import { DOWNLOAD } from '../content/download.ts';
import type { GameScene } from '../game.ts';
import { bugWarns } from '../ui/bug-cameo.ts';
import { h, prefersReducedMotion, sleep } from '../ui/dom.ts';
import { sprite } from '../ui/sprites.ts';

const SCENE = 'download';
/** A real-feeling download takes a while. */
const DOWNLOAD_MS = 6500;

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
    // BUG's visit walks the monitor, which outlives the scene: leaving the scene sends him off.
    const cameo = new AbortController();
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

    /** A plain progress bar that fills unevenly, the way a real connection does. */
    async function fill(bar: HTMLElement, label: HTMLElement, text: (pct: number) => string, ms: number): Promise<boolean> {
      const steps = motion ? 40 : 1;
      for (let i = 1; i <= steps; i++) {
        const pct = Math.round(100 * (i / steps) ** 1.2);
        bar.style.width = `${pct}%`;
        label.textContent = text(pct);
        await sleep((ms / steps) * (0.5 + Math.random()));
        if (!alive) return false;
      }
      return true;
    }

    function progress(title: string): { box: HTMLElement; bar: HTMLElement; label: HTMLElement } {
      const bar = h('span', { class: 'dl__bar' });
      const label = h('span', { class: 'dl__label' });
      const box = h('div', { class: 'dl__file' }, h('strong', { text: title }), h('span', { class: 'dl__track', attrs: { 'aria-hidden': 'true' } }, bar), label);
      return { box, bar, label };
    }

    async function take(): Promise<void> {
      get.remove();
      witness.record({
        scene: SCENE,
        kind: 'download-started',
        trick: 'fake-download',
        data: { ms: Math.round(performance.now() - shownAt) },
      });
      const dl = progress(DOWNLOAD.file);
      after.replaceChildren(dl.box);
      if (!(await fill(dl.bar, dl.label, DOWNLOAD.progress, DOWNLOAD_MS))) return;
      dl.label.textContent = DOWNLOAD.downloaded;
      audio.click(84, 0.3);
      void bugWarns(ctx, ctx.window.el, 'download', { side: 'left', mood: 'angry', signal: cameo.signal });
      const run = h('button', { class: 'btn', text: DOWNLOAD.run, attrs: { type: 'button' } });
      after.append(run);
      run.focus();
      run.addEventListener('click', () => {
        run.remove();
        void ask();
      });
    }

    /** "Run" does not run anything yet: it asks for the keys to the whole computer. */
    async function ask(asked = 0): Promise<void> {
      const yes = h('button', { class: 'btn', text: DOWNLOAD.uac.yes, attrs: { type: 'button' } });
      const no = h('button', { class: 'btn btn--quiet', text: DOWNLOAD.uac.no, attrs: { type: 'button' } });
      const box = h(
        'div',
        { class: 'uac', attrs: { role: 'alertdialog', 'aria-labelledby': 'uac-q' } },
        h('p', { class: 'uac__title', text: DOWNLOAD.uac.title }),
        h('p', { class: 'uac__q', text: DOWNLOAD.uac.question, attrs: { id: 'uac-q' } }),
        h('p', { class: 'uac__file', text: DOWNLOAD.file }),
        h('dl', { class: 'uac__facts' }, ...DOWNLOAD.uac.facts.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })])),
        h('div', { class: 'row uac__buttons' }, yes, no),
      );
      // It pops up over the window, the way a system prompt does, so the window keeps its size.
      ctx.window.el.append(box);
      audio.click(62, 0.3);
      yes.focus();
      no.addEventListener('click', () => {
        witness.record({ scene: SCENE, kind: 'uac-declined', data: { asked } });
        box.remove();
        void pal.say(DOWNLOAD.uac.coax[Math.min(asked, DOWNLOAD.uac.coax.length - 1)] ?? '').then(() => {
          if (alive) void ask(asked + 1);
        });
      });
      yes.addEventListener('click', () => {
        box.remove();
        void ran(asked);
      });
    }

    async function ran(declined: number): Promise<void> {
      witness.record({ scene: SCENE, kind: 'ran-download', trick: 'fake-download', data: { declined } });
      const inst = progress(DOWNLOAD.installing);
      after.replaceChildren(inst.box);
      const steps = DOWNLOAD.steps;
      if (!(await fill(inst.bar, inst.label, (pct) => steps[Math.min(steps.length - 1, Math.floor((pct / 100) * steps.length))] ?? '', motion ? 4200 : 200))) return;
      inst.label.textContent = DOWNLOAD.installed;
      audio.treasure();
      await pal.say(DOWNLOAD.palRan);
      if (!alive) return;
      await pal.tapToContinue();
      if (alive) done();
    }

    void pal.say(DOWNLOAD.palIntro((profile.points ?? 0).toLocaleString('cs-CZ')));

    return () => {
      alive = false;
      cameo.abort();
      ctx.window.el.querySelector('.uac')?.remove();
      stage.replaceChildren();
    };
  },
};
