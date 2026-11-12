import { PRIZE } from '../content/prize.ts';
import { h } from './dom.ts';
import { sprite, type SpriteId } from './sprites.ts';

export const CERT_W = 640;
export const CERT_H = 400;

export interface CertificateFacts {
  readonly name: string;
  readonly title: string;
  readonly assistant: SpriteId;
  readonly score: number;
  readonly rank: number;
  readonly date: Date;
}

/**
 * The certificate on screen: gold frame, a shine that sweeps across it, and
 * little stars twinkling all around. Pure HTML and CSS; the saved picture is
 * drawn separately on a canvas.
 */
export function certificateCard(f: CertificateFacts): HTMLElement {
  const avatar = sprite(f.assistant);
  avatar.classList.add('cert__avatar');
  const stars = h('div', { class: 'cert__stars', attrs: { 'aria-hidden': 'true' } });
  for (let i = 0; i < 14; i++) {
    const star = h('span', { class: 'cert__star' });
    const a = (i / 14) * Math.PI * 2;
    star.style.left = `${50 + Math.cos(a) * 52}%`;
    star.style.top = `${50 + Math.sin(a) * 58}%`;
    star.style.animationDelay = `${(i * 170) % 1400}ms`;
    stars.append(star);
  }
  return h(
    'figure',
    { class: 'cert', attrs: { 'aria-label': `${PRIZE.certificate.kicker}: ${f.title}, ${f.name}` } },
    stars,
    h(
      'div',
      { class: 'cert__inner' },
      h('span', { class: 'cert__shine', attrs: { 'aria-hidden': 'true' } }),
      h('p', { class: 'cert__kicker', text: PRIZE.certificate.kicker }),
      h('p', { class: 'cert__title', text: f.title }),
      h('p', { class: 'cert__awarded', text: PRIZE.certificate.awarded }),
      h('div', { class: 'cert__who' }, avatar, h('p', { class: 'cert__name', text: f.name })),
      h(
        'div',
        { class: 'cert__score' },
        h('span', { class: 'cert__label', text: PRIZE.scoreLabel }),
        h('strong', { class: 'cert__value', text: f.score.toLocaleString('cs-CZ') }),
        h('span', { class: 'cert__rank', text: PRIZE.rank(f.rank) }),
      ),
      h('p', { class: 'cert__foot', text: `${f.date.toLocaleDateString('cs-CZ')} · ${PRIZE.certificate.footer}` }),
    ),
  );
}

/** Draws the certificate onto a fresh, fully opaque canvas, for saving. */
export function drawCertificate(f: CertificateFacts): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = CERT_W;
  c.height = CERT_H;
  const g = c.getContext('2d');
  if (!g) return c;

  // Opaque background (keeps every pixel's alpha at 255 for the hidden data).
  g.fillStyle = '#fbeaf0';
  g.fillRect(0, 0, CERT_W, CERT_H);
  // Gold frame in three bands.
  for (const [inset, colour] of [[10, '#a6741c'], [16, '#ffd23f'], [24, '#fff1a8'], [28, '#e0b13a']] as const) {
    g.fillStyle = colour;
    g.fillRect(inset, inset, CERT_W - inset * 2, CERT_H - inset * 2);
  }
  g.fillStyle = '#fffdf6';
  g.fillRect(34, 34, CERT_W - 68, CERT_H - 68);

  // Four-pointed stars in the corners and along the top.
  const star = (x: number, y: number, r: number): void => {
    g.fillStyle = '#ffd23f';
    g.fillRect(x - 1, y - r, 3, r * 2);
    g.fillRect(x - r, y - 1, r * 2, 3);
    g.fillStyle = '#ffffff';
    g.fillRect(x, y, 1, 1);
  };
  for (const [x, y, r] of [[64, 64, 12], [576, 64, 12], [64, 336, 12], [576, 336, 12], [200, 52, 6], [440, 52, 6], [120, 200, 7], [520, 200, 7]] as const) star(x, y, r);

  g.textAlign = 'center';
  g.fillStyle = '#a6741c';
  g.font = '700 16px "Segoe UI", system-ui, sans-serif';
  g.fillText(PRIZE.certificate.kicker.toUpperCase(), CERT_W / 2, 78);
  g.fillStyle = '#4b1528';
  g.font = '800 34px Georgia, "Times New Roman", serif';
  g.fillText(f.title, CERT_W / 2, 120);
  g.fillStyle = '#993556';
  g.font = 'italic 16px Georgia, serif';
  g.fillText(PRIZE.certificate.awarded, CERT_W / 2, 148);

  const s = sprite(f.assistant);
  g.imageSmoothingEnabled = false;
  g.drawImage(s, CERT_W / 2 - 150, 162, 80, 80);
  g.textAlign = 'left';
  g.fillStyle = '#d4537e';
  g.font = '800 36px "Segoe UI", system-ui, sans-serif';
  g.fillText(f.name.slice(0, 18), CERT_W / 2 - 56, 214);

  g.textAlign = 'center';
  g.fillStyle = '#4b1528';
  g.font = '700 16px "Segoe UI", system-ui, sans-serif';
  g.fillText(PRIZE.scoreLabel, CERT_W / 2, 270);
  g.font = '900 40px "Segoe UI", system-ui, sans-serif';
  g.fillStyle = '#c98f2e';
  g.fillText(f.score.toLocaleString('cs-CZ'), CERT_W / 2, 312);
  g.font = '700 15px "Segoe UI", system-ui, sans-serif';
  g.fillStyle = '#993556';
  g.fillText(PRIZE.rank(f.rank), CERT_W / 2, 336);
  g.font = '400 13px "Segoe UI", system-ui, sans-serif';
  g.fillText(`${f.date.toLocaleDateString('cs-CZ')} · ${PRIZE.certificate.footer}`, CERT_W / 2, 358);
  return c;
}
