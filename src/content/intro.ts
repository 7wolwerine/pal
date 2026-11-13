export const MAILBOX = {
  sceneLabel: 'Domek se zahrádkou a poštovní schránkou',
  mailboxLabel: 'Poštovní schránka',
  pathLabel: 'Cestička',
  doorLabel: 'Dveře domu',
  sealLabel: 'Srdíčková pečeť na obálce',
  letterLabel: 'Dopis',
  /** What the character says, in bubbles over its head. */
  post: 'Jé, pošta!',
  sender: ['Bella Gothová', 'Krasohlídkov 162'],
  letter: {
    greeting: 'Ahoj broučku,',
    body: 'posílám Ti dáreček! Je to překvapení, tak ti to nemůžu dopředu prozradit. Určitě tě potěší, vím, jak takové věci miluješ!',
    signature: 'Tvoje babi',
  },
  fromGrandma: 'Jé, píše mi babička. Ta je zlatá, dneska už dopisy nikdo neposílá.',
  curious: 'Jsem zvědavý!',
  /** Little comments the character makes about the garden when the player pokes around. */
  comments: {
    tree: { label: 'Strom', text: 'Tenhle strom tady nasadil můj děda.' },
    sky: { label: 'Obloha', text: 'Dneska je krásně!' },
    heart: { label: 'Srdíčko nad dveřmi', text: 'Tohle je místo K+M+B+' },
    window: { label: 'Okno', text: 'Čerstvě umyté. Jsem na sebe pyšný.' },
  },
} as const;

export const DESK = {
  sceneLabel: 'Stůl s monitorem a počítačem',
  usbLabel: 'USB port na počítači',
  flashkaLabel: 'Flashka na stole',
  powerLabel: 'Vypínač počítače',
  nightLabel: 'Klávesa den a noc',
  fanLabel: 'Větrák',
  mugLabel: 'Hrnek',
  noteLabel: 'Lísteček na monitoru',
  /** Little thoughts at the desk, in bubbles over what was clicked. */
  thoughts: {
    off: 'Tma.',
    on: 'Zase žije.',
    stuck: 'Nejde vypnout. Asi něco dělá.',
    night: ['Dobrou noc.', 'Dobré ráno!'],
    fan: ['Vrrrrr.', 'Ta stužka je od babi.', 'Kdo by fouknul do větráku?'],
    mug: ['Studené kafe od rána.', 'Hrnek s kočičkou. Dárek.'],
    note: ['„Babi má v neděli narozeniny!“', '„Heslo: ne-za-po-me-ň“'],
  },
  start: 'Flashka. Kam ji asi dám?',
  grabbed: 'Zasuň ji do portu.',
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
