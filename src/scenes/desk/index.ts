import { DESK } from '../../content/intro.ts';
import type { GameScene } from '../../game.ts';
import { PixelStage, progress } from '../../pixel/stage.ts';
import { h, prefersReducedMotion } from '../../ui/dom.ts';
import { printSurprise, surprise } from '../../ui/print.ts';
import { SCREEN_RECT, STAGE_HEIGHT, STAGE_WIDTH, USB_RECT, paintDesk, paintPortHint } from './art.ts';
import { PrintFlow, REFUSALS_BEFORE_WAY_OUT, type PrintAction } from './model.ts';

const SCENE = 'desk';
const PLUG_MS = 600;
const TOAST_MS = 1500;

interface Choice {
  readonly label: string;
  readonly action: PrintAction;
  readonly quiet?: boolean;
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

    const screen = stage.overlay(SCREEN_RECT, 'scene__screen');
    const flow = new PrintFlow();
    const timers: number[] = [];
    let now = 0;
    let pluggedAt: number | undefined;

    const usb = stage.hotspot(USB_RECT, DESK.usbLabel, () => {
      if (pluggedAt !== undefined) return;
      pluggedAt = now;
      usb.hidden = true;
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
      paintDesk(g, t, { plug, sad: flow.state === 'sad' }, motion);
      if (pluggedAt === undefined) paintPortHint(g, motion ? t : 0);
    });

    return () => {
      stage.stop();
      for (const timer of timers) window.clearTimeout(timer);
      ctx.scenery.replaceChildren();
    };
  },
};
