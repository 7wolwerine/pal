import { reveal as readHidden } from '../core/stego.ts';

/** Reads the text hidden in a picture's pixels; null if there is none, throws if the file is not an image. */
export async function readImageText(file: File): Promise<string | null> {
  const bmp = await createImageBitmap(file);
  const c = document.createElement('canvas');
  c.width = bmp.width;
  c.height = bmp.height;
  const g = c.getContext('2d');
  if (!g) return null;
  g.drawImage(bmp, 0, 0);
  const px = g.getImageData(0, 0, c.width, c.height);
  return readHidden({ data: px.data, width: px.width, height: px.height });
}
