import type { RoleId } from './roles.ts';
import { KINDLY } from '../core/kindly.ts';

export const PRIZE = {
  cheer: 'Zvládl jsi to! Jsi prostě neuvěřitelný! <3',
  scoreLabel: 'Skóre',
  rank: (pct: number) => `Lepší než ${pct} % hráčů`,
  certificateAlt: 'Certifikát',
  askEmail: `${KINDLY} a řekl mi, kam ti mám poslat ten krásný certifikát?`,
  emailPlaceholder: 'jana.novakova@email.cz',
  send: 'Pošli mi ho',
  sending: 'Chystám dopis…',
  /** In the status line once the player's own mail program has the letter. */
  sent: 'Dopis čeká ve tvé poště. ✉',
  /** PAL, once the mail program is open. */
  mailWaiting: 'Hotovo! Dopis s certifikátem na tebe čeká ve tvé poště. Už ho jen odešli. <3',
  /** A real link, for when the mail program did not come up by itself. */
  mailAgain: 'Otevřít dopis znovu',
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
 * addressed to what they typed and ready to send. The page sends nothing.
 */
export function prizeMailto(to: string, f: PrizeMail): string {
  const subject = `Tvůj certifikát z PAL: ${f.title}`;
  const body = [
    `Ahoj ${f.name}!`,
    '',
    'Tady je tvůj certifikát z PAL · Play and Learn:',
    '',
    `  ${f.title}`,
    `  uděluje se: ${f.name}`,
    `  Skóre: ${f.score.toLocaleString('cs-CZ')}`,
    `  ${PRIZE.rank(f.rank)}`,
    `  ${f.date.toLocaleDateString('cs-CZ')}`,
    '',
    'Moc mě to s tebou bavilo. Kdykoli se vrátíš, budu tu na tebe čekat. <3',
    'Tvůj PAL',
    '',
    `Hra: ${f.url}`,
  ].join('\r\n');
  const address = encodeURIComponent(to).replace(/%40/g, '@');
  return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** The game's own address for the letter: no query, no fragment. */
export function gameAddress(loc: { protocol: string; host: string; pathname: string }): string {
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
