/**
 * The outro: a 90s keygen. Same game, other tokens: black, green, monospace,
 * sharp corners, matrix rain and a chiptune. It also lists the easter eggs
 * hidden in the game and lets the player tick the ones they noticed.
 */
export interface Egg {
  readonly id: string;
  readonly label: string;
}

export const EGGS: readonly Egg[] = [
  { id: 'mario', label: '„Oh, it’s a me, Mari-“ — přeřeknutí při seznámení' },
  { id: 'contract', label: 'Klikací slovo „brouk“ uprostřed smlouvy' },
  { id: 'stego', label: 'Text schovaný v pixelech uloženého obrázku' },
  { id: 'flower', label: 'Kytka, která ví víc, než by měla' },
  { id: 'bug', label: 'BUG — nešika s velkými emocemi, jediný, kdo nelhal' },
  { id: 'smiley', label: 'Medvěd z kartičky, co ožije v kameře a napíše 3107' },
  { id: 'matrix', label: 'Brouk rozsypaný na zelená písmenka' },
  { id: 'bsod', label: 'Modrá obrazovka s číslem na „podporu“' },
  { id: 'keygen', label: 'Tahle obrazovka i s hudbou' },
];

export const KEYGEN = {
  open: '▶ Spustit PAL_KEYGEN.EXE',
  title: 'PAL KEYGEN v1.0',
  cracked: '[ cracked by BUG ]',
  nameLabel: 'Name',
  serialLabel: 'Serial',
  generate: 'Generate',
  serialNote: 'Tvůj klíč. Vyrobený ze všeho, cos mi dal.',
  eggsTitle: 'Easter eggy — které jsi našel?',
  eggsAuto: '(viděl jsem, žes ho našel)',
  eggsScore: (n: number, of: number) => `Našel jsi ${n} z ${of}.`,
  greetz:
    'greetz: BUG ★ všem, co čtou podmínky ★ všem, co se zeptali „odkud to ví?“ ★ všem, co zavěsili ★ a tobě, žes to dohrál ★ nic z toho neopustilo tvůj počítač ★',
  close: 'Zavřít',
} as const;
