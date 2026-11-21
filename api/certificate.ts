/**
 * The one thing PAL ever really sends: the player's certificate, to the
 * address the player typed, from pal@neotvir.at. PAL's own Vercel function,
 * deployed with this repository at https://pal.neotvir.at/api/certificate. The
 * game itself currently posts to the website's route instead (MAIL_URL,
 * https://neotvir.at/api/pal/certificate, a copy of this file). The mail
 * goes out through the domain's own mailbox at Forpsi over SMTP, so it costs
 * nothing and passes the domain's existing SPF. The address is used for this
 * one message and is never stored or logged.
 *
 * Environment (set in the Vercel project, never in the repository):
 *   SMTP_USER   optional, the mailbox, defaults to pal@neotvir.at
 *   SMTP_PASS   its password
 *   SMTP_HOST   optional, defaults to smtp.forpsi.com
 *   SMTP_PORT   optional, defaults to 465 (TLS)
 *   PAL_FROM    optional, defaults to "Tvůj PAL <SMTP_USER>"
 *   PAL_ORIGIN  optional, a comma-separated list of the pages allowed to call
 *               this, defaults to https://pal.neotvir.at,https://7wolwerine.github.io
 *
 * The website's route is this same file as a route of the PERSONAL.EXE site
 * (Next.js): app/api/pal/certificate/route.ts there, with nodemailer installed.
 * Keep the two in sync. It exports the
 * web-standard POST and OPTIONS handlers, which both Next.js and plain Vercel
 * functions understand.
 */

import nodemailer from 'nodemailer';

const EMAIL = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,180}\.[a-z]{2,24}$/i;
const LIMIT = { per: 3, windowMs: 10 * 60 * 1000 };
/** Per-instance memory of recent sends, so one visitor cannot use PAL as a spam cannon. */
const recent = new Map<string, number[]>();

interface Certificate {
  readonly email: string;
  readonly name: string;
  readonly title: string;
  readonly score: string;
  readonly game: string;
  /** The certificate picture as PNG bytes, if the game sent one. */
  readonly image?: Buffer;
}

function clean(value: unknown, max: number): string {
  return typeof value === 'string'
    ? value
        .replace(/[\u0000-\u001f<>]/g, '')
        .trim()
        .slice(0, max)
    : '';
}

function parse(body: unknown): Certificate | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const b = body as Record<string, unknown>;
  const email = clean(b.email, 254);
  if (!EMAIL.test(email)) return undefined;
  return {
    email,
    name: clean(b.name, 40) || 'kamaráde',
    title: clean(b.title, 80),
    score: clean(b.score, 20),
    game: clean(b.game, 200),
    image: picture(b.image),
  };
}

/** A PNG data URL from the game's canvas, up to about 1.5 MB. Anything else is ignored. */
function picture(value: unknown): Buffer | undefined {
  if (typeof value !== 'string' || value.length > 2_000_000) return undefined;
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match?.[1]) return undefined;
  const bytes = Buffer.from(match[1], 'base64');
  // The PNG signature, so nothing else rides along as an "image".
  return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? bytes : undefined;
}

function allowed(key: string, now: number): boolean {
  const times = (recent.get(key) ?? []).filter((t) => now - t < LIMIT.windowMs);
  if (times.length >= LIMIT.per) return false;
  times.push(now);
  recent.set(key, times);
  return true;
}

function escape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function letter(c: Certificate): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `Tvůj certifikát od PALa${c.title ? `: ${c.title}` : ''}`;
  const lines = [
    `Ahoj ${c.name},`,
    '',
    'tady je tvůj certifikát, jak jsem slíbil.',
    '',
    c.title ? `Titul: ${c.title}` : '',
    c.score ? `Výsledek: ${c.score}` : '',
    '',
    'Bylo mi s tebou moc fajn. Kdykoli se vrať.',
    '',
    'Tvůj PAL <3',
    c.game ? `\n${c.game}` : '',
  ].filter((line, i, all) => line !== '' || all[i - 1] !== '');
  const text = lines.join('\n');
  const html = `<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body style="margin:0;padding:16px;background:#fbeaf0">
<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:3px solid #ed93b1;border-radius:16px;background:#fff6f9;color:#4b1528">
<p>Ahoj ${escape(c.name)},</p>
<p>tady je tvůj certifikát, jak jsem slíbil.</p>
${c.image ? '<p style="text-align:center;margin:16px 0"><img src="cid:certifikat@pal" alt="Certifikát" width="448" style="max-width:100%;height:auto;border-radius:8px"></p>' : ''}
${c.title ? `<p style="font-size:20px;font-weight:700;text-align:center;margin:20px 0">${escape(c.title)}</p>` : ''}
${c.score ? `<p style="text-align:center">Výsledek: <b>${escape(c.score)}</b></p>` : ''}
<p>Bylo mi s tebou moc fajn. Kdykoli se vrať.</p>
<p>Tvůj PAL &lt;3</p>
${c.game ? `<p style="font-size:12px"><a href="${escape(c.game)}">${escape(c.game)}</a></p>` : ''}
</div>
</body></html>`;
  return { subject, text, html };
}

export const runtime = 'nodejs';

/** The pages allowed to call this from a browser. */
const ORIGINS = (process.env.PAL_ORIGIN ?? 'https://pal.neotvir.at,https://7wolwerine.github.io')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

/** Answers the caller's own origin, but only when it is on the list; anyone else gets no Allow-Origin. */
const cors = (request: Request): Record<string, string> => {
  const origin = request.headers.get('origin') ?? '';
  return {
    ...(ORIGINS.includes(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
};

export function OPTIONS(request: Request): Response {
  return new Response(null, { status: 204, headers: cors(request) });
}

export async function POST(request: Request): Promise<Response> {
  const headers = cors(request);
  const reply = (status: number, body: object): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });

  const user = process.env.SMTP_USER ?? 'pal@neotvir.at';
  const pass = process.env.SMTP_PASS;
  if (!pass) return reply(503, { ok: false, reason: 'not-configured' });

  const cert = parse(await request.json().catch(() => undefined));
  if (!cert) return reply(400, { ok: false, reason: 'bad-address' });

  const who = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!allowed(who, Date.now()) || !allowed(cert.email.toLowerCase(), Date.now())) return reply(429, { ok: false, reason: 'too-many' });

  const { subject, text, html } = letter(cert);
  const port = Number(process.env.SMTP_PORT ?? 465);
  const mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.forpsi.com',
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  const sent = await mailer
    .sendMail({
      from: process.env.PAL_FROM ?? `Tvůj PAL <${user}>`,
      to: cert.email,
      subject,
      text,
      textEncoding: 'base64',
      attachments: cert.image ? [{ filename: 'certifikat-pal.png', content: cert.image, contentType: 'image/png', cid: 'certifikat@pal' }] : [],
      html,
    })
    .then(() => true)
    .catch(() => false);

  return sent ? reply(200, { ok: true }) : reply(502, { ok: false, reason: 'send-failed' });
}
