import { audio } from '../../audio/engine.ts';
import { SHELTER, type ShelterPath, type TaskId } from '../../content/shelter.ts';
import { gendered, lean, type GameScene } from '../../game.ts';
import { kindlyAsked, kindlyObeyed } from '../../core/kindly.ts';
import { PixelStage } from '../../pixel/stage.ts';
import { bugWarns } from '../../ui/bug-cameo.ts';
import { h, prefersReducedMotion, sleep } from '../../ui/dom.ts';
import { Speech } from '../../ui/speech.ts';
import { sprite, type SpriteId } from '../../ui/sprites.ts';
import { CAVE_RECT, GROUND_Y, HUT_RECT, SPOT, STAGE_H, STAGE_W, paintShelter, paintTwinkle } from './art.ts';
import { FLOOR_Y, INSIDE_RECTS, INSIDE_SPOT, paintInside, paintWorn, type Flop } from './inside.ts';
import { ShelterModel } from './model.ts';

const SCENE = 'shelter';
const HINT_AFTER_MS = 4000;
const SIZE = 24;
const WALK_PX_PER_MS = 0.03;

/** How often the cold, sick assistant says how bad it is, in ms. */
const SICK_EVERY_MS = 7000;

/**
 * Out of the water and into the cold. The soaked assistant needs shelter and
 * the player picks where: a hut or a cave. Inside, the blizzard keeps raging
 * outside (it never stops) and the assistant is cold and sick. Three jobs:
 * make it safe, make it warm, find something dry to wear. Every job can be
 * done properly or in a silly way; the silly way flops, the assistant bears
 * it bravely, and the player tries harder. Warm at last, it asks them to stay.
 */
export const shelter: GameScene = {
  id: SCENE,
  surface: 'scenery',
  mount(ctx, done) {
    const motion = !prefersReducedMotion();
    const stage = new PixelStage(STAGE_W, STAGE_H, SHELTER.sceneLabel);
    ctx.scenery.replaceChildren(stage.el);
    const speech = new Speech(stage.el, STAGE_W, STAGE_H);
    const masculine = gendered(ctx.profile, 'm', 'f') === 'm';
    const look: SpriteId = ctx.profile.assistantLook ?? 'pal';
    const avatar = sprite(look);
    const startedAt = performance.now();

    let alive = true;
    let model: ShelterModel | undefined;
    let x: number = SPOT.start;
    let walk: { from: number; to: number; at: number; ms: number } | undefined;
    let warmth = 0;
    let flop: Flop | undefined;
    let knock: { id: TaskId; at: number } | undefined;
    let finished = false;
    let actedAt = 0;
    let now = 0;
    let menu: HTMLElement | undefined;
    /** Inside the chosen place, once the assistant has gone in. */
    let inside = false;
    let lastSick = 0;
    let sickLine = 0;

    const ground = (): number => (inside ? FLOOR_Y : GROUND_Y);
    const head = (): { x: number; y: number } => ({ x: x + SIZE / 2, y: ground() - SIZE });
    const say = (text: string, tap = false): Promise<void> => speech.say(text, head, { who: 'pal', tap });
    const acted = (): void => {
      actedAt = now;
    };

    void say(SHELTER.cold(masculine));

    const hut = stage.hotspot(HUT_RECT, SHELTER.hutLabel, () => choose('hut'));
    const cave = stage.hotspot(CAVE_RECT, SHELTER.caveLabel, () => choose('cave'));

    const taskSpots = new Map<TaskId, HTMLButtonElement>();
    for (const id of Object.keys(INSIDE_RECTS) as TaskId[]) {
      const spot = stage.hotspot(INSIDE_RECTS[id], SHELTER.tasks[id].label, () => onTask(id));
      spot.hidden = true;
      taskSpots.set(id, spot);
    }

    async function choose(path: ShelterPath): Promise<void> {
      if (model) return;
      acted();
      hut.hidden = true;
      cave.hidden = true;
      model = new ShelterModel(
        path,
        SHELTER.plan[path].map((id) => ({ id, knocks: SHELTER.tasks[id].knocks })),
      );
      lean(ctx.profile, path === 'hut' ? 'fixer' : 'loner');
      ctx.witness.record({ scene: SCENE, kind: 'shelter', data: { path } });
      audio.click(72, 0.3);
      void say(SHELTER.chose[path]);
      const to = SPOT[path];
      walk = { from: x, to, at: now, ms: Math.abs(to - x) / WALK_PX_PER_MS };
      window.setTimeout(() => {
        if (alive) void bugWarns(ctx, stage.el, 'shelter', { side: path === 'hut' ? 'right' : 'left', mood: 'angry' });
      }, 3500);
      await sleep(walk.ms + 200);
      if (!alive) return;
      // In through the door: the view goes inside, the storm stays outside the window.
      stage.el.classList.add('shelter--enter');
      await sleep(motion ? 260 : 0);
      if (!alive) return;
      inside = true;
      walk = undefined;
      x = INSIDE_SPOT[path];
      lastSick = now;
      stage.el.classList.remove('shelter--enter');
      void say(SHELTER.arrived[path]);
      refreshSpots();
    }

    function refreshSpots(): void {
      for (const [id, spot] of taskSpots) spot.hidden = !model || finished || !model.jobs.some((j) => j.id === id) || !model.available(id);
    }

    function onTask(id: TaskId): void {
      if (!model || finished || !model.available(id)) return;
      acted();
      const job = model.get(id);
      if (job.started) {
        work(id);
        return;
      }
      openMenu(id);
    }

    /** The proper way and the silly way, in random order. */
    function openMenu(id: TaskId): void {
      menu?.remove();
      const task = SHELTER.tasks[id];
      const r = INSIDE_RECTS[id];
      const options = [
        { text: task.good, good: true },
        { text: task.silly, good: false },
      ];
      if (Math.random() < 0.5) options.reverse();
      const box = stage.overlay({ x: Math.max(2, Math.min(STAGE_W - 52, r.x + r.w / 2 - 25)), y: Math.max(2, r.y - 16), w: 50, h: 14 }, 'shelter__menu');
      for (const option of options) {
        box.append(
          h('button', {
            class: 'shelter__pick',
            text: option.text,
            attrs: { type: 'button' },
            on: {
              click: () => {
                box.remove();
                menu = undefined;
                if (option.good) {
                  model?.start(id);
                  work(id);
                } else void silly(id);
              },
            },
          }),
        );
      }
      menu = box;
      box.querySelector('button')?.focus();
    }

    async function silly(id: TaskId): Promise<void> {
      if (!model) return;
      model.silly(id);
      ctx.witness.tally('silly-fix');
      flop = { id, at: now };
      audio.boing(0.3);
      await say(SHELTER.tasks[id].sillyLine);
    }

    function work(id: TaskId): void {
      if (!model) return;
      const finishedJob = model.work(id);
      knock = { id, at: now };
      if (id === 'fire') audio.click(90, 0.3);
      else audio.knock();
      ctx.witness.tally('shelter-work');
      if (!finishedJob) return;
      audio.snap(79);
      refreshSpots();
      if (model.finished) {
        void warmUp();
        return;
      }
      const left = model.jobs.filter((j) => j.done < j.knocks).length;
      void say(SHELTER.praise[(SHELTER.praise.length - left) % SHELTER.praise.length] ?? '');
    }

    async function warmUp(): Promise<void> {
      if (!model) return;
      finished = true;
      refreshSpots();
      ctx.witness.record({
        scene: SCENE,
        kind: 'sheltered',
        trick: 'helpers-high',
        data: { path: model.path, silly: model.sillyTries, ms: Math.round(performance.now() - startedAt) },
      });
      audio.treasure();
      await sleep(900);
      if (!alive) return;
      await say(SHELTER.warm[model.path], true);
      if (!alive) return;
      await say(SHELTER.thanks(masculine), true);
      if (!alive) return;
      await say(SHELTER.storm);
      if (!alive) return;
      await sleep(1600);
      if (!alive) return;
      await say(SHELTER.stay);
      kindlyAsked(ctx.witness, SCENE);
      if (!alive) return;
      // The answers stand one above another inside the picture, never past its edge.
      const box = stage.overlay({ x: 6, y: 34, w: 64, h: 44 }, 'shelter__menu shelter__menu--stack');
      for (const choice of SHELTER.stayChoices) {
        box.append(
          h('button', {
            class: 'shelter__pick',
            text: choice.label,
            attrs: { type: 'button' },
            on: {
              click: () => {
                lean(ctx.profile, choice.role);
                ctx.witness.record({ scene: SCENE, kind: 'stay', trick: 'role-casting', data: { answer: choice.label } });
                kindlyObeyed(ctx.witness, SCENE);
                box.remove();
                done();
              },
            },
          }),
        );
      }
    }

    stage.run((g, t) => {
      now = t;
      if (walk) {
        const u = Math.min(1, (t - walk.at) / walk.ms);
        x = walk.from + (walk.to - walk.from) * u;
        if (u >= 1) walk = undefined;
      }
      const target = model ? model.warmth : 0;
      warmth += (target - warmth) * 0.05;
      if (inside && model) paintInside(g, t, { path: model.path, model, warmth, flop, knock, motion });
      else paintShelter(g, t, { model, warmth, done: finished, motion });
      // Cold and sick until it is warm: every so often the assistant says how bad it is.
      if (inside && !finished && !menu && t - lastSick > SICK_EVERY_MS && !speech.waiting) {
        lastSick = t;
        void say(SHELTER.sick[sickLine++ % SHELTER.sick.length] ?? '');
      }

      // The assistant: shivering and snowy while cold, bobbing happily once warm.
      const cold = warmth < 0.6;
      const shiver = motion && cold ? Math.round(Math.sin(t / 40)) : 0;
      const hop = motion && finished ? Math.round(Math.abs(Math.sin(t / 220)) * 2) : 0;
      const walking = walk !== undefined && motion ? Math.round(Math.abs(Math.sin(t / 90))) : 0;
      const ax = Math.round(x) + shiver;
      const ay = ground() - SIZE - hop - walking;
      g.drawImage(avatar, ax, ay, SIZE, SIZE);
      // Dry clothes on, once they are found.
      if (inside && model) {
        const wear = model.path === 'hut' ? 'chest' : 'fur';
        if (model.isDone(wear)) paintWorn(g, model.path, ax, ay, SIZE);
      }
      if (cold) {
        g.fillStyle = '#ffffff';
        g.fillRect(ax + 6, ay + 1, 3, 1);
        g.fillRect(ax + 14, ay + 2, 2, 1);
        if (motion && Math.floor(t / 500) % 2 === 0) {
          g.fillStyle = '#bfe3ff';
          g.fillRect(ax - 3, ay + 8, 2, 1);
          g.fillRect(ax + SIZE + 1, ay + 10, 2, 1);
        }
      }

      // Hints when nothing happens for a while.
      if (motion && t - actedAt > HINT_AFTER_MS && !finished && !menu) {
        if (!model) {
          paintTwinkle(g, HUT_RECT.x + 30, HUT_RECT.y + 4, t);
          paintTwinkle(g, CAVE_RECT.x + 32, CAVE_RECT.y + 8, t + 700);
        } else {
          const next = model.jobs.find((j) => model?.available(j.id));
          if (next) {
            const r = INSIDE_RECTS[next.id];
            paintTwinkle(g, r.x + r.w / 2, r.y + 2, t);
          }
        }
      }
    });

    return () => {
      alive = false;
      speech.stop();
      stage.stop();
      ctx.scenery.replaceChildren();
    };
  },
};
