export const MAILBOX = {
  sceneLabel: 'Domek se zahrádkou a poštovní schránkou',
  mailboxLabel: 'Poštovní schránka',
  arrived: 'Cink! Něco přišlo.',
  found: 'Flashka? A žádná zpáteční adresa.',
  go: 'Honem k počítači',
} as const;

export const DESK = {
  sceneLabel: 'Stůl s monitorem a počítačem',
  usbLabel: 'USB port na počítači',
  start: 'Tak kam s ní?',
  toast: 'Bylo připojeno zařízení: PAL <3 (E:)',
  ask: {
    title: 'Překvapení.png',
    body: 'Na disku je pro tebe překvapení. Vytisknout?',
    ok: 'OK',
    cancel: 'Zrušit',
  },
  sad: {
    title: ':(',
    body: 'Ale… proč nechceš vidět překvapení? Dalo to tolik práce.',
    again: 'Zkusit to znovu',
    noPrinter: 'Nemám tiskárnu',
  },
  printing: { title: 'Tisk', body: 'Posílám to na tiskárnu…' },
  check: { title: 'Tisk', body: 'Vyjelo to?', yes: 'Mám to v ruce', no: 'Nevyjelo' },
  retry: {
    title: 'Tisk',
    body: 'To nevadí! Zkusíme to znovu?',
    again: 'Vytisknout znovu',
    show: 'Ukázat na obrazovce',
  },
  onscreen: { title: 'Překvapení.png', body: 'Tak si ho aspoň vyfoť. Bude se hodit.', done: 'Hotovo' },
  happy: { title: '<3', body: 'Jupí! Schovej si ho, bude se hodit.', go: 'Pokračovat' },
} as const;

export const PRINT_SHEET = {
  caption: 'Namiř na mě foťák. <3',
  codeAlt: 'QR kód s medvídkem uprostřed',
} as const;
