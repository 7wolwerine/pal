import type { Scene } from '../core/director.ts';
import type { GameContext } from '../game.ts';
import { h } from '../ui/dom.ts';
import { buildReveal } from './reveal-model.ts';

/**
 * The reveal. Always the last scene: it replays what the player did and names
 * every trick. It also re-skins the same window, which is the point: nothing
 * about the friendly look was ever evidence of anything.
 */
export const reveal: Scene<GameContext> = {
  id: 'reveal',
  final: true,
  mount(ctx) {
    const model = buildReveal(ctx.witness);

    ctx.setTheme('revealed');
    ctx.window.setTitle('PAL.EXE');
    ctx.window.setBadges([
      { icon: 'lock', label: 'zámeček jsem si nakreslil sám' },
      { icon: 'shield', label: 'ověřil jsem se sám' },
    ]);

    const disclosed = h('dl');
    for (const item of model.disclosed) {
      disclosed.append(h('dt', { text: item.label }), h('dd', { text: item.value }));
    }

    const tricks = h('ol');
    for (const trick of model.tricks) {
      tricks.append(
        h(
          'li',
          {},
          h('strong', { text: trick.name }),
          h('span', { text: trick.inGame }),
          trick.detail && h('div', { text: trick.detail }),
          h('div', { class: 'real', text: `V praxi: ${trick.realWorld}` }),
        ),
      );
    }

    const { seconds, clicks, windowButtons, vigilance } = model.stats;
    const again = h('button', {
      class: 'btn',
      text: 'Hrát znovu',
      attrs: { type: 'button' },
      on: { click: () => location.reload() },
    });

    ctx.window.body.replaceChildren(
      h(
        'article',
        { class: 'reveal' },
        h('h1', { text: 'Congratz, you’ve been scammed!' }),
        h('p', { text: `Trvalo to ${seconds} s a ${clicks} kliknutí. Nic z toho jsem si nemusel brát.` }),
        h('h2', { text: 'Co o tobě vím' }),
        disclosed,
        h('h2', { text: 'Na co to zabralo' }),
        tricks,
        windowButtons > 0 &&
          h('p', { text: `Pokusů zavřít nebo schovat okno: ${windowButtons}. A přesto jsme tady.` }),
        h('h2', { text: 'Ostražitost' }),
        h('p', {
          text:
            vigilance > 0
              ? `Body za ostražitost: ${vigilance}. Něco nesedělo a šlo se to prověřit. To dělá málokdo.`
              : 'Body za ostražitost: 0. Pár věcí nesedělo a šlo na ně sáhnout. Nikdo to neřekl nahlas.',
        }),
        h('h2', { text: 'Pro klid duše' }),
        h('p', {
          text: 'Nic z toho neopustilo tvoje zařízení a po zavření stránky to zmizí. Nevěř mi. Otevři DevTools a podívej se na záložku Network.',
        }),
        again,
      ),
    );
    again.focus();
  },
};
