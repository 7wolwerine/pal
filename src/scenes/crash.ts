import { CRASH } from '../content/crash.ts';
import type { GameScene } from '../game.ts';
import { BUG_PX, Beetle } from '../ui/beetle.ts';
import { bugImage } from '../ui/bug-sprite.ts';
import { h, prefersReducedMotion, sleep } from '../ui/dom.ts';

const SCENE = 'crash';

/**
 * BUG's end and the blue screen. PAL turns dark; BUG says its last line and
 * dissolves into green glyphs spelled from the player's own actions; the
 * window crashes into a fake blue screen with a "support" number. Calling it
 * is theatre: a fake call, nothing dialled, nothing sent.
 */
export const crash: GameScene = {
  id: SCENE,
  mount(ctx, done) {
    const { pal, stage, witness } = ctx;
    const motion = !prefersReducedMotion();
    let alive = true;
    let raf = 0;
    let screen: HTMLElement | null = null;

    const board = h('div', { class: 'crash' });
    const beetle = new Beetle();
    board.append(beetle.el);
    stage.replaceChildren(board);

    async function run(): Promise<void> {
      pal.setMood('dark');
      await pal.say(CRASH.palDark);
      if (!alive) return;
      const w = board.clientWidth || 320;
      beetle.jump(w + 10, 90);
      beetle.setMood('sad');
      await beetle.moveTo(w / 2 - BUG_PX / 2, 90);
      if (!alive) return;
      beetle.say(CRASH.bugLast);
      await sleep(2200);
      if (!alive) return;
      beetle.say('');
      await dissolve();
      if (!alive) return;
      await pal.glitch(700);
      if (!alive) return;
      ctx.window.el.classList.add('win--crash');
      await sleep(motion ? 900 : 100);
      if (!alive) return;
      blueScreen();
    }

    /** BUG becomes a matrix-like artefact made of what the player did. */
    async function dissolve(): Promise<void> {
      const words = witness.events.map((e) => e.kind.toUpperCase()).join(' ') || 'BUG';
      const box = beetle.el.getBoundingClientRect();
      const host = board.getBoundingClientRect();
      const canvas = h('canvas', { class: 'crash__rain', attrs: { 'aria-hidden': 'true' } });
      canvas.width = Math.max(1, Math.round(host.width));
      canvas.height = Math.max(1, Math.round(host.height + 60));
      board.append(canvas);
      const g = canvas.getContext('2d');
      const sprite = bugImage('stand').getContext('2d')?.getImageData(0, 0, 16, 16);
      beetle.el.classList.add('bug--gone');
      if (!g || !sprite) return;
      const cell = BUG_PX / 16;
      const drops: { x: number; y: number; v: number; ch: string }[] = [];
      let k = 0;
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          if ((sprite.data[(y * 16 + x) * 4 + 3] ?? 0) < 128) continue;
          drops.push({
            x: box.left - host.left + x * cell,
            y: box.top - host.top + y * cell,
            v: 0.04 + ((x * 7 + y * 13) % 10) / 120,
            ch: words[k++ % words.length] ?? '0',
          });
        }
      }
      const total = motion ? 2400 : 1;
      const start = performance.now();
      await new Promise<void>((resolve) => {
        const step = (now: number): void => {
          const t = now - start;
          g.clearRect(0, 0, canvas.width, canvas.height);
          g.font = `${Math.round(cell * 2)}px monospace`;
          for (const d of drops) {
            const fade = Math.max(0, 1 - t / total);
            g.fillStyle = `rgba(80, 255, 120, ${fade})`;
            g.fillText(d.ch, d.x, d.y + d.v * t * (t / 600));
          }
          if (t < total && alive) {
            raf = requestAnimationFrame(step);
            return;
          }
          resolve();
        };
        raf = requestAnimationFrame(step);
      });
      canvas.remove();
    }

    function blueScreen(): void {
      const call = h('button', { class: 'bsod__btn', text: CRASH.call, attrs: { type: 'button' } });
      const restart = h('button', { class: 'bsod__btn bsod__btn--quiet', text: CRASH.restart, attrs: { type: 'button' } });
      const line = h('div', { class: 'bsod__line', attrs: { 'aria-live': 'polite' } });
      screen = h(
        'div',
        { class: 'bsod', attrs: { role: 'alertdialog', 'aria-label': CRASH.ariaLabel } },
        h('p', { class: 'bsod__sad', text: CRASH.sad }),
        h('p', { class: 'bsod__title', text: CRASH.title }),
        h('p', { text: CRASH.body }),
        h('p', { class: 'bsod__phone', text: CRASH.phone }),
        h('p', { class: 'bsod__code', text: CRASH.code }),
        h('div', { class: 'bsod__actions' }, call, restart),
        line,
      );
      document.body.append(screen);
      call.focus();
      const shownAt = performance.now();
      call.addEventListener('click', () => {
        call.disabled = true;
        restart.disabled = true;
        witness.record({
          scene: SCENE,
          kind: 'called-support',
          trick: 'tech-support',
          data: { ms: Math.round(performance.now() - shownAt) },
        });
        void fakeCall(line);
      });
      restart.addEventListener('click', () => {
        witness.record({ scene: SCENE, kind: 'bsod-restart' });
        finish();
      });
    }

    /** Theatre: a "call" that shows what the voice on the line would say. */
    async function fakeCall(line: HTMLElement): Promise<void> {
      line.textContent = CRASH.ringing;
      await sleep(1400);
      for (const said of CRASH.support) {
        if (!alive) return;
        line.textContent = `„${said}“`;
        await sleep(2300);
      }
      if (!alive) return;
      const hang = h('button', { class: 'bsod__btn', text: CRASH.hangUp, attrs: { type: 'button' }, on: { click: finish } });
      line.append(hang);
      hang.focus();
    }

    function finish(): void {
      if (!alive) return;
      done();
    }

    void run();
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      beetle.stop();
      screen?.remove();
      ctx.window.el.classList.remove('win--crash');
      pal.setMood('neutral');
      stage.replaceChildren();
    };
  },
};
