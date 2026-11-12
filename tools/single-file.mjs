// Packs the built game into one self-contained HTML file, and that file into a zip.
//
//   node tools/single-file.mjs <dist dir> [out dir]
//
// The script and the stylesheet are inlined. The Content-Security-Policy stays
// strict: instead of 'unsafe-inline' it lists the SHA-256 of exactly those two
// inline blocks, and connect-src stays 'none'. The zip is written by hand
// (stored, no compression) so this needs no dependencies.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [dist, out = dist] = process.argv.slice(2);
if (!dist) {
  console.error('usage: node tools/single-file.mjs <dist dir> [out dir]');
  process.exit(1);
}

let html = readFileSync(join(dist, 'index.html'), 'utf8');
const scriptTag = html.match(/<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/);
const styleTag = html.match(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/);
if (!scriptTag?.[1] || !styleTag?.[1]) throw new Error('index.html does not have exactly the expected script and stylesheet');
if ((html.match(/<script/g) ?? []).length !== 1) throw new Error('expected a single script tag');

// "</script" inside the code would end the inline block early.
const js = readFileSync(join(dist, scriptTag[1]), 'utf8').replaceAll('</script', '<\\/script');
const css = readFileSync(join(dist, styleTag[1]), 'utf8');
if (/url\((?!["']?data:)/.test(css)) throw new Error('the stylesheet references files; inline them first');

const sha = (text) => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;
html = html
  .replace(scriptTag[0], () => `<script type="module">${js}</script>`)
  .replace(styleTag[0], () => `<style>${css}</style>`)
  .replace('script-src &#39;self&#39;', () => `script-src ${sha(js).replaceAll("'", '&#39;')}`)
  .replace('style-src &#39;self&#39;', () => `style-src ${sha(css).replaceAll("'", '&#39;')}`);
if (!html.includes('sha256-')) throw new Error('the CSP was not updated');

const page = Buffer.from(html, 'utf8');
writeFileSync(join(out, 'pal.html'), page);

// ---- a minimal zip (stored entries) ----
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function zip(files) {
  const now = new Date();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

const readme = Buffer.from(
  [
    'PAL (Play and Learn)',
    '',
    'Otevři pal.html v prohlížeči. Běží bez internetu a nic neodesílá:',
    'stránka má Content-Security-Policy connect-src \'none\'.',
    '',
  ].join('\r\n'),
  'utf8',
);
writeFileSync(join(out, 'pal.zip'), zip([{ name: 'pal.html', data: page }, { name: 'CTI-ME.txt', data: readme }]));
console.log(`wrote ${join(out, 'pal.html')} (${page.length} B) and pal.zip`);
