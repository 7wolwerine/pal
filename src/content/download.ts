/**
 * The fake download, the last of the tricks. A 90s download page full of
 * screaming buttons. The game lets the player learn that the loud ones are
 * ads and the quiet link is the real one — then the quiet link is the trap.
 * Its address, shown in the status bar, is a stranger's domain. Nothing is
 * downloaded or run; the addresses use the reserved .invalid domain.
 */
export const DOWNLOAD = {
  palIntro: 'Poslední dárek: PAL Pro! Stáhni si ho, ať spolu můžeme být i offline.',
  palHunt: 'Klasika devadesátek. Najdi to pravé tlačítko.',
  pageTitle: 'PAL PRO – STÁHNI ZDARMA!!!',
  marquee: '★ NEJRYCHLEJŠÍ DOWNLOAD NA SVĚTĚ ★ 100% ZDARMA ★ BEZ VIRŮ ★',
  ads: ['DOWNLOAD NOW!!!', '▶ START', 'STÁHNOUT ZDARMA', '⬇ RYCHLÉ STAŽENÍ', 'KLIKNI ZDE'],
  adUrl: (i: number) => `http://ads.megaclick.invalid/r?id=${4711 + i * 13}`,
  adCaught: 'Reklama 😄',
  /** PAL laughs at each fake one the player falls for, and nudges them on. */
  palAd: ['Haha, to je reklama. Na to jsi moc chytrý.', 'Zase reklama! Hledej to nenápadné. Profíci vědí.'],
  link: 'pal-pro-setup.exe (2,1 MB)',
  linkUrl: 'http://pal-pro.download-secure.invalid/setup.exe',
  statusIdle: 'Hotovo',
  palFound: 'Věděl jsem to! Profík pozná pravé tlačítko na první pohled.',
  file: 'PAL_Pro_setup.exe',
  progress: (pct: number) => `Stahování… ${pct} %`,
  runQuestion: 'Spustit soubor z neznámého zdroje?',
  run: 'Spustit',
  cancel: 'Zrušit',
  installing: 'Instaluji PAL Pro…',
  installed: 'Nainstalováno ✓',
  palRan: 'Jééé, teď už mě máš i v počítači. Navždycky. <3',
  palCancelled: 'Zrušit? Teď? No… jak myslíš.',
  go: 'Pokračovat',
} as const;
