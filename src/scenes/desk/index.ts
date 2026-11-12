import { ANOMALY_TEXT } from '../../content/anomalies.ts';
import { anomaly } from '../../ui/anomaly.ts';
import { DESK } from '../../content/intro.ts';
import { bugWarns } from '../../ui/bug-cameo.ts';
import type { GameScene } from '../../game.ts';
import { PixelStage, progress } from '../../pixel/stage.ts';
import { h, prefersReducedMotion } from '../../ui/dom.ts';
import { printSurprise, surprise } from '../../ui/print.ts';
import {
  SCREEN_RECT,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  USB_RECT,
  paintDesk,
  paintDriveLure,
  paintPortGlow,
} from './art.ts';
import { PrintFlow, REFUSALS_BEFORE_WAY_OUT, type PrintAction } from './model.ts';

const SCENE = 'desk';
const PLUG_MS = 600;
const TOAST_MS = 1500;

interface Choice {
  readonly label: string;
  readonly action: PrintAction;
  readonly quiet?: boolean;
}

/** A little flash-drive image, used as the mouse cursor while carrying it. */
function flashkaCursorUrl(): string {
  const c = document.createElement('canvas');
  c.width = 30;
  c.height = 16;
  const g = c.getContext('2d');
  if (!g) return '';
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#c9c9d1'; // metal tip
  g.fillRect(0, 6, 7, 5);
  g.fillStyle = '#993556'; // body edge
  g.fillRect(7, 3, 22, 11);
  g.fillStyle = '#ed93b1'; // body
  g.fillRect(7, 3, 20, 9);
  g.fillStyle = '#ffffff'; // glint
  g.fillRect(12, 5, 4, 3);
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
    const caption = h('p', { class: 'scene__caption', text: DESK.start, attrs: { 'aria-live': 'polite' } });
    ctx.scenery.replaceChildren(stage.el, caption);
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
    const flashka = stage.hotspot({ x: 106, y: 80, w: 20, h: 12 }, DESK.flashkaLabel, () => {
      if (step !== 'pick') return;
      step = 'holding';
      void bugWarns(ctx, stage.el, 'desk', { side: 'left', mood: 'angry' });
      flashka.hidden = true;
      caption.textContent = DESK.grabbed;
      stage.el.style.cursor = `url(${cursorUrl}) 3 10, pointer`;
      witness.record({ scene: SCENE, kind: 'grab-flashka', trick: 'baiting' });
    });

    const usb = stage.hotspot(USB_RECT, DESK.usbLabel, () => {
      // Only accepts the drive once you are actually holding it.
      if (step !== 'holding' || pluggedAt !== undefined) return;
      pluggedAt = now;
      usb.hidden = true;
      stage.el.style.cursor = '';
      caption.textContent = '';
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
        if (step === 'pick') paintDriveLure(g, motion ? t : 0);
        else paintPortGlow(g, motion ? t : 0);
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
