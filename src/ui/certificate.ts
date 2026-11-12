import { PRIZE } from '../content/prize.ts';
import { sprite, type SpriteId } from './sprites.ts';

export const CERT_W = 600;
export const CERT_H = 375;

/** Draws the prize certificate onto a fresh, fully opaque canvas. */
export function drawCertificate(opts: { name: string; assistant: SpriteId; date: Date }): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = CERT_W;
  c.height = CERT_H;
  const g = c.getContext('2d');
  if (!g) return c;

  // Opaque background (keeps every pixel's alpha at 255 for the hidden data).
  g.fillStyle = '#fbeaf0';
  g.fillRect(0, 0, CERT_W, CERT_H);
  g.fillStyle = '#f4c0d1';
  for (let y = 12; y < CERT_H; y += 22) for (let x = 12; x < CERT_W; x += 22) g.fillRect(x, y, 3, 3);

  // Frame.
  g.fillStyle = '#ed93b1';
  g.fillRect(14, 14, CERT_W - 28, 8);
  g.fillRect(14, CERT_H - 22, CERT_W - 28, 8);
  g.fillRect(14, 14, 8, CERT_H - 28);
  g.fillRect(CERT_W - 22, 14, 8, CERT_H - 28);
  g.fillStyle = '#fffdfb';
  g.fillRect(30, 30, CERT_W - 60, CERT_H - 60);

  // Stars.
  g.fillStyle = '#ffd23f';
  for (const [x, y] of [
    [70, 70],
    [530, 70],
    [70, 305],
    [530, 305],
  ] as const) {
    g.fillRect(x - 2, y - 10, 4, 20);
    g.fillRect(x - 10, y - 2, 20, 4);
  }

  // The assistant, big and pixelated.
  const s = sprite(opts.assistant);
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#fbeaf0';
  g.fillRect(64, 112, 132, 132);
  g.drawImage(s, 70, 118, 120, 120);

  g.fillStyle = '#4b1528';
  g.textBaseline = 'alphabetic';
  g.font = '700 22px "Segoe UI", system-ui, sans-serif';
  g.fillText('PAL', 230, 84);
  g.font = '700 24px "Segoe UI", system-ui, sans-serif';
  g.fillText(PRIZE.certificate.title, 230, 118);
  g.font = '400 16px "Segoe UI", system-ui, sans-serif';
  g.fillStyle = '#993556';
  g.fillText(PRIZE.certificate.awarded, 230, 152);
  g.font = '700 34px "Segoe UI", system-ui, sans-serif';
  g.fillStyle = '#d4537e';
  g.fillText(opts.name.slice(0, 18), 230, 192);
  g.font = '700 20px "Segoe UI", system-ui, sans-serif';
  g.fillStyle = '#4b1528';
  g.fillText(`${PRIZE.scoreLabel}: ${PRIZE.score.toLocaleString('cs-CZ')}`, 230, 232);
  g.font = '400 16px "Segoe UI", system-ui, sans-serif';
  g.fillStyle = '#993556';
  g.fillText(PRIZE.rank, 230, 258);
  g.fillText(opts.date.toLocaleDateString('cs-CZ'), 230, 300);
  g.fillText(PRIZE.certificate.footer, 380, 300);
  return c;
}
