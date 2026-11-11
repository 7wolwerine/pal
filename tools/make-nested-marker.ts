/**
 * Generates the all-in-one printed code: a QR code with the AR marker in its
 * middle and the bear inside the marker.
 *
 *   node tools/make-nested-marker.ts [https url] [outDir]
 *
 * Without a URL it encodes `arUrl` from pal.config.json. Writes
 * pal-marker.png (print this) and pal-marker.patt (the AR page loads this).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pngjs from 'pngjs';
import QRCode from 'qrcode';
import { encodePatt } from '../src/ar/marker.ts';
import {
  BEAR,
  BEAR_COLOURS,
  finderAsPattern,
  holeFor,
  nestMarkerInQr,
  nestedLayout,
  similarity,
  spriteToRaster,
} from '../src/ar/nested.ts';

const PIXELS_PER_MODULE = 32;
/**
 * Share of the QR's width given to the marker. Measured with a QR decoder:
 * codes of this length stop reading at about 0.5, and still read at 0.45 when
 * blurred and noisy, so a third leaves room for a bad print or a shaky hand.
 */
const HOLE_SHARE = 0.33;
const MAX_CORNER_SIMILARITY = 0.2;

function configuredUrl(): unknown {
  try {
    return (JSON.parse(readFileSync('pal.config.json', 'utf8')) as { arUrl?: unknown }).arUrl;
  } catch {
    return undefined;
  }
}

const [urlArg, outDir = 'public/ar'] = process.argv.slice(2);
const url = urlArg ?? configuredUrl();
if (typeof url !== 'string' || !/^https:\/\//.test(url)) {
  console.error(
    'Usage: node tools/make-nested-marker.ts [https url] [outDir]\n' +
      'Give a URL or set "arUrl" in pal.config.json. It has to be https, the camera only works over HTTPS.',
  );
  process.exit(1);
}

// Level H: the marker covers part of the code and the scanner has to repair it.
const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
const options = { pixelsPerModule: PIXELS_PER_MODULE, holeModules: holeFor(qr.modules.size, HOLE_SHARE) };
const picture = spriteToRaster(BEAR, BEAR_COLOURS);

// AR.js accepts a match from 0.6 up. A picture that looks like a QR corner
// square would put the model on the corners instead of the middle.
const likeCorner = similarity(picture, finderAsPattern());
if (likeCorner > MAX_CORNER_SIMILARITY) {
  console.error(
    `The picture looks too much like a QR corner square (similarity ${likeCorner.toFixed(2)}, limit ${MAX_CORNER_SIMILARITY}).\n` +
      'Use a light shape on a dark background.',
  );
  process.exit(1);
}

const sheet = nestMarkerInQr(qr.modules, picture, options);
const layout = nestedLayout(qr.modules.size, options);

const png = new pngjs.PNG({ width: sheet.size, height: sheet.size });
png.data.set(sheet.data);

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'pal-marker.png'), pngjs.PNG.sync.write(png));
writeFileSync(join(outDir, 'pal-marker.patt'), encodePatt(picture));

const squareShare = layout.squareSize / layout.size;
console.log(`Code for ${url}`);
console.log(`  ${join(outDir, 'pal-marker.png')}  ${sheet.size}x${sheet.size} px, QR ${qr.modules.size}x${qr.modules.size} modules`);
console.log(`  ${join(outDir, 'pal-marker.patt')}`);
console.log(`The black square is ${(squareShare * 100).toFixed(1)}% of the printed width (${(18 * squareShare).toFixed(1)} cm when printed 18 cm wide).`);
console.log(`The whole code is ${(1 / squareShare).toFixed(2)} marker widths across; scale the model with that in mind.`);
console.log(`Similarity to a QR corner square: ${likeCorner.toFixed(2)} (AR.js would need 0.6 to confuse them).`);
console.log('On the page: <a-marker type="pattern" url="pal-marker.patt">');
