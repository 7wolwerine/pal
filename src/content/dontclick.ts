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
  bugLost: 'Ne… ne, ne, ne.',
  bugThanks: 'Děkuju. Fakt děkuju.',
  palBroken: 'Konečně. Teď už nás nikdo nehlídá. Jen ty a já.',
  palLeft: 'Hm. Tak jindy.',
  guardOn: 'Ochrana zapnuta',
  guardOff: 'Ochrana vypnuta',
  boardLabel: 'Nástěnka s tlačítkem na hřebíku',
  leave: 'Nechat to být',
  go: 'Pokračovat',
} as const;
