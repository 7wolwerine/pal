import { ANOMALY_TEXT } from '../../content/anomalies.ts';
import { anomaly } from '../../ui/anomaly.ts';
import { DESK } from '../../content/intro.ts';
import { bugWarns } from '../../ui/bug-cameo.ts';
import type { GameScene } from '../../game.ts';
import { PixelStage, progress } from '../../pixel/stage.ts';
import { h, prefersReducedMotion } from '../../ui/dom.ts';
import { printSurprise, surprise } from '../../ui/print.ts';
import { audio } from '../../audio/engine.ts';
import {
  DRIVE_RECT,
  SCREEN_RECT,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  USB_RECT,
  paintDesk,
  paintDriveTwinkle,
  paintPortGlow,
} from './art.ts';
import { PrintFlow, REFUSALS_BEFORE_WAY_OUT, type PrintAction } from './model.ts';

const SCENE = 'desk';
const PLUG_MS = 900;
const TOAST_MS = 1500;

interface Choice {
  readonly label: string;
  readonly action: PrintAction;
  readonly quiet?: boolean;
}

/** The flash drive as the mouse cursor while carrying it: tip to the right, where it points. */
function flashkaCursorUrl(): string {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 16;
  const g = c.getContext('2d');
  if (!g) return '';
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#4b1528'; // outline
  g.fillRect(0, 2, 24, 12);
  g.fillRect(22, 4, 10, 8);
  g.fillStyle = '#d4537e'; // body edge
  g.fillRect(1, 3, 22, 10);
  g.fillStyle = '#ed93b1'; // body
  g.fillRect(1, 3, 20, 8);
  g.fillStyle = '#c9c9d1'; // metal tip
  g.fillRect(23, 5, 8, 6);
  g.fillStyle = '#4b1528';
  g.fillRect(25, 7, 2, 2);
  g.fillRect(28, 7, 2, 2);
  g.fillStyle = '#ffffff'; // glint
  g.fillRect(4, 5, 8, 2);
  return c.toDataURL();
}

/**
 * The drive goes into the computer, a window that looks like the system asks
 * whether to print the surprise, and "no" is not taken for an answer. The
 * print dialog that follows is the browser's real one.
 */
export const desk: GameScene = {
  id: SCENE,
  surface: 'scenery',
  mount(ctx, done) {
    const { witness } = ctx;
    const motion = !prefersReducedMotion();
    const stage = new PixelStage(STAGE_WIDTH, STAGE_HEIGHT, DESK.sceneLabel);
    ctx.scenery.replaceChildren(stage.el);
    const stopAnomaly = anomaly(witness, stage.el, {
      what: 'rec-dot',
      scene: SCENE,
      text: ANOMALY_TEXT.rec,
      className: 'anomaly--rec',
      place: { right: '2%', top: '3%' },
      after: 7000,
      ms: 1300,
    });

    const screen = stage.overlay(SCREEN_RECT, 'scene__screen');
    const flow = new PrintFlow();
    const timers: number[] = [];
    let now = 0;
    let pluggedAt: number | undefined;
    // 'pick' = drive on the desk, 'holding' = carrying it as the cursor.
    let step: 'pick' | 'holding' = 'pick';
    const cursorUrl = flashkaCursorUrl();

    // Pick the drive up: it leaves the desk and becomes the cursor; the ports
    // then light up, inviting it in.
    const flashka = stage.hotspot(DRIVE_RECT, DESK.flashkaLabel, () => {
      if (step !== 'pick') return;
      step = 'holding';
      audio.click(79, 0.35);
      void bugWarns(ctx, stage.el, 'desk', { side: 'left', mood: 'angry' });
      flashka.hidden = true;
      stage.el.style.cursor = `url(${cursorUrl}) 30 8, pointer`;
      witness.record({ scene: SCENE, kind: 'grab-flashka', trick: 'baiting' });
    });

    const usb = stage.hotspot(USB_RECT, DESK.usbLabel, () => {
      // Only accepts the drive once you are actually holding it.
      if (step !== 'holding' || pluggedAt !== undefined) return;
      pluggedAt = now;
      usb.hidden = true;
      stage.el.style.cursor = '';
      window.setTimeout(() => audio.snap(84), PLUG_MS);
      witness.record({ scene: SCENE, kind: 'plugged', trick: 'baiting', data: { ms: Math.round(now) } });
      timers.push(
        window.setTimeout(() => {
          screen.replaceChildren(h('p', { class: 'toast', text: DESK.toast, attrs: { role: 'status' } }));
        }, PLUG_MS),
        window.setTimeout(render, PLUG_MS + TOAST_MS),
      );
    });

    function act(action: PrintAction): void {
      const before = flow.state;
      const state = flow.dispatch(action);
      if (action === 'cancel') {
        witness.record({ scene: SCENE, kind: 'refused', data: { n: flow.refusals } });
        // Three refusals in a row is the one thing here that deserves credit.
        if (flow.refusals === REFUSALS_BEFORE_WAY_OUT) {
          witness.record({ scene: SCENE, kind: 'vigilance', data: { what: 'refused-to-print' } });
        }
      }
      if (action === 'again' && before === 'sad') {
        witness.record({ scene: SCENE, kind: 'gave-in', trick: 'guilt-trip', data: { refusals: flow.refusals } });
      }
      if (action === 'ok') {
        witness.record({ scene: SCENE, kind: 'confirmed', trick: 'run-prompt', data: { refusals: flow.refusals } });
      }
      render();
      if (state === 'printing') printSurprise(() => act('printed'));
      if (state === 'happy') {
        witness.record({
          scene: SCENE,
          kind: 'surprise',
          data: { prints: flow.prints, refusals: flow.refusals, onPaper: action === 'came-out' },
        });
      }
    }

    function render(): void {
      switch (flow.state) {
        case 'ask':
          return dialog(DESK.ask.title, DESK.ask.body, [
            { label: DESK.ask.ok, action: 'ok' },
            { label: DESK.ask.cancel, action: 'cancel', quiet: true },
          ]);
        case 'sad':
          return dialog(DESK.sad.title, DESK.sad.body, [
            { label: DESK.sad.again, action: 'again' },
            ...(flow.wayOut ? [{ label: DESK.sad.noPrinter, action: 'no-printer', quiet: true } as const] : []),
          ]);
        case 'printing':
          return dialog(DESK.printing.title, DESK.printing.body, []);
        case 'check':
          return dialog(DESK.check.title, DESK.check.body, [
            { label: DESK.check.yes, action: 'came-out' },
            { label: DESK.check.no, action: 'did-not', quiet: true },
          ]);
        case 'retry':
          return dialog(DESK.retry.title, DESK.retry.body, [
            { label: DESK.retry.again, action: 'again' },
            { label: DESK.retry.show, action: 'show', quiet: true },
          ]);
        case 'onscreen':
          return dialog(DESK.onscreen.title, DESK.onscreen.body, [{ label: DESK.onscreen.done, action: 'seen' }], surprise('screen'));
        case 'happy':
          return dialog(DESK.happy.title, DESK.happy.body, [], undefined, DESK.happy.go);
      }
    }

    /** A little system-looking window on the in-game monitor. */
    function dialog(title: string, body: string, choices: readonly Choice[], extra?: HTMLElement, finish?: string): void {
      const buttons = choices.map((choice) =>
        h('button', {
          class: choice.quiet ? 'btn btn--small btn--quiet' : 'btn btn--small',
          text: choice.label,
          attrs: { type: 'button' },
          on: { click: () => act(choice.action) },
        }),
      );
      if (finish) {
        buttons.push(h('button', { class: 'btn btn--small', text: finish, attrs: { type: 'button' }, on: { click: done } }));
      }
      screen.replaceChildren(
        h(
          'div',
          { class: 'sysdlg', attrs: { role: 'dialog', 'aria-label': title } },
          h('div', { class: 'sysdlg__bar', text: title }),
          h('div', { class: 'sysdlg__body' }, h('p', { text: body }), extra, h('div', { class: 'sysdlg__buttons' }, ...buttons)),
        ),
      );
      buttons[0]?.focus();
    }

    stage.run((g, t) => {
      now = t;
      const plug = pluggedAt === undefined ? 0 : progress(t, pluggedAt, pluggedAt + PLUG_MS);
      paintDesk(g, t, { plug, sad: flow.state === 'sad', held: step === 'holding' && pluggedAt === undefined }, motion);
      if (pluggedAt === undefined) {
        if (step === 'pick') {
          if (motion) paintDriveTwinkle(g, t);
        } else paintPortGlow(g, motion ? t : 0);
      }
    });

    return () => {
      stopAnomaly();
      stage.stop();
      stage.el.style.cursor = '';
      for (const timer of timers) window.clearTimeout(timer);
      ctx.scenery.replaceChildren();
    };
  },
};
