import { audio } from './audio/engine.ts';
import { SCENE_THEME } from './audio/themes.ts';
import { WINDOW_REACTIONS } from './content/window.ts';
import { Director } from './core/director.ts';
import { Witness } from './core/witness.ts';
import type { GameContext, GameScene, Profile, Theme } from './game.ts';
import { chest } from './scenes/chest.ts';
import { crash } from './scenes/crash.ts';
import { desk } from './scenes/desk/index.ts';
import { download } from './scenes/download.ts';
import { dontclick } from './scenes/dontclick.ts';
import { fidgets } from './scenes/fidgets/index.ts';
import { flower } from './scenes/flower/index.ts';
import { glass } from './scenes/glass/index.ts';
import { mailbox } from './scenes/mailbox/index.ts';
import { paint } from './scenes/paint/index.ts';
import { plea } from './scenes/plea.ts';
import { popup } from './scenes/popup.ts';
import { prize } from './scenes/prize.ts';
import { rescue } from './scenes/rescue/index.ts';
import { shelter } from './scenes/shelter/index.ts';
import { reveal } from './scenes/reveal.ts';
import { welcome } from './scenes/welcome.ts';
import { Dialogue } from './ui/dialogue.ts';
import { h } from './ui/dom.ts';
import { createPc } from './ui/pc.ts';
import { createWindow } from './ui/window.ts';

/** The whole game, in order. The reveal stays last; the Director enforces it. */
const SCENES: readonly GameScene[] = [mailbox, desk, welcome, fidgets, paint, rescue, shelter, dontclick, flower, plea, chest, popup, download, prize, glass, crash, reveal];

const THEME_COLOURS: Record<Theme, string> = { harmless: '#FBEAF0', revealed: '#060806' };

function boot(): void {
  const app = document.getElementById('app');
  if (!app) throw new Error('Missing #app.');

  const witness = new Witness();
  const profile: Profile = {};
  let director: Director<GameContext, GameScene> | undefined;
  let closeTries = 0;

  const win = createWindow('PAL', (button) => {
    witness.record({ scene: director?.currentId ?? 'boot', kind: 'window-button', data: { button } });
    if (button === 'minimize') {
      void pal.say(WINDOW_REACTIONS.minimize);
      return;
    }
    if (button === 'close') {
      // Clingy once the player has bonded with the assistant, playful before.
      const lines = profile.bonded ? WINDOW_REACTIONS.closeHard : WINDOW_REACTIONS.closeSoft;
      void pal.say(lines[closeTries % lines.length] ?? '');
      closeTries++;
    }
    // Maximize (and every button) gives the window a frustrated shake.
    win.el.classList.remove('win--nope', 'win--boot');
    // Reading a layout property restarts the animation when the class comes back.
    void win.el.offsetWidth;
    win.el.classList.add('win--nope');
  });
  win.setBadges([
    { icon: 'lock', label: '100% bezpečné' },
    { icon: 'shield', label: 'Ověřeno' },
  ]);

  const pal = new Dialogue();
  // PAL starts out behind bars, as a plain smiley. The look and the name the player
  // picks are only taken on once the player has let them out.
  pal.setCaged(true);
  const stage = h('div', { class: 'stage' });
  win.body.append(pal.el, stage);
  const scenery = h('div', { class: 'scenery' });
  const pc = createPc(win.el);
  app.append(scenery, pc);

  document.addEventListener('pointerdown', () => witness.tally('click'));

  // Music can only start after a user gesture; the first click or key does it.
  const unlockAudio = (): void => audio.unlock();
  document.addEventListener('pointerdown', unlockAudio, { capture: true });
  document.addEventListener('keydown', unlockAudio, { capture: true });

  const mute = h('button', {
    class: 'mute',
    attrs: { type: 'button', 'aria-label': 'Ztlumit hudbu', 'aria-pressed': 'false' },
    text: '♪',
  });
  mute.addEventListener('click', () => {
    audio.setMuted(!audio.muted);
    mute.setAttribute('aria-pressed', String(audio.muted));
    mute.setAttribute('aria-label', audio.muted ? 'Zapnout hudbu' : 'Ztlumit hudbu');
    mute.classList.toggle('mute--off', audio.muted);
  });
  document.body.append(mute);

  const ctx: GameContext = {
    witness,
    profile,
    scenery,
    window: win,
    pal,
    stage,
    setTheme(theme) {
      document.documentElement.dataset.theme = theme;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOURS[theme]);
    },
  };

  let winWasHidden = true;
  director = new Director(SCENES, ctx, (scene) => {
    // Pixel scenes take the whole view; everything else happens in PAL's window.
    const onScenery = scene.surface === 'scenery';
    scenery.hidden = !onScenery;
    pc.hidden = onScenery;
    document.body.classList.toggle('on-pc', !onScenery);
    // Power the window on with a boot animation each time it reappears.
    if (!onScenery && winWasHidden) {
      win.el.classList.remove('win--boot');
      void win.el.offsetWidth;
      win.el.classList.add('win--boot');
      const settle = (event: AnimationEvent): void => {
        if (event.target !== win.el) return;
        win.el.classList.remove('win--boot');
        win.el.removeEventListener('animationend', settle);
      };
      win.el.addEventListener('animationend', settle);
      // A four-pointed star flashes in the middle as the window powers on.
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const star = h('span', { class: 'boot-star', attrs: { 'aria-hidden': 'true' } });
        star.addEventListener('animationend', () => star.remove());
        win.el.append(star);
      }
    }
    winWasHidden = onScenery;
    // Each scene has its own calm theme; the reveal turns it dark.
    audio.play(SCENE_THEME[scene.id] ?? 'window');
  });

  // Development handle for poking at the live game from the console. Stripped from the build.
  if (import.meta.env.DEV) Object.assign(window, { __pal: { audio, witness, profile } });

  // `?debug` (or the dev server) shows arrows that skip between scenes, and
  // `?scene=<id>` jumps straight to one. Nothing has to be filled in first.
  const params = new URLSearchParams(location.search);
  const debug = import.meta.env.DEV || params.has('debug');
  const jump = debug ? params.get('scene') : null;
  if (debug) addDebugArrows(director, profile, pal);
  if (jump) {
    fillDebugProfile(profile);
    debugBond(director.sceneIds, jump, profile, pal);
    director.jumpTo(jump);
  } else director.start();
}

/** Stand-in answers so any scene can be opened on its own. */
function fillDebugProfile(profile: Profile): void {
  profile.name ??= 'Tester';
  profile.assistantLook ??= 'cat';
  profile.assistantName ??= 'Micka';
  profile.role ??= 'helper';
  profile.bonded ??= true;
}

/** Past the safe, the assistant is already out: show it as the player would have it by then. */
function debugBond(ids: readonly string[], target: string, profile: Profile, pal: Dialogue): void {
  if (ids.indexOf(target) <= ids.indexOf('fidgets') || !profile.assistantLook) return;
  pal.setAvatar(profile.assistantLook);
  pal.setCaged(false);
  if (profile.assistantName) pal.setName(profile.assistantName);
}

function addDebugArrows(director: Director<GameContext, GameScene>, profile: Profile, pal: Dialogue): void {
  const ids = director.sceneIds;
  const go = (step: number): void => {
    const at = ids.indexOf(director.currentId ?? ids[0] ?? '');
    const next = ids[Math.max(0, Math.min(ids.length - 1, at + step))];
    if (!next) return;
    fillDebugProfile(profile);
    debugBond(ids, next, profile, pal);
    director.jumpTo(next);
  };
  const label = h('span', { class: 'debug__label' });
  const bar = h(
    'nav',
    { class: 'debug', attrs: { 'aria-label': 'Ladění scén' } },
    h('button', { class: 'debug__btn', text: '◀', attrs: { type: 'button', 'aria-label': 'Předchozí scéna' }, on: { click: () => go(-1) } }),
    label,
    h('button', { class: 'debug__btn', text: '▶', attrs: { type: 'button', 'aria-label': 'Další scéna' }, on: { click: () => go(1) } }),
  );
  const show = (): void => {
    label.textContent = director.currentId ?? '';
    requestAnimationFrame(show);
  };
  show();
  document.body.append(bar);
}

boot();
