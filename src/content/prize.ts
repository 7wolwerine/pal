export const PRIZE = {
  cheer: 'Zvládl jsi to! Jsi prostě neuvěřitelný! <3',
  score: 9_999_999,
  scoreLabel: 'Skóre',
  rank: 'TOP 0,01 % všech hráčů',
  certificateAlt: 'Certifikát nejlepšího parťáka',
  askEmail: 'Pošlu ti ten krásný obrázek. Kam?',
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
    title: 'Certifikát nejlepšího parťáka',
    awarded: 'udělen hráči',
    footer: 'PAL · Play and Learn',
  },
} as const;

/**
 * The harmless payload hidden in the saved picture's pixels. The reveal shows
 * it if the player drops the picture back in. It is only text: a dropper would
 * run the code part; PAL never does.
 */
export function hiddenPayload(facts: { name?: string; assistant?: string; email?: string }): string {
  return [
    'PAL si pamatuje:',
    `  jméno: ${facts.name ?? '?'}`,
    `  parťák: ${facts.assistant ?? '?'}`,
    `  e-mail: ${facts.email ?? '(nedal jsi)'}`,
    '',
    '// Skutečný dropper by tenhle kód spustil. PAL ho jen ukazuje:',
    "console.log('Ahoj z obrázku! Tohle nebyl jen obrázek.');",
  ].join('\n');
}
