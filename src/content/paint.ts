/**
 * The empty spot in the picture. An almost finished painting with one white
 * hole in the sky, a bucket of exactly the right blue on the floor, and PAL
 * camping in the corner, asking about the sky. Nobody asks the player to fix
 * it. The bucket cannot be undone. The hole was bait, placed where a tidy mind
 * has to reach.
 */
export const PAINT = {
  sceneLabel:
    'Pokoj s malířským stojanem. Na obraze je v obloze bílá díra. Na zemi stojí kýblík s modrou a sklenice se štětci, v rohu malý stan.',
  ask: 'Jak se ti zdá to nebe?',
  /** What PAL says, over and over, when the player clicks it. */
  nag: ['Co ta díra, hm?', 'Vypadá to, že to někdo nedokončil.'],
  bucket: 'Kýblík s modrou. Přesně ta barva, co chybí.',
  brush: 'Štětcem by to trvalo věčnost. Kýblík to vezme najednou.',
  bare: 'Holýma rukama?',
  miss: 'Jejda. To nevadí. Díra je pořád tam.',
  undo: '↶ Zpět',
  undoNothing: 'Není co vracet.',
  undoNope: 'Tohle už vrátit nejde.',
  after: 'Huh. Pojď, jdeme dál.',
  left: 'Hm. Škoda.',
  leave: 'Nechat to tak',
  go: 'Pokračovat',
  labels: {
    bucket: 'Kýblík s modrou barvou',
    brush: 'Štětce ve sklenici',
    painting: 'Obraz na stojanu',
    pal: 'PAL kempuje ve stanu',
  },
} as const;
