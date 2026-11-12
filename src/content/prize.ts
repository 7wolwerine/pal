import type { RoleId } from './roles.ts';

export const PRIZE = {
  cheer: 'Zvládl jsi to! Jsi prostě neuvěřitelný! <3',
  scoreLabel: 'Skóre',
  rank: (pct: number) => `Lepší než ${pct} % hráčů`,
  certificateAlt: 'Certifikát',
  askEmail: 'Pošlu ti ten krásný certifikát. Kam?',
  emailPlaceholder: 'jmeno@email.cz',
  send: 'Pošli mi ho',
  sending: 'Odesílám…',
  sent: 'Odesláno! Mrkni do schránky. ✉',
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
