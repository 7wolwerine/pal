import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';

/**
 * The shipped build may talk to nobody but itself (to load its own music) and
 * PAL's mail server, and only to send the certificate the player asked for.
 * `connect-src` makes that a browser-enforced fact instead of a promise:
 * fetch, XHR, WebSocket and sendBeacon to anywhere else are refused.
 * Applied to the build only, because the dev server needs its HMR socket.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  // The game's own files (the music loops), and one exception: PAL's mail server, for the certificate the player asks for.
  "connect-src 'self' https://neotvir.at",
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
