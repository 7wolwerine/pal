import { paintWallpaper } from '../pixel/wallpaper.ts';
import { h } from './dom.ts';

/**
 * The computer the player plugged the drive into. Every scene that happens in
 * PAL's window happens on this computer's screen: a monitor with the desktop
 * wallpaper behind the window, a desk under it, and the case with the pink
 * drive still sticking out of it.
 */
export function createPc(win: HTMLElement): HTMLElement {
  const screen = h('div', { class: 'pc__screen' }, win, h('div', { class: 'pc__taskbar', attrs: { 'aria-hidden': 'true' } }, h('span', { class: 'pc__start' }), h('span', { class: 'pc__clock', text: clock() })));
  const wallpaper = wallpaperUrl();
  if (wallpaper) screen.style.backgroundImage = `url(${wallpaper})`;
  const monitor = h('div', { class: 'pc__monitor' }, screen, h('span', { class: 'pc__led', attrs: { 'aria-hidden': 'true' } }));
  const tower = h('div', { class: 'pc__tower', attrs: { 'aria-hidden': 'true' } }, h('span', { class: 'pc__drive' }));
  return h('div', { class: 'pc' }, monitor, h('div', { class: 'pc__stand', attrs: { 'aria-hidden': 'true' } }), tower);
}

function clock(): string {
  const now = new Date();
  return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function wallpaperUrl(): string {
  const c = document.createElement('canvas');
  c.width = 240;
  c.height = 150;
  const g = c.getContext('2d');
  if (!g) return '';
  g.imageSmoothingEnabled = false;
  paintWallpaper(g, 0, 0, 240, 150, { drive: true, taskbar: false });
  return c.toDataURL();
}
