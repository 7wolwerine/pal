/**
 * Where a file from public/ lives. Online it is next to the page. The offline
 * single-file build (tools/single-file.mjs) carries each such file inside the
 * page as a base64 block, because there is nothing next to a lone pal.html;
 * then the file becomes a data: URL built from that block.
 */
const MIME: Record<string, string> = { png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml' };
const inlined = new Map<string, string>();

export function assetUrl(path: string): string {
  const known = inlined.get(path);
  if (known) return known;
  const block = document.querySelector<HTMLScriptElement>(`script[type="application/octet-stream"][data-asset="${path}"]`);
  if (!block) return `${import.meta.env.BASE_URL}${path}`;
  const mime = MIME[path.slice(path.lastIndexOf('.') + 1)] ?? 'application/octet-stream';
  const url = `data:${mime};base64,${block.text.trim()}`;
  inlined.set(path, url);
  return url;
}
