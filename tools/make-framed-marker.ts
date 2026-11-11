/**
 * Generates the printed code with the marker outside and the QR inside: a
 * dark frame for the AR tracker around a pink QR code with a bear in it.
 *
 *   node tools/make-framed-marker.ts [https url] [outDir]
 *
 * Without a URL it encodes `arUrl` from pal.config.json. Writes
 * pal-marker.png (print this) and pal-marker.patt (the AR page loads this).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pngjs from 'pngjs';
import QRCode from 'qrcode';
import { encodePatt, rotateCcw } from '../src/ar/marker.ts';
import { crop, finderAsFramedPattern, frameQr, framedLayout } from '../src/ar/framed.ts';
import { similarity } from '../src/ar/nested.ts';

/** With three quiet modules this makes the frame a whole number of pixels thick. */
const PIXELS_PER_MODULE = 36;
const PATTERN_RATIO = 0.75;
/** AR.js accepts a match from 0.6 up; stay well under it for anything that is not our marker. */
const MAX_LOOKALIKE = 0.4;
/** The four rotations have to look different, or the model would face the wrong way. */
const MAX_ROTATION_LIKENESS = 0.8;

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
    'Usage: node tools/make-framed-marker.ts [https url] [outDir]\n' +
      'Give a URL or set "arUrl" in pal.config.json. It has to be https, the camera only works over HTTPS.',
  );
  process.exit(1);
}

// Level H: the bear covers the middle of the code and the scanner has to repair it.
const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
const options = { pixelsPerModule: PIXELS_PER_MODULE, patternRatio: PATTERN_RATIO };
const layout = framedLayout(qr.modules.size, options);
const sheet = frameQr(qr.modules, options);
const inner = crop(sheet, layout.innerAt, layout.innerSize);

const likeCorner = similarity(inner, finderAsFramedPattern(PATTERN_RATIO));
if (likeCorner > MAX_LOOKALIKE) {
  console.error(`The code looks too much like one of its own corner squares (similarity ${likeCorner.toFixed(2)}, limit ${MAX_LOOKALIKE}).`);
  process.exit(1);
}
let turned = inner;
let likeTurned = -1;
for (let turn = 1; turn < 4; turn++) {
  turned = rotateCcw(turned);
  likeTurned = Math.max(likeTurned, similarity(inner, turned));
}
if (likeTurned > MAX_ROTATION_LIKENESS) {
  console.error(`The code looks too much the same when turned (similarity ${likeTurned.toFixed(2)}, limit ${MAX_ROTATION_LIKENESS}).`);
  process.exit(1);
}

const png = new pngjs.PNG({ width: sheet.size, height: sheet.size });
png.data.set(sheet.data);

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'pal-marker.png'), pngjs.PNG.sync.write(png));
writeFileSync(join(outDir, 'pal-marker.patt'), encodePatt(inner));

const frameShare = layout.frameSize / layout.size;
console.log(`Code for ${url}`);
console.log(`  ${join(outDir, 'pal-marker.png')}  ${sheet.size}x${sheet.size} px, QR ${qr.modules.size}x${qr.modules.size} modules`);
console.log(`  ${join(outDir, 'pal-marker.patt')}`);
console.log(`The frame is ${(frameShare * 100).toFixed(1)}% of the printed width (${(18 * frameShare).toFixed(1)} cm when printed 18 cm wide).`);
console.log(`The QR is ${((layout.qrSize / layout.size) * 100).toFixed(1)}% of the printed width.`);
console.log(`Similarity to its own corner square: ${likeCorner.toFixed(2)}; to itself turned: ${likeTurned.toFixed(2)} (AR.js needs 0.6 to accept a match).`);
console.log(`On the page: arjs="patternRatio: ${PATTERN_RATIO}" and <a-marker type="pattern" url="pal-marker.patt">`);
