import { audio } from '../audio/engine.ts';
import { CRASH } from '../content/crash.ts';
import type { GameScene } from '../game.ts';
import { BUG_PX, Beetle } from '../ui/beetle.ts';
import { BUG_SIZE, bugImage } from '../ui/bug-sprite.ts';
import { h, prefersReducedMotion, sleep } from '../ui/dom.ts';

const SCENE = 'crash';

/**
 * The end of the act and the blue screen. The assistant goes flat like a
 * balloon and PAL climbs out of the costume, pink as ever, then turns bad. BUG
 * tries to pull the window shut and dissolves into green glyphs spelled from
 * the player's own actions; the window crashes, the screen falls apart into
 * pieces and artefacts, and a fake blue screen offers a "support" number.
 * Calling it is theatre: a fake call, nothing dialled, nothing sent.
 */
export const crash: GameScene = {
  id: SCENE,
  mount(ctx, done) {
    const { pal, stage, witness } = ctx;
    const motion = !prefersReducedMotion();
    let alive = true;
    let raf = 0;
    let screen: HTMLElement | null = null;
    // The glyph rain sits on the computer layer, which outlives the scene, so the cleanup removes it.
    let rain: HTMLCanvasElement | null = null;

    const board = h('div', { class: 'crash' });
    const beetle = new Beetle();
    board.append(beetle.el);
    stage.replaceChildren(board);

    /** The assistant was a costume: it goes flat, and PAL pops out of it. */
    async function deflate(): Promise<void> {
      const avatar = pal.el.querySelector<HTMLElement>('.pal__avatar');
      if (avatar && motion) {
        avatar.classList.add('pal__avatar--deflate');
        audio.click(40, 0.35);
        await sleep(1500);
        if (!alive) return;
        avatar.classList.remove('pal__avatar--deflate');
      }
      pal.setMood('neutral');
      if (avatar && motion) {
        avatar.classList.add('pal__avatar--pop');
        avatar.addEventListener('animationend', () => avatar.classList.remove('pal__avatar--pop'), { once: true });
      }
      await pal.say(CRASH.palOut);
      if (!alive) return;
      await sleep(motion ? 700 : 0);
    }

    async function run(): Promise<void> {
      await deflate();
      if (!alive) return;
      pal.setMood('evil');
      await pal.say(CRASH.palDark);
      if (!alive) return;
      // The window clips whatever is in it, and BUG stands on top of it: he goes on the computer instead.
      const layer = ctx.window.el.closest<HTMLElement>('.pc') ?? board;
      layer.append(beetle.el);
      const winBox = ctx.window.el.getBoundingClientRect();
      const layerBox = layer.getBoundingClientRect();
      const w = layer === board ? board.clientWidth || 320 : winBox.right - layerBox.left;
      beetle.jump(w + (layer === board ? 10 : 110), layer === board ? 90 : winBox.top - layerBox.top + 60);
      beetle.setMood('panic');
      // No words. BUG runs to the window's close button and pulls at it with all he has:
      // the one thing he has been trying to do for the player all along.
      const close = ctx.window.el.querySelector<HTMLElement>('[aria-label="Zavřít"]');
      const from = layer.getBoundingClientRect();
      const to = close?.getBoundingClientRect();
      // He comes in from the right, so he faces left: his outstretched hands close round the cross.
      const x = to ? to.left - from.left + to.width / 2 - (BUG_PX * 3) / 32 : w / 2 - BUG_PX / 2;
      const y = to ? to.top - from.top + to.height / 2 - (BUG_PX * 20.5) / 32 : 90;
      beetle.el.style.zIndex = '20';
      await beetle.moveTo(x, y);
      if (!alive) return;
      for (let pull = 0; pull < 3; pull++) {
        await beetle.strain(650);
        if (!alive) return;
        ctx.window.el.classList.remove('win--nope');
        void ctx.window.el.offsetWidth;
        ctx.window.el.classList.add('win--nope');
      }
      beetle.setMood('cry');
      await sleep(900);
      if (!alive) return;
      await dissolve();
      if (!alive) return;
      await pal.glitch(700);
      if (!alive) return;
      ctx.window.el.classList.add('win--crash');
      await sleep(motion ? 900 : 100);
      if (!alive) return;
      await crumble();
      if (!alive) return;
      blueScreen();
    }

    /** BUG becomes a matrix-like artefact made of what the player did. */
    async function dissolve(): Promise<void> {
      const words = witness.events.map((e) => e.kind.toUpperCase()).join(' ') || 'BUG';
      const box = beetle.el.getBoundingClientRect();
      const layer = beetle.el.parentElement ?? board;
      const host = layer.getBoundingClientRect();
      const canvas = h('canvas', { class: 'crash__rain', attrs: { 'aria-hidden': 'true' } });
      canvas.width = Math.max(1, Math.round(host.width));
      canvas.height = Math.max(1, Math.round(host.height + 60));
      canvas.style.zIndex = '20';
      layer.append(canvas);
      rain = canvas;
      const g = canvas.getContext('2d');
      const sprite = bugImage('stand').getContext('2d')?.getImageData(0, 0, BUG_SIZE, BUG_SIZE);
      beetle.el.classList.add('bug--gone');
      if (!g || !sprite) return;
      const cell = BUG_PX / BUG_SIZE;
      const drops: { x: number; y: number; v: number; ch: string }[] = [];
      let k = 0;
      for (let y = 0; y < BUG_SIZE; y++) {
        for (let x = 0; x < BUG_SIZE; x++) {
          if ((sprite.data[(y * BUG_SIZE + x) * 4 + 3] ?? 0) < 128) continue;
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

    let undo = (): void => undefined;

    /** The whole screen falls apart: the picture in pieces, then artefacts flickering on black. */
    async function crumble(): Promise<void> {
      const screenEl = ctx.window.el.closest('.pc')?.querySelector<HTMLElement>('.pc__screen');
      const paper = screenEl?.querySelector<HTMLCanvasElement>('.pc__wallpaper');
      if (!screenEl || !paper || !motion) return;
      const box = screenEl.getBoundingClientRect();
      const pbox = paper.getBoundingClientRect();
      const canvas = h('canvas', { class: 'crash__crumble', attrs: { 'aria-hidden': 'true' } });
      canvas.width = Math.max(1, Math.round(box.width));
      canvas.height = Math.max(1, Math.round(box.height));
      const g = canvas.getContext('2d');
      if (!g) return;
      g.imageSmoothingEnabled = false;
      // A copy of the picture to break up; the real one goes, and so does the taskbar.
      const copy = document.createElement('canvas');
      copy.width = paper.width;
      copy.height = paper.height;
      copy.getContext('2d')?.drawImage(paper, 0, 0);
      const hidden = [...screenEl.querySelectorAll<HTMLElement>('.pc__glass, .pc__taskbar, .pc__errors')];
      for (const el of hidden) el.style.visibility = 'hidden';
      screenEl.classList.add('pc__screen--crash');
      screenEl.append(canvas);
      undo = () => {
        canvas.remove();
        screenEl.classList.remove('pc__screen--crash');
        for (const el of hidden) el.style.visibility = '';
      };
      const cols = 12;
      const rows = 8;
      const ox = pbox.left - box.left;
      const oy = pbox.top - box.top;
      const tw = pbox.width / cols;
      const th = pbox.height / rows;
      const sw = copy.width / cols;
      const sh = copy.height / rows;
      const tiles: { c: number; r: number; delay: number; vx: number; spin: number }[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const n = Math.sin(c * 12.9898 + r * 78.233) * 43758.5453;
          const rnd = n - Math.floor(n);
          // The bottom goes first, and the rest follows row by row, never quite in step.
          tiles.push({ c, r, delay: (rows - 1 - r) * 110 + rnd * 260, vx: (rnd - 0.5) * 0.12, spin: (rnd - 0.5) * 0.006 });
        }
      }
      const colours = ['#ff2bd6', '#2bfff0', '#5dff7a', '#ffffff', '#ffe23a'];
      const total = 2600;
      const start = performance.now();
      await new Promise<void>((resolve) => {
        const step = (now: number): void => {
          const t = now - start;
          g.fillStyle = '#000';
          g.fillRect(0, 0, canvas.width, canvas.height);
          for (const tile of tiles) {
            const u = Math.max(0, t - tile.delay);
            const x = ox + tile.c * tw + tile.vx * u;
            const y = oy + tile.r * th + 0.0011 * u * u;
            if (y > canvas.height) continue;
            g.save();
            g.translate(x + tw / 2, y + th / 2);
            g.rotate(tile.spin * u);
            g.drawImage(copy, tile.c * sw, tile.r * sh, sw, sh, -tw / 2, -th / 2, tw + 1, th + 1);
            g.restore();
          }
          // Artefacts: blocks and torn lines that come thicker as it goes.
          const count = Math.floor((t / total) * 40);
          for (let i = 0; i < count; i++) {
            g.fillStyle = colours[Math.floor(Math.random() * colours.length)] ?? '#fff';
            const size = 4 + Math.floor(Math.random() * 4) * 4;
            if (Math.random() < 0.3) g.fillRect(0, Math.random() * canvas.height, canvas.width, 1 + Math.random() * 2);
            else g.fillRect(Math.floor((Math.random() * canvas.width) / 4) * 4, Math.floor((Math.random() * canvas.height) / 4) * 4, size * 2, size);
          }
          if (t < total && alive) {
            raf = requestAnimationFrame(step);
            return;
          }
          resolve();
        };
        raf = requestAnimationFrame(step);
      });
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
      const dictate = h('button', { class: 'bsod__btn', text: CRASH.dictate, attrs: { type: 'button' } });
      const hang = h('button', { class: 'bsod__btn bsod__btn--quiet', text: CRASH.hangUp, attrs: { type: 'button' }, on: { click: finish } });
      const buttons = h('div', { class: 'bsod__actions' }, dictate, hang);
      line.after(buttons);
      dictate.focus();
      dictate.addEventListener('click', () => {
        buttons.remove();
        witness.record({ scene: SCENE, kind: 'dictated-code', trick: 'tech-support' });
        void goesWrong(line);
      });
    }

    /** The code is read out, and the support is in: the mouse moves by itself, the screen garbles. */
    async function goesWrong(line: HTMLElement): Promise<void> {
      line.textContent = '';
      for (const digit of CRASH.digits) {
        if (!alive) return;
        line.textContent += `${digit}… `;
        audio.click(70 + Number(digit), 0.25);
        await sleep(motion ? 450 : 0);
      }
      if (!alive || !screen) return;
      const bsod = screen;
      bsod.classList.add('bsod--taken');
      const banner = h('p', { class: 'bsod__taken', text: CRASH.takeover });
      bsod.prepend(banner);
      // A cursor that is not the player's wanders over the screen.
      const cursor = h('span', { class: 'bsod__cursor', attrs: { 'aria-hidden': 'true' } });
      bsod.append(cursor);
      const path: readonly (readonly [number, number])[] = [[20, 30], [62, 22], [48, 64], [80, 50], [30, 78], [70, 82]];
      for (const [x, y] of path) {
        if (!alive) return;
        cursor.style.left = `${x}%`;
        cursor.style.top = `${y}%`;
        await sleep(motion ? 520 : 0);
      }
      line.textContent = `„${CRASH.supportIn}“`;
      await sleep(motion ? 1600 : 0);
      if (!alive) return;
      const title = bsod.querySelector<HTMLElement>('.bsod__title');
      if (title) title.textContent = CRASH.glitch;
      bsod.classList.add('bsod--garbled');
      const hang = h('button', { class: 'bsod__btn', text: CRASH.hangUp, attrs: { type: 'button' }, on: { click: finish } });
      line.after(h('div', { class: 'bsod__actions' }, hang));
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
      beetle.el.remove();
      screen?.remove();
      rain?.remove();
      // Leaving mid-deflate would otherwise keep PAL flat for the rest of the game.
      pal.el.querySelector('.pal__avatar')?.classList.remove('pal__avatar--deflate', 'pal__avatar--pop');
      undo();
      ctx.window.el.classList.remove('win--crash');
      pal.setMood('neutral');
      stage.replaceChildren();
    };
  },
};
