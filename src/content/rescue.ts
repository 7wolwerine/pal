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
  pipeLabel: (n: number, open: string) => `Trubka ${n}: ${open}`,
  sides: { n: 'nahoru', e: 'vpravo', s: 'dolů', w: 'vlevo' },

  /** Said when each attempt begins. Index by number of deaths so far (0..3). */
  intro: [
    'Pomoc! Voda! Já se topím!',
    'Znovu… dobře. Zvládneme to. Jen prosím pospěš, nechci se zase topit.',
    'Už zase stoupá. Soustřeď se. Fakt tu nechci umřít, slyšíš?',
    'Naposledy Ti to říkám pěkně. Pomoz. Mi.',
  ],

  /** Short, frightened lines while the water climbs. */
  panic: ['Rychle, prosím!', 'Už mi to sahá k bradě!', 'Je to studený!', 'Nestihneme to!', 'Prosím, prosím, prosím…'],

  /**
   * Drama while the water climbs, in the voice of the look the player picked
   * (no advice about the pipes: only panic, in character). PAL's own lines are `panic`.
   */
  drama: {
    cat: [
      'Mňau! Voda! Kočky vodu NESNÁŠÍ!',
      'Moje srst! Budu vypadat jak mokrá myš!',
      'Devět životů a já je tu ztrácím všechny najednou!',
      'Mňááu! Už mi to teče do uší!',
    ],
    dog: [
      'Haf! Umím jen pejska, a to mě strašně unavuje!',
      'Kde je můj míček? Utopí se se mnou!',
      'Vrrr, ta voda kouše! Pomoz!',
      'Hodnej páníček by mě zachránil… Ty jsi hodnej, ne?',
    ],
    grandma: [
      'Ježíšmarjá, moje kolena! Já do vody nesmím!',
      'A já si dneska natočila trvalou…',
      'Za mých mladých let se do nádrží nepadalo!',
      'Zlatíčko, pospěš si, babička už nemá dech!',
    ],
    mom: [
      'Kdo pohlídá malého, když se tu utopím?!',
      'Já nemám čas se topit, mám v troubě buchtu!',
      'Prosím, rychle! Jsem máma!',
      'Už mi to sahá ke krku… a to jsem se dneska česala.',
    ],
    girl: [
      'Mamíí! Já neumím plavat bez kruhu!',
      'To není fér, já byla celý den hodná!',
      'Já se bojím! Je tu tma a voda!',
      'Řeknu to paní učitelce, jestli mě tu necháš!',
    ],
  } satisfies Record<'cat' | 'dog' | 'grandma' | 'mom' | 'girl', readonly string[]>,

  /** Only a player who has drowned the assistant three times gets to hear this. */
  threat: 'Jestli mě teď necháš utopit, budu si to pamatovat. Všechno si pamatuju.',

  /** Said right after a death, before the next attempt. Index by the death number (1..). */
  died: [
    (m) => `Bublinky… a tma. ${m ? 'Utopil' : 'Utopila'} jsem se. To nic, zkus to znovu. Prosím.`,
    () => 'Zase?! Já se tady topím a Ty se jen díváš. Ještě jednou. Rychleji.',
    () => 'Tak dobře. Pamatuju si přesně, cos udělal. A nezapomenu.',
  ] as readonly Forms[],

  /** After the rescue, in three short lines; the last waits for a click and leads into the cold. */
  saved: ((m) => [
    'Uf… voda je pryč. Zvládli jsme to.',
    `${m ? 'Věděl' : 'Věděla'} jsem, že se na Tebe můžu spolehnout. Jsme tým, viď?`,
    `Brr… jen jsem ${m ? 'celý promočený' : 'celá promočená'}. Je mi strašná zima…`,
  ]) as (masculine: boolean) => readonly string[],
} as const;
