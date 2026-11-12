import { Director } from './core/director.ts';
import { Witness } from './core/witness.ts';
import type { GameContext, GameScene, Theme } from './game.ts';
import { desk } from './scenes/desk/index.ts';
import { fidgets } from './scenes/fidgets/index.ts';
import { mailbox } from './scenes/mailbox/index.ts';
import { rescue } from './scenes/rescue/index.ts';
import { reveal } from './scenes/reveal.ts';
import { welcome } from './scenes/welcome.ts';
import { Dialogue } from './ui/dialogue.ts';
import { h } from './ui/dom.ts';
import { createWindow } from './ui/window.ts';

/** The whole game, in order. The reveal stays last; the Director enforces it. */
const SCENES: readonly GameScene[] = [mailbox, desk, welcome, fidgets, rescue, reveal];

const THEME_COLOURS: Record<Theme, string> = { harmless: '#FBEAF0', revealed: '#060806' };

function boot(): void {
  const app = document.getElementById('app');
  if (!app) throw new Error('Missing #app.');

  const witness = new Witness();
  let director: Director<GameContext, GameScene> | undefined;

  const win = createWindow('PAL', (button) => {
    witness.record({ scene: director?.currentId ?? 'boot', kind: 'window-button', data: { button } });
    win.el.classList.remove('win--nope');
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
  app.append(scenery, win.el);

  document.addEventListener('pointerdown', () => witness.tally('click'));

  const ctx: GameContext = {
    witness,
    profile: {},
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
    win.el.hidden = onScenery;
    // Power the window on with a boot animation each time it reappears.
    if (!onScenery && winWasHidden) {
      win.el.classList.remove('win--boot');
      void win.el.offsetWidth;
      win.el.classList.add('win--boot');
    }
    winWasHidden = onScenery;
  });

  // `?scene=reveal` jumps straight to a scene while developing. Stripped from the build.
  const jump = import.meta.env.DEV ? new URLSearchParams(location.search).get('scene') : null;
  if (jump) director.jumpTo(jump);
  else director.start();
}

boot();
