/**
 * Generates the printable AR marker with a QR code inside.
 *
 *   npm run marker -- https://example.github.io/pal/ [outDir]
 *
 * Writes marker.png (print this) and marker.patt (the page loads this).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pngjs from 'pngjs';
import QRCode from 'qrcode';
import { encodePatt, frameMarker, qrToRaster } from '../src/ar/marker.ts';

/** Inner image is 75% of the black square, so the QR stays large enough to scan. */
const PATTERN_RATIO = 0.75;
const PIXELS_PER_MODULE = 16;

const [url, outDir = 'public/ar'] = process.argv.slice(2);
if (!url || !/^https:\/\//.test(url)) {
  console.error('Usage: npm run marker -- <https url> [outDir]\nThe camera only works over HTTPS, so the URL has to be https.');
  process.exit(1);
}

const qr = QRCode.create(url, { errorCorrectionLevel: 'M' });
const inner = qrToRaster(qr.modules, PIXELS_PER_MODULE);
const marker = frameMarker(inner, PATTERN_RATIO);

const png = new pngjs.PNG({ width: marker.size, height: marker.size });
png.data.set(marker.data);

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'marker.png'), pngjs.PNG.sync.write(png));
writeFileSync(join(outDir, 'marker.patt'), encodePatt(inner));

console.log(`Marker for ${url}`);
console.log(`  ${join(outDir, 'marker.png')}  ${marker.size}x${marker.size} px, QR ${qr.modules.size}x${qr.modules.size} modules`);
console.log(`  ${join(outDir, 'marker.patt')}`);
console.log(`On the page: arjs="patternRatio: ${PATTERN_RATIO}" and <a-marker type="pattern" url="marker.patt">`);
