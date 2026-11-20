/**
 * The end of the act and the blue screen. The assistant the player made goes
 * flat like a balloon: it was only a costume, and PAL climbs out of it, pink
 * as ever, then turns bad. BUG, without a word, tries to pull the window shut
 * for the player and dissolves into green glyphs spelled from the player's own
 * actions; the window crashes, the whole screen falls apart, and a fake blue
 * screen offers a "support" number — the tech-support scam. The number is not
 * a valid phone number (no Czech number starts with 000) and nothing dials it.
 * The text is Czech with a heavy Russian accent, the way such scams often read.
 */
export const CRASH = {
  /** PAL, out of the costume. */
  palOut: 'Pfff… Konečně. V tom kostýmu se nedalo dýchat.',
  palDark: 'Tak. A teď už jsi jen můj.',
  sad: ':(',
  title: 'Váš počítač narazil na vážnou problému i byl zablokován.',
  body: 'Byla zjištěna nebezpečná aktivnost (PAL.EXE). Nevypínajte počítač, mohlo by dojít ke ztrátě vašich dannych. Nemedleně kontaktujte techničeskou podporu:',
  phone: '+420 000 123 456',
  code: 'Kód chyby: TROJAN_PAL_0x00BUG',
  call: 'Zavolat podporu',
  restart: 'Restartovat',
  ringing: 'Vytáčím…',
  /** The "support" on the line, with a heavy accent. */
  support: [
    'Dobryj děň! Zdě oficiálna technická podpora vašeho počítača.',
    'Váš počítač má virus, ja vižu eto tady u sebja na monitoru.',
    'Nainstalujte prosím program pro dálkový přístup i nadiktujte mně kód. Ja vsjo opravím.',
  ],
  dictate: 'Nadiktovat kód',
  /** The code, read out digit by digit. */
  digits: ['4', '8', '1', '5', '9', '2'],
  /** Then something goes wrong: the support is in, and the mouse is not the player's any more. */
  takeover: 'Vzdálené připojení navázáno. Ovládání převzal: PODPORA',
  supportIn: 'Tak. Uže vsjo vižu. Spasíbo, vy jste moc hodný čelověk.',
  glitch: 'ЗАГРУЗКА ДАННЫХ… 37 %',
  hangUp: 'Zavěsit',
  ariaLabel: 'Modrá obrazovka',
} as const;
