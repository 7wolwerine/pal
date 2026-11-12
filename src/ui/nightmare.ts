import { audio } from '../audio/engine.ts';
import { NIGHT, type NightFacts, type NightScene } from '../content/nightmare.ts';
import { SHELTER } from '../content/shelter.ts';
import type { WitnessEvent } from '../core/witness.ts';
import type { Profile } from '../game.ts';
import { paintHero } from '../pixel/hero.ts';
import { paintDesk } from '../scenes/desk/art.ts';
import { paintFlower } from '../scenes/flower/art.ts';
import { CHARACTER_AT_MAILBOX, CHARACTER_HOME, FEET_Y, paintBackdrop, paintCloseUp, paintMailbox, paintPlant } from '../scenes/mailbox/art.ts';
import { paintScene } from '../scenes/paint/art.ts';
import { HOLE_CENTRE, Painting, SKY, paintingRows } from '../scenes/paint/model.ts';
import { paintShelter } from '../scenes/shelter/art.ts';
import { ShelterModel } from '../scenes/shelter/model.ts';
import { h, prefersReducedMotion, sleep } from './dom.ts';
import { palFaceImage } from './pal-face.ts';
import { sprite, type SpriteId } from './sprites.ts';

const W = 160;
const H = 100;
const SCALE = 4;
/** About five seconds a scene. */
const SCENE_MS = 5000;

type G = CanvasRenderingContext2D;

/** One remembered moment: draws the low-res picture, and optional crisp text over it. */
interface Vignette {
  readonly id: NightScene;
  /** u runs 0..1 over the vignette. */
  pixel?(g: G, t: number, u: number): void;
  text?(g: G, t: number, u: number): void;
}

/**
 * The player's own game, played back in the dark: every scene they went
 * through, five seconds each, as a grainy green recording with torn frames,
 * a timecode, PAL's dark face flickering through, and one cold sentence
 * about what they did. Resolves when it ends or is skipped.
 */
export function playNightmare(events: readonly WitnessEvent[], profile: Profile): Promise<void> {
  const facts = factsOf(events, profile);
  const order: NightScene[] = [];
  for (const e of events) {
    const id = e.scene as NightScene;
    if (id in NIGHT.captions && !order.includes(id)) order.push(id);
  }
  const vignettes = order.map((id) => vignette(id, facts, profile));
  if (vignettes.length === 0) return Promise.resolve();

  const screen = h('canvas', { class: 'night__screen', attrs: { width: String(W * SCALE), height: String(H * SCALE), 'aria-hidden': 'true' } });
  const caption = h('p', { class: 'night__caption', attrs: { 'aria-live': 'polite' } });
  const rec = h('span', { class: 'night__rec', text: NIGHT.title });
  const clock = h('span', { class: 'night__clock' });
  const skip = h('button', { class: 'night__skip', text: NIGHT.skip, attrs: { type: 'button' } });
  const el = h('section', { class: 'night', attrs: { 'aria-label': NIGHT.label } }, h('div', { class: 'night__tv' }, screen, rec, clock), caption, skip);
  document.body.append(el);

  const low = document.createElement('canvas');
  low.width = W;
  low.height = H;
  const lg = low.getContext('2d', { willReadFrequently: true });
  const g = screen.getContext('2d');
  const motion = !prefersReducedMotion();
  const face = palFaceImage('dark');

  return new Promise((resolve) => {
    let stopped = false;
    let index = -1;
    let sceneAt = 0;
    let raf = 0;
    const startedAt = performance.now();

    const finish = (): void => {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(raf);
      el.classList.add('night--out');
      window.setTimeout(() => {
        el.remove();
        resolve();
      }, 500);
    };
    skip.addEventListener('click', finish);

    async function typeCaption(text: string): Promise<void> {
      caption.textContent = '';
      for (const ch of text) {
        if (stopped) return;
        caption.textContent += ch;
        await sleep(ch === ' ' ? 18 : 38);
      }
    }

    const next = (now: number): void => {
      index++;
      if (index >= vignettes.length) {
        finish();
        return;
      }
      sceneAt = now;
      audio.crunch();
      const v = vignettes[index];
      if (v) void typeCaption(NIGHT.captions[v.id](facts));
    };

    const frame = (now: number): void => {
      if (stopped || !lg || !g) return;
      if (index < 0 || now - sceneAt >= SCENE_MS) next(now);
      if (stopped) return;
      const v = vignettes[index];
      if (!v) return;
      const t = now - startedAt;
      const u = Math.min(1, (now - sceneAt) / SCENE_MS);

      lg.clearRect(0, 0, W, H);
      lg.fillStyle = '#000';
      lg.fillRect(0, 0, W, H);
      if (v.pixel) v.pixel(lg, t, u);
      // A face that should not be there, for a few frames now and then.
      if (motion && Math.floor(t / 97) % 37 === 0) {
        lg.globalAlpha = 0.35;
        lg.drawImage(face, W / 2 - 24, H / 2 - 24, 48, 48);
        lg.globalAlpha = 1;
      }
      const img = lg.getImageData(0, 0, W, H);
      haunt(img, t, motion, now - sceneAt);
      lg.putImageData(img, 0, 0);

      g.imageSmoothingEnabled = false;
      g.drawImage(low, 0, 0, W * SCALE, H * SCALE);
      if (v.text) {
        // Crisp text, shaken a little, then dirtied with the same scanlines and grain.
        const jitter = motion && Math.floor(t / 130) % 11 === 0 ? 3 : 0;
        g.save();
        g.translate(jitter, 0);
        v.text(g, t, u);
        g.restore();
        g.fillStyle = 'rgba(0,0,0,0.3)';
        for (let y = SCALE; y < H * SCALE; y += SCALE * 2) g.fillRect(0, y, W * SCALE, SCALE);
        if (motion) {
          g.fillStyle = 'rgba(159,225,203,0.25)';
          for (let i = 0; i < 160; i++) g.fillRect(Math.random() * W * SCALE, Math.random() * H * SCALE, 2, 2);
        }
      }
      vignetteShade(g);
      clock.textContent = timecode(t);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  });
}

/** Green night vision: grain, scanlines, torn bands and a jolt at every cut. */
function haunt(img: ImageData, t: number, motion: boolean, sinceCut: number): void {
  const d = img.data;
  const tear = motion && Math.floor(t / 130) % 11 === 0 ? 2 + Math.floor((t / 13) % 6) : 0;
  const tearRow = Math.floor((t / 7) % H);
  const jolt = sinceCut < 160;
  const copy = tear ? new Uint8ClampedArray(d) : d;
  for (let y = 0; y < H; y++) {
    const shift = tear && Math.abs(y - tearRow) < 6 ? tear : 0;
    for (let x = 0; x < W; x++) {
      const sx = Math.min(W - 1, Math.max(0, x - shift));
      const i = (y * W + x) * 4;
      const j = (y * W + sx) * 4;
      let l = (0.3 * (copy[j] ?? 0) + 0.59 * (copy[j + 1] ?? 0) + 0.11 * (copy[j + 2] ?? 0)) / 255;
      l = Math.pow(l, 1.4) * 0.85;
      if (motion) l += (Math.random() - 0.5) * 0.12;
      if (y % 2 === 1) l *= 0.72;
      if (jolt) l = Math.min(1, l + 0.25);
      l = Math.max(0, Math.min(1, l));
      d[i] = Math.round(4 + 70 * l * l);
      d[i + 1] = Math.round(10 + 215 * l);
      d[i + 2] = Math.round(8 + 150 * l);
      d[i + 3] = 255;
    }
  }
}

function vignetteShade(g: G): void {
  const grad = g.createRadialGradient(W * 2, H * 2, H * 1.2, W * 2, H * 2, W * 2.6);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.75)');
  g.fillStyle = grad;
  g.fillRect(0, 0, W * SCALE, H * SCALE);
}

function timecode(ms: number): string {
  const s = Math.floor(ms / 1000);
  const f = Math.floor((ms % 1000) / 40);
  return `00:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

function factsOf(events: readonly WitnessEvent[], profile: Profile): NightFacts {
  const disclosed = new Map<string, string>();
  for (const e of events) {
    if (e.kind !== 'disclose' || !e.data) continue;
    const { field, value } = e.data;
    if (typeof field === 'string' && typeof value === 'string') disclosed.set(field, value);
  }
  const path = events.find((e) => e.kind === 'shelter')?.data?.path;
  return {
    name: profile.name,
    assistant: profile.assistantName,
    signature: profile.signature?.text ?? disclosed.get('signature'),
    street: disclosed.get('street'),
    food: disclosed.get('comfortFood'),
    email: profile.email,
    deaths: events.filter((e) => e.kind === 'death').length,
    presses: events.filter((e) => e.kind === 'forbidden-press').length,
    points: profile.points ?? 0,
    path: typeof path === 'string' ? path : undefined,
    printed: events.some((e) => e.kind === 'surprise' && e.data?.onPaper === true),
  };
}

const INK = '#9fe1cb';
const DIM = '#1d9e75';

/** Crisp green text and boxes, drawn over the grainy picture. */
function panel(g: G, x: number, y: number, w: number, hgt: number, title: string): void {
  g.fillStyle = 'rgba(2,10,6,0.85)';
  g.fillRect(x, y, w, hgt);
  g.strokeStyle = DIM;
  g.lineWidth = 3;
  g.strokeRect(x, y, w, hgt);
  g.fillStyle = DIM;
  g.fillRect(x, y, w, 30);
  g.fillStyle = '#020a06';
  g.font = '700 18px ui-monospace, Consolas, monospace';
  g.textBaseline = 'middle';
  g.fillText(title, x + 12, y + 16);
}

function typed(text: string, u: number, from = 0.15, to = 0.7): string {
  const k = Math.max(0, Math.min(1, (u - from) / (to - from)));
  return text.slice(0, Math.round(text.length * k));
}

function line(g: G, text: string, x: number, y: number, size = 24, colour = INK): void {
  g.fillStyle = colour;
  g.font = `700 ${size}px ui-monospace, Consolas, monospace`;
  g.textBaseline = 'middle';
  g.fillText(text, x, y);
}

function vignette(id: NightScene, f: NightFacts, profile: Profile): Vignette {
  const look: SpriteId = profile.assistantLook ?? 'pal';
  switch (id) {
    case 'mailbox':
      return {
        id,
        pixel(g, t, u) {
          paintBackdrop(g, t, false);
          paintPlant(g);
          paintMailbox(g, true);
          const walk = Math.min(1, u / 0.45);
          const x = CHARACTER_HOME.x + (CHARACTER_AT_MAILBOX.x - CHARACTER_HOME.x) * walk;
          paintHero(g, x, FEET_Y, { pose: walk < 1 ? 'walk' : 'stand', facing: 1, t, motion: true });
          if (u > 0.5) paintCloseUp(g, t, 0.7, Math.min(1, (u - 0.55) / 0.3), false);
        },
      };
    case 'desk':
      return {
        id,
        pixel(g, t, u) {
          paintDesk(g, t, { plug: Math.max(0, Math.min(1, (u - 0.2) / 0.5)), sad: false }, false);
        },
      };
    case 'welcome':
      return {
        id,
        text(g, _t, u) {
          panel(g, 90, 110, 460, 170, 'PAL.EXE');
          line(g, 'Jak ti mám říkat?', 120, 170, 22, DIM);
          g.strokeStyle = INK;
          g.strokeRect(120, 200, 400, 48);
          line(g, `${typed(f.name ?? '', u)}${Math.floor(u * 20) % 2 ? '_' : ''}`, 134, 225, 26);
        },
      };
    case 'fidgets':
      return {
        id,
        pixel(g, t, u) {
          // A crooked picture, straightened, knocked crooked again, straightened.
          const cycle = (u * 3) % 1;
          const angle = cycle < 0.6 ? (1 - cycle / 0.6) * 0.3 : 0.3;
          g.save();
          g.translate(W / 2, 24);
          g.rotate(cycle < 0.6 ? angle : 0.3 * Math.sin(t / 60));
          g.fillStyle = '#b06f3e';
          g.fillRect(-26, 0, 52, 40);
          g.fillStyle = '#a6dcef';
          g.fillRect(-22, 4, 44, 20);
          g.fillStyle = '#7cc66b';
          g.fillRect(-22, 24, 44, 12);
          g.restore();
          g.fillStyle = '#8a96a3';
          g.fillRect(W / 2 - 2, 20, 4, 4);
        },
      };
    case 'paint': {
      const painting = new Painting(paintingRows());
      let filled = false;
      return {
        id,
        pixel(g, t, u) {
          if (!filled && u > 0.35) {
            painting.fill(HOLE_CENTRE[0], HOLE_CENTRE[1], SKY);
            filled = true;
          }
          paintScene(g, t, { painting, held: null, framed: u > 0.55 ? 1 : 0, loose: 0, motion: false });
        },
        text(g, _t, u) {
          if (!f.signature || u < 0.65) return;
          g.save();
          g.translate(400, 290);
          g.rotate(-0.1);
          line(g, typed(f.signature, u, 0.65, 0.9), 0, 0, 34);
          g.restore();
        },
      };
    }
    case 'rescue': {
      const avatar = sprite(look);
      return {
        id,
        pixel(g, t, u) {
          g.fillStyle = '#1b2a40';
          g.fillRect(0, 0, W, H);
          g.fillStyle = '#6f9cc4';
          g.fillRect(48, 8, 64, 86);
          g.fillStyle = '#0d1a2c';
          g.fillRect(50, 10, 60, 82);
          const level = Math.min(1, 0.3 + u * 0.9);
          const top = 92 - 82 * level;
          g.fillStyle = '#2f7fd6';
          g.fillRect(50, top, 60, 92 - top);
          const sink = f.deaths > 0 ? Math.max(0, (u - 0.6) / 0.4) : 0;
          const y = Math.max(12, Math.min(68, top - 18)) + sink * 50;
          g.drawImage(avatar, 66 + Math.round(Math.sin(t / 70) * (1 - sink)), y, 28, 28);
          for (let i = 0; i < 6; i++) {
            g.fillStyle = '#8cc8f7';
            g.fillRect(60 + ((i * 13 + t / 20) % 40), 90 - ((t / 15 + i * 17) % 70), 2, 2);
          }
        },
      };
    }
    case 'shelter': {
      const path = f.path === 'hut' ? 'hut' : 'cave';
      const model = new ShelterModel(
        path,
        SHELTER.plan[path].map((task) => ({ id: task, knocks: SHELTER.tasks[task].knocks })),
      );
      return {
        id,
        pixel(g, t, u) {
          const target = Math.round(u * model.jobs.reduce((n, j) => n + j.knocks, 0));
          let done = model.jobs.reduce((n, j) => n + j.done, 0);
          for (const job of model.jobs) {
            if (!job.started) model.start(job.id);
            while (done < target && !model.isDone(job.id)) {
              model.work(job.id);
              done++;
            }
            if (!model.isDone(job.id)) break;
          }
          paintShelter(g, t, { model, warmth: model.warmth, done: model.finished, motion: true });
        },
      };
    }
    case 'flower':
      return {
        id,
        pixel(g, t, u) {
          const cracks = Math.min(3, Math.floor(u / 0.1));
          const shatterAt = u > 0.4 ? t - (u - 0.4) * SCENE_MS : undefined;
          const waterAt = u > 0.6 ? t - (u - 0.6) * SCENE_MS : undefined;
          paintFlower(g, t, { cracks, shatterAt, waterAt, bloomed: u > 0.9, motion: true });
        },
      };
    case 'dontclick':
      return {
        id,
        text(g, t, u) {
          const n = Math.max(1, f.presses);
          const pressed = Math.min(n, Math.floor(u * (n + 1)));
          const broken = pressed >= n;
          const label = broken ? 'FATAL ERROR' : 'NESAHAT';
          const shake = Math.round(Math.sin(t / 30) * (broken ? 6 : 2));
          g.fillStyle = broken ? '#5a1010' : '#0f3d2c';
          g.fillRect(200 + shake, 160, 240, 80);
          g.strokeStyle = broken ? '#f09595' : INK;
          g.lineWidth = 4;
          g.strokeRect(200 + shake, 160, 240, 80);
          line(g, label, 230 + shake, 200, 32, broken ? '#f09595' : INK);
          line(g, `× ${pressed}`, 470, 200, 26, DIM);
        },
      };
    case 'chest':
      return {
        id,
        text(g, _t, u) {
          const count = Math.round(f.points * Math.min(1, u / 0.6));
          line(g, `● ${count.toLocaleString('cs-CZ')}`, 220, 150, 48);
          if (f.street) line(g, `> ${typed(f.street, u, 0.55, 0.85)}`, 220, 240, 30, DIM);
        },
      };
    case 'plea':
      return {
        id,
        text(g, _t, u) {
          panel(g, 140, 80, 360, 160, 'Zprávy');
          line(g, 'Potvrzovací kód:', 170, 150, 22, DIM);
          line(g, '482 917', 170, 195, 40);
          line(g, `> ${typed('482917', u, 0.4, 0.8)}`, 170, 290, 30);
        },
      };
    case 'download':
      return {
        id,
        text(g, _t, u) {
          panel(g, 120, 120, 400, 150, 'PAL_Pro_setup.exe');
          g.fillStyle = '#0f3d2c';
          g.fillRect(150, 180, 340, 26);
          g.fillStyle = INK;
          g.fillRect(150, 180, 340 * Math.min(1, u / 0.7), 26);
          line(g, u < 0.75 ? 'Stahování…' : u < 0.9 ? '[ Spustit ]' : 'Nainstalováno.', 150, 240, 24);
        },
      };
    case 'prize':
      return {
        id,
        text(g, _t, u) {
          line(g, '★ CERTIFIKÁT ★', 200, 120, 30, DIM);
          line(g, f.name ?? '', 200, 180, 42);
          if (f.email) line(g, `> ${typed(f.email, u, 0.35, 0.85)}`, 120, 260, 26);
        },
      };
  }
}
