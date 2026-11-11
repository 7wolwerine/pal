import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';

/**
 * The shipped build may talk to nobody. `connect-src 'none'` makes that a
 * browser-enforced fact instead of a promise: fetch, XHR, WebSocket and
 * sendBeacon are all refused, so nothing the player types can leave the page.
 * Applied to the build only, because the dev server needs its HMR socket.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'pal-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
            injectTo: 'head-prepend',
          },
        ],
      };
    },
  };
}

export default defineConfig({
  // Relative base: the same build works on GitHub Pages under /repo/ and from a zip.
  base: './',
  plugins: [contentSecurityPolicy()],
  // No modulepreload polyfill: it is the only thing that would put a fetch() call in the bundle.
  build: { target: 'es2022', modulePreload: { polyfill: false } },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
