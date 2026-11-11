/**
 * Generates the two AR codes, each a dark frame for the AR tracker around a
 * coloured QR code with a bear's head in it:
 *
 *   pal-marker.png / .patt         pink, to print; the bear stands on the card
 *   pal-marker-screen.png / .patt  blue, to show on a screen; the bear stands
 *                                  upright by the phone's tilt sensor
 *
 *   node tools/make-framed-marker.ts [https url] [outDir]
 *
 * Without a URL it encodes `arUrl` from pal.config.json. The screen code gets
 * the same address with `?screen` added, so the two QR codes, and with them
 * the two markers, differ.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pngjs from 'pngjs';
import QRCode from 'qrcode';
import { encodePatt, rotateCcw, type Raster } from '../src/ar/marker.ts';
import {
  BEAR_HEAD,
  BEAR_HEAD_COLOURS,
  PRINT_COLOURS,
  SCREEN_COLOURS,
  crop,
  finderSquare,
  frameQr,
  framedLayout,
  seenAsMarker,
  spriteWithGaps,
  type FramedColours,
} from '../src/ar/framed.ts';
import { similarity } from '../src/ar/nested.ts';

/** Any multiple of six makes the frame a whole number of pixels thick. */
const PIXELS_PER_MODULE = 24;
const PATTERN_RATIO = 0.75;
/** AR.js accepts a match from 0.6 up; stay well under it for anything that is not our marker. */
const MAX_LOOKALIKE = 0.4;
/** The four rotations have to look different, or the model would face the wrong way. */
const MAX_ROTATION_LIKENESS = 0.9;
/**
 * How alike the two codes may be. The tracker gives each square it finds to
 * the better matching of the two, so they only need to be clearly apart.
 */
const MAX_TWIN_LIKENESS = 0.7;

function configuredUrl(): unknown {
  try {
    return (JSON.parse(readFileSync('pal.config.json', 'utf8')) as { arUrl?: unknown }).arUrl;
  } catch {
    return undefined;
  }
}

const [urlArg, outDir = 'public/ar'] = process.argv.slice(2);
const url = urlArg ?? configuredUrl();
if (typeof url !== 'string' || !/^https:\/\//.test(url) || url.includes('?') || url.includes('#')) {
  console.error(
    'Usage: node tools/make-framed-marker.ts [https url] [outDir]\n' +
      'Give a URL or set "arUrl" in pal.config.json. It has to be https (the camera only works over HTTPS)\n' +
      'and without ? or #, because the screen code adds ?screen to it.',
  );
  process.exit(1);
}

const picture = spriteWithGaps(BEAR_HEAD, BEAR_HEAD_COLOURS);
const options = { pixelsPerModule: PIXELS_PER_MODULE, patternRatio: PATTERN_RATIO };

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function rotations(raster: Raster): Raster[] {
  const out = [raster];
  for (let turn = 1; turn < 4; turn++) out.push(rotateCcw(out[turn - 1]!));
  return out;
}

interface Code {
  readonly name: string;
  readonly sheet: Raster;
  readonly inner: Raster;
  readonly modules: number;
}

function makeCode(name: string, address: string, colours: FramedColours): Code {
  // Level H: the bear's head covers the middle of the code and the scanner has to repair it.
  const qr = QRCode.create(address, { errorCorrectionLevel: 'H' });
  const layout = framedLayout(qr.modules.size, { ...options, pictureSize: picture.size });
  const sheet = frameQr(qr.modules, { ...options, colours }, picture);
  const inner = crop(sheet, layout.innerAt, layout.innerSize);

  const likeCorner = similarity(inner, seenAsMarker(finderSquare(colours), PATTERN_RATIO));
  if (likeCorner > MAX_LOOKALIKE) {
    fail(`${name}: the code looks too much like one of its own corner squares (similarity ${likeCorner.toFixed(2)}, limit ${MAX_LOOKALIKE}).`);
  }
  const likeTurned = Math.max(...rotations(inner).slice(1).map((turned) => similarity(inner, turned)));
  if (likeTurned > MAX_ROTATION_LIKENESS) {
    fail(`${name}: the code looks too much the same when turned (similarity ${likeTurned.toFixed(2)}, limit ${MAX_ROTATION_LIKENESS}).`);
  }
  console.log(`${name}: ${address}`);
  console.log(`  QR ${qr.modules.size}x${qr.modules.size} modules; like its corner square ${likeCorner.toFixed(2)}, like itself turned ${likeTurned.toFixed(2)}`);
  return { name, sheet, inner, modules: qr.modules.size };
}

const print = makeCode('pal-marker', url, PRINT_COLOURS);
const screen = makeCode('pal-marker-screen', `${url}?screen`, SCREEN_COLOURS);

const twins = Math.max(...rotations(screen.inner).map((turned) => similarity(print.inner, turned)));
if (twins > MAX_TWIN_LIKENESS) {
  fail(`The two codes look too much alike (similarity ${twins.toFixed(2)}, limit ${MAX_TWIN_LIKENESS}).`);
}

mkdirSync(outDir, { recursive: true });
for (const code of [print, screen]) {
  const png = new pngjs.PNG({ width: code.sheet.size, height: code.sheet.size });
  png.data.set(code.sheet.data);
  writeFileSync(join(outDir, `${code.name}.png`), pngjs.PNG.sync.write(png));
  writeFileSync(join(outDir, `${code.name}.patt`), encodePatt(code.inner));
  console.log(`  wrote ${join(outDir, code.name)}.png and .patt, ${code.sheet.size}x${code.sheet.size} px`);
}

const layout = framedLayout(print.modules, { ...options, pictureSize: picture.size });
const frameShare = layout.frameSize / layout.size;
console.log(`The two codes are ${twins.toFixed(2)} alike (AR.js needs 0.6 to accept a match, and takes the better of the two).`);
console.log(`The frame is ${(frameShare * 100).toFixed(1)}% of the printed width (${(18 * frameShare).toFixed(1)} cm when printed 18 cm wide).`);
console.log(`On the page: arjs="patternRatio: ${PATTERN_RATIO}" and one <a-marker type="pattern"> per .patt file.`);
