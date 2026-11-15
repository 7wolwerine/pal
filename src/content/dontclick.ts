/**
 * Reverse psychology and "us against them". A button begs not to be pressed;
 * PAL says "they" hung it there because "they" do not trust the two of you;
 * BUG — the only one telling the truth — keeps hanging it back on its nail.
 * The button is the last safeguard. Pressing it enough times switches it off.
 */
export const DONTCLICK = {
  /** PAL's one line, said before anything happens. Then PAL keeps quiet. */
  intro: 'Přece ti nikdo nebude říkat, co máš dělat, ne?',
  /** What the button says before each press; it gets more desperate. */
  labels: ['Nesahat', 'NESAHAT', 'Nech mě bejt, ty maniaku!', 'Fatal Error'],
  broken: 'Fatal Error',
  /** BUG on guard beside the button before anything happens. */
  bugGuard: 'Hmpf.',
  /** BUG as it hangs the button back up, one per press. */
  bugRehang: ['Typický.', 'Pořád dokola!', 'Ty jsi hroznej!'],
  /** From the second press on: the very same thing again, and BUG says so. Pure mockery, never a hint. */
  bugRepeat: [
    'Zase. Úplně stejně. A zase ten překvapenej kukuč.',
    'Mačkáš furt to samý a čekáš, že to dopadne jinak. Kouzelný.',
    'Pořád totéž. Ty máš ale fantazii.',
  ],
  bugLost: 'Tolik dřiny. A k čemu? K ničemu.',
  bugThanks: 'No proto. Stejně bys to neutrh.',
  palBroken: 'No vidíš. A svět se nezbořil.',
  palLeft: 'Hm. Tak jindy.',
  guardOn: 'Ochrana zapnuta',
  guardOff: 'Ochrana vypnuta',
  boardLabel: 'Nástěnka s tlačítkem na hřebíku',
  leave: 'Nechat to být',
  go: 'Pokračovat',
} as const;
