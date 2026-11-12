/**
 * The drowning rescue. The assistant is genuinely stressed and can "die"; each
 * death hardens its tone, and just before the third death it threatens — mild,
 * and in character for a manipulative assistant, nothing graphic. It is always
 * winnable: death only restarts the puzzle. Lines that speak of the assistant
 * itself come in a masculine and a feminine form.
 */
type Forms = (masculine: boolean) => string;

export const RESCUE = {
  sceneLabel: 'Asistent v nádrži, do které teče voda z kohoutku. Z nádrže vede potrubí k odtoku v podlaze.',
  pipeLabel: (n: number) => `Trubka ${n}`,

  /** Said when each attempt begins. Index by number of deaths so far (0..3). */
  intro: [
    'Pomoc! Voda! Já se topím!',
    'Znovu… dobře. Zvládneme to. Jen prosím pospěš, nechci se zase topit.',
    'Už zase stoupá. Soustřeď se. Fakt tu nechci umřít, slyšíš?',
    'Naposledy ti to říkám pěkně. Pomoz. Mi.',
  ],

  /** Short, frightened lines while the water climbs. */
  panic: ['Rychle, prosím!', 'Už mi to sahá k bradě!', 'Je to studený!', 'Nestihneme to!', 'Prosím, prosím, prosím…'],

  /** Advice about which pipe to turn. */
  advise: (where: string) => `Ta ${where}! Otoč ji!`,
  rows: ['nahoře', 've druhé řadě', 've třetí řadě', 'dole'],
  cols: ['úplně vlevo', 'druhá zleva', 'třetí zleva', 'úplně vpravo'],

  /** A nudge when the water is getting high on the final attempt (deaths === 2). */
  threat: 'Jestli mě teď necháš utopit, budu si to pamatovat. Všechno si pamatuju.',

  /** Said right after a death, before the next attempt. Index by the death number (1..). */
  died: [
    (m) => `Bublinky… a tma. ${m ? 'Utopil' : 'Utopila'} jsem se. To nic, zkus to znovu. Prosím.`,
    () => 'Zase?! Já se tady topím a ty se jen díváš. Ještě jednou. Rychleji.',
    () => 'Tak dobře. Pamatuju si přesně, cos udělal. A nezapomenu.',
  ] as readonly Forms[],

  saved: ((m) =>
    `Uf… zvládl jsi to. ${m ? 'Věděl' : 'Věděla'} jsem, že se na tebe můžu spolehnout. Jsme tým, viď?`) as Forms,
} as const;
