/**
 * Least-significant-bit steganography: hides text in the lowest bit of each
 * red, green and blue value of an image. The picture looks exactly the same;
 * the text rides along invisibly. Real droppers use the same idea to smuggle
 * code past scanners — here it only ever carries a harmless message that the
 * game *shows*, never runs.
 *
 * Layout: 32 bits of byte length, then the UTF-8 bytes, most significant bit
 * first, spread over the R, G, B channels of consecutive pixels (alpha is
 * left alone so saving as PNG keeps every value exact).
 */

export interface Pixels {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

const MAGIC = 'PAL1';

/** How many bytes of text an image of this size can carry. */
export function capacity(pixels: Pixels): number {
  const bits = pixels.width * pixels.height * 3;
  return Math.max(0, Math.floor((bits - 32) / 8) - MAGIC.length);
}

function* channelIndexes(data: Uint8ClampedArray): Generator<number> {
  for (let i = 0; i < data.length; i += 4) {
    yield i;
    yield i + 1;
    yield i + 2;
  }
}

/** Writes `text` into the image's low bits, in place. Throws if it does not fit. */
export function hide(pixels: Pixels, text: string): void {
  const payload = new TextEncoder().encode(MAGIC + text);
  if (payload.length > capacity(pixels) + MAGIC.length) throw new Error('Text does not fit in this image.');
  const bits: number[] = [];
  for (let b = 31; b >= 0; b--) bits.push((payload.length >>> b) & 1);
  for (const byte of payload) for (let b = 7; b >= 0; b--) bits.push((byte >> b) & 1);
  const slots = channelIndexes(pixels.data);
  for (const bit of bits) {
    const next = slots.next();
    if (next.done) throw new Error('Ran out of pixels.');
    const i = next.value;
    pixels.data[i] = ((pixels.data[i] ?? 0) & 0xfe) | bit;
  }
}

/** Reads text hidden by `hide`, or returns null if the image carries none. */
export function reveal(pixels: Pixels): string | null {
  const slots = channelIndexes(pixels.data);
  const readBit = (): number => {
    const next = slots.next();
    if (next.done) throw new Error('eof');
    return (pixels.data[next.value] ?? 0) & 1;
  };
  try {
    let length = 0;
    for (let b = 0; b < 32; b++) length = (length << 1) | readBit();
    length >>>= 0;
    if (length < MAGIC.length || length > capacity(pixels) + MAGIC.length) return null;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      let byte = 0;
      for (let b = 0; b < 8; b++) byte = (byte << 1) | readBit();
      bytes[i] = byte;
    }
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return text.startsWith(MAGIC) ? text.slice(MAGIC.length) : null;
  } catch {
    return null;
  }
}
