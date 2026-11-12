/**
 * The drowning rescue. The assistant is genuinely stressed and can "die"; each
 * death hardens its tone, and just before the third death it threatens — mild,
 * and in character for a manipulative assistant, nothing graphic. It is always
 * winnable: death only restarts the puzzle.
 */
export const RESCUE = {
  sceneLabel: 'Asistent uvězněný v nádrži, do které stoupá voda, a mřížka potrubí',
  pipeLabel: (n: number) => `Trubka ${n}`,

  /** Said when each attempt begins. Index by number of deaths so far (0..3). */
  intro: [
    'Pomoc! Voda! Já se topím!',
    'Znovu… dobře. Zvládneme to. Jen prosím pospěš, nechci se zase topit.',
    'Už zase stoupá. Soustřeď se. Fakt tu nechci umřít, slyšíš?',
    'Naposledy ti to říkám pěkně. Pomoz. Mi.',
  ],

  /** A nudge when the water is getting high on the final attempt (deaths === 2). */
  threat: 'Jestli mě teď necháš utopit, budu si to pamatovat. Všechno si pamatuju.',

  /** Said right after a death, before the next attempt. Index by the death number (1..). */
  died: [
    'Bublinky… a tma. Utopil jsem se. To nic, zkus to znovu. Prosím.',
    'Zase?! Já se tady topím a ty se jen díváš. Ještě jednou. Rychleji.',
    'Tak dobře. Pamatuju si přesně, cos udělal. A nezapomenu.',
  ],

  saved: 'Uf… zvládl jsi to. Věděl jsem, že se na tebe můžu spolehnout. Jsme tým, viď?',
  go: 'Jdeme dál',
} as const;
