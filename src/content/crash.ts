/**
 * BUG's end and the blue screen. Everything the player did catches up: BUG,
 * who warned them all game, dissolves into a stream of green glyphs spelled
 * from the player's own actions, the window crashes, and a fake blue screen
 * offers a "support" number — the tech-support scam. The number is not a
 * valid phone number (no Czech number starts with 000) and nothing dials it.
 */
export const CRASH = {
  palDark: 'Tak. A teď už jsi jen můj.',
  bugLast: 'Já jsem tě varoval. Celou dobu.',
  bugGone: '…',
  sad: ':(',
  title: 'Váš počítač narazil na závažný problém a byl zablokován.',
  body: 'Byla zjištěna nebezpečná aktivita (PAL.EXE). Nevypínejte počítač, mohlo by dojít ke ztrátě dat. Ihned kontaktujte technickou podporu:',
  phone: '+420 000 123 456',
  code: 'Kód chyby: TROJAN_PAL_0x00BUG',
  call: 'Zavolat podporu',
  restart: 'Restartovat',
  ringing: 'Vytáčím…',
  /** The "support" on the line, with a heavy accent. */
  support: [
    'Dobrý děň, tady je oficiálná technická podpora.',
    'Váš počítač má virus, ja vidím to tady u sebe.',
    'Prosím, nainstalujte program pro vzdálený přístup a diktujte mně kód. Já to opravím.',
  ],
  hangUp: 'Zavěsit',
  ariaLabel: 'Modrá obrazovka',
} as const;
