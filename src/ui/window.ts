import { h, icon, ICONS } from './dom.ts';

export type WindowButton = 'minimize' | 'maximize' | 'close';

export interface FakeWindow {
  readonly el: HTMLElement;
  /** Scenes render into this. */
  readonly body: HTMLElement;
  setTitle(title: string): void;
  /** Replaces the trust badges under the content. */
  setBadges(badges: readonly Badge[]): void;
}

export interface Badge {
  readonly icon: keyof typeof ICONS;
  readonly label: string;
}

const BUTTON_LABELS: Record<WindowButton, string> = {
  minimize: 'Minimalizovat',
  maximize: 'Maximalizovat',
  close: 'Zavřít',
};

/**
 * A window drawn inside the page. It is an ordinary element, so whatever it
 * later does (glitch, fall apart, blue screen) stays inside the page and never
 * touches the real system.
 */
export function createWindow(title: string, onButton: (button: WindowButton) => void): FakeWindow {
  const titleEl = h('span', { class: 'win__title', text: title });
  const body = h('div', { class: 'win__body' });
  const foot = h('div', { class: 'win__foot' });

  const buttons = (['minimize', 'maximize', 'close'] as const).map((name) =>
    h(
      'button',
      {
        class: 'win__btn',
        attrs: { type: 'button', 'aria-label': BUTTON_LABELS[name] },
        on: { click: () => onButton(name) },
      },
      icon(ICONS[name]),
    ),
  );

  const el = h(
    'section',
    { class: 'win', attrs: { 'aria-label': 'PAL' } },
    h('header', { class: 'win__bar' }, icon(ICONS.heart, 'win__icon'), titleEl, ...buttons),
    body,
    foot,
  );

  return {
    el,
    body,
    setTitle: (next) => {
      titleEl.textContent = next;
    },
    setBadges: (badges) => {
      foot.replaceChildren(
        ...badges.map((b) => h('span', { class: 'chip' }, icon(ICONS[b.icon]), h('span', { text: b.label }))),
      );
    },
  };
}
