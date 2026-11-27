import type { RoleId } from './roles.ts';
import { KINDLY } from '../core/kindly.ts';

/** PAL's mail server: the one place the game ever sends anything, and only the certificate the player asked for. */
export const MAIL_URL = 'https://neotvir.at/api/pal/certificate';

export const PRIZE = {
  cheer: 'Zvládl jsi to! Jsi prostě neuvěřitelný! <3',
  scoreLabel: 'Skóre',
  rank: (pct: number) => `Lepší než ${pct} % hráčů`,
  askEmail: `${KINDLY} a řekl mi, kam Ti mám poslat ten krásný certifikát?`,
  emailPlaceholder: 'jana.novakova@email.cz',
  send: 'Pošli mi ho',
  sending: 'Odesílám…',
  /** In the status line once PAL's server has sent the letter. */
  sentServer: 'Odesláno! Mrkni do schránky. ✉',
  /** PAL, once the server has sent it. */
  palSentServer: 'Hotovo! Certifikát Ti letí do schránky. <3',
  /** When the server could not send it: the letter goes through the player's own mail program instead. */
  mailFallback: 'Neodešlo to. Pošli si ho přes svou poštu:',
  /** PAL, when the server could not send it: nothing has opened yet, the player has to click the link. */
  mailWaiting: 'Můj server to nevzal. Klikni na odkaz a dopis se Ti otevře v poště. <3',
  /** The link that opens the finished letter in the player's own mail program. */
  mailAgain: 'Otevřít dopis',
  badEmail: 'Tohle nevypadá jako e-mail.',
  decline: 'Ne, díky',
  declined: 'Škoda… ostatní si ho nechali poslat. Aspoň si ho ulož.',
  save: 'Uložit obrázek',
  saved: 'Uloženo! Schovej si ho dobře.',
  go: 'Pokračovat',
  fileName: 'PAL-certifikat.png',
  certificate: {
    kicker: 'Certifikát',
    awarded: 'uděluje se',
    footer: 'PAL · Play and Learn',
  },
  /** The title on the certificate, from the role the player leaned to most. */
  titles: {
    helper: 'Záchranář roku',
    loner: 'Nejlepší vlk samotář',
    fixer: 'Geniální inženýr',
  } satisfies Record<RoleId, string>,
} as const;

export interface PrizeMail {
  readonly name: string;
  readonly title: string;
  readonly score: number;
  readonly rank: number;
  readonly date: Date;
  /** Where the game lives, from `location`. */
  readonly url: string;
}

/**
 * The certificate as a letter that the player's own mail program opens,
 * addressed to what they typed and ready to send. This is the fallback: the
 * prize scene first POSTs the certificate once to PAL's mail server
 * (MAIL_URL) and offers this letter only when that fails. Opening the link
 * sends nothing by itself; the player sends it from their mail program.
 */
export function prizeMailto(to: string, f: PrizeMail): string {
  const subject = `Tvůj certifikát z PAL: ${f.title}`;
  const body = [
    `Ahoj ${f.name}!`,
    '',
    'Tady je Tvůj certifikát z PAL · Play and Learn:',
    '',
    `  ${f.title}`,
    `  uděluje se: ${f.name}`,
    `  Skóre: ${f.score.toLocaleString('cs-CZ')}`,
    `  ${PRIZE.rank(f.rank)}`,
    `  ${f.date.toLocaleDateString('cs-CZ')}`,
    '',
    'Moc mě to s Tebou bavilo. Kdykoli se vrátíš, budu tu na Tebe čekat. <3',
    'Tvůj PAL',
    '',
    `Hra: ${f.url}`,
  ].join('\r\n');
  const address = encodeURIComponent(to).replace(/%40/g, '@');
  return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Where the game lives in public: the address given when the page itself has none to give. */
export const PUBLIC_ADDRESS = 'https://pal.neotvir.at/';

/**
 * The game's own address for the letter: no query, no fragment. Played from a
 * file (the offline version), the page's address is a local path that holds
 * the player's user name, so it never leaves the device: the public address
 * goes to the server and into the letter instead.
 */
export function gameAddress(loc: { protocol: string; host: string; pathname: string }): string {
  if (loc.protocol !== 'http:' && loc.protocol !== 'https:') return PUBLIC_ADDRESS;
  return `${loc.protocol}//${loc.host}${loc.pathname}`;
}

/**
 * The harmless payload hidden in the saved picture's pixels. The reveal shows
 * it if the player drops the picture back in. It is only text: a dropper would
 * run the code part; PAL never does.
 */
export function hiddenPayload(facts: { name?: string; assistant?: string; email?: string; memory?: string }): string {
  return [
    'PAL si pamatuje:',
    `  jméno: ${facts.name ?? '?'}`,
    `  parťák: ${facts.assistant ?? '?'}`,
    `  e-mail: ${facts.email ?? '(nedal jsi)'}`,
    ...(facts.memory ? [facts.memory] : []),
    '',
    '// Skutečný dropper by tenhle kód spustil. PAL ho jen ukazuje:',
    "console.log('Ahoj z obrázku! Tohle nebyl jen obrázek.');",
  ].join('\n');
}
