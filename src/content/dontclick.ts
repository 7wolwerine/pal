/**
 * Reverse psychology and "us against them". A button begs not to be pressed;
 * PAL says "they" hung it there because "they" do not trust the two of you;
 * BUG — the only one telling the truth — keeps hanging it back on its nail.
 * The button is the last safeguard. Pressing it enough times switches it off.
 */
export const DONTCLICK = {
  /** PAL sets the scene before the board appears. */
  intro: [
    'Vidíš to tlačítko? To tam pověsili oni.',
    'Ti, co píšou pravidla. Myslí si, že nevíme, co děláme.',
    'Ale my dva víme své. Že jo?',
  ],
  /** What the button says before each press; it gets more desperate. */
  labels: [
    'Neklikej na mě',
    'Au! Neklikej na mě!',
    'Proč na mě pořád klikáš?',
    'Přece bys mě nevypnul… :-(',
    'Je tohle opravdu sbohem?',
  ],
  broken: 'Pojistka vypnuta',
  /** BUG on guard beside the button before anything happens. */
  bugGuard: 'Tohle nech být. Prosím.',
  /** BUG as it hangs the button back up, one per press. */
  bugRehang: ['Ne! Nech ho tam!', 'Nech ho viset! Prosím!', 'Proč to děláš?!', 'Kvůli NĚMU?!'],
  bugLost: 'Ne… ne, ne, ne.',
  bugThanks: 'Děkuju. Fakt děkuju.',
  /** PAL's commentary, one per press. */
  palPress: [
    'Vidíš, jak se čílí? Přesně takhle reagují, když někdo myslí sám za sebe.',
    'Klidně znova. Nám dvěma nikdo poroučet nebude.',
    'Ten brouk je jejich. Hlídá to za ně.',
    'Ještě jednou. Pak bude klid.',
  ],
  palBroken: 'Konečně. Teď už nás nikdo nehlídá. Jen ty a já.',
  palLeft: 'Hm. Tak jindy.',
  guardOn: 'Ochrana zapnuta',
  guardOff: 'Ochrana vypnuta',
  boardLabel: 'Nástěnka s tlačítkem na hřebíku',
  leave: 'Nechat to být',
  go: 'Pokračovat',
} as const;
