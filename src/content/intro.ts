export const MAILBOX = {
  sceneLabel: 'Domek se zahrádkou a poštovní schránkou',
  mailboxLabel: 'Poštovní schránka',
  groundLabel: 'Zahrada: tráva a cestička',
  doorLabel: 'Dveře domu',
  sealLabel: 'Srdíčková pečeť na obálce',
  letterLabel: 'Dopis',
  /** What the character says, in bubbles over its head. */
  post: '?',
  sender: ['Bella Gothová', 'Krasohlídkov 162'],
  letter: {
    greeting: 'Ahoj broučku,',
    body: 'posílám Ti dáreček! Je to překvapení, tak Ti to nemůžu dopředu prozradit. Určitě Tě potěší, vím, jak takové věci miluješ!',
    signature: 'Tvoje babi',
  },
  fromGrandma: 'Jé, píše mi babička. Ta je zlatá, dneska už dopisy nikdo neposílá.',
  curious: 'Jsem zvědavý!',
  /** Little comments the character makes about the garden when the player pokes around. */
  comments: {
    tree: { label: 'Jabloň', text: 'Z těchhle babi dělá nejlepší štrůdl na světě.' },
    apple: 'Au. Tohle spadlo samo.',
    pot: { label: 'Květináč', lines: ['Tu zalévám každé ráno.', 'Roste jak z vody.', 'Další kvítek!', 'Víc už se jich tam nevejde.'] },
    chimney: { label: 'Komín', text: 'Táhne krásně.' },
    /** The character, poked again and again, runs out of patience. */
    self: {
      label: 'Já',
      lines: ['Ano?', 'Copak?', 'No?', 'Ano, ó veliký klikači?', 'Ještě jednou a…', '…a nic. Ale stejně.', 'Klik. Klik. Klik. Baví?', 'Já tu jen stojím. Pošta je tamhle.'],
    },
    roof: { label: 'Zvíře na střeše', up: 'Jak ses tam… Ne. Nechci to vědět.', poke: 'Dolů si slez sám.' },
    bush: {
      label: 'Keř',
      rustle: ['Něco tam šustí.', 'Zase. Kdo tam je?'],
      out: { bunny: 'Zajíc! Zase mi ožral mrkev.', hedgehog: 'Ježek. Ten tu bydlí dýl než já.', mouse: 'Myš. Babi by vyskočila na židli.' },
    },
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
  glassLabel: 'Plocha na monitoru',
  keyboardLabel: 'Klávesnice',
  mouseLabel: 'Myš',
  lampLabel: 'Světýlko monitoru',
  trayLabel: 'Mechanika',
  ventLabel: 'Větrací mřížka',
  cageLabel: 'Klec s křečkem',
  fanLabel: 'Větrák',
  mugLabel: 'Hrnek',
  noteLabel: 'Lísteček na monitoru',
  /** The words on the mug, shown enlarged because nobody could read them at that size. */
  mugWords: '„Remember to stay hydrated“',
  /** Little thoughts at the desk, in bubbles over what was clicked. */
  thoughts: {
    off: 'Tma.',
    on: 'Zase žije.',
    stuck: 'Nejde vypnout. Asi něco dělá.',
    night: ['Dobrou noc.', 'Dobré ráno!'],
    fan: ['Vrrrrr.', 'Ta stužka je od babi.', 'Kdo by fouknul do větráku?', 'Fouká mi to do kafe.'],
    mug: 'Prý že když nějak objevuješ planety tak se máš hydratovat. Nevím.',
    note: ['„Babi má v neděli narozeniny!“', '„Heslo: ne-za-po-me-ň“', '„Koupit křečkovi slunečnici.“'],
    mouse: ['Kulička zase drhne.', 'Píp. Jo, to je myš.', 'Tahle pamatuje víc než já.'],
    lamp: ['Zelená.', 'Žlutá?', 'Růžová! To jsem nevěděl, že umí.', 'Modrá.'],
    tray: ['Držák na hrnek!', 'A zase dovnitř.', 'Je tam cédéčko od babi. „Pohádky 3.“'],
    vent: ['Pfff. Prach z roku nula.', 'Hepčí!', 'Měl bych to někdy vysát.', 'Hepčí! Zase.'],
    keyboard: ['Skoro jako klavír.', 'Tuhle znám!', 'Ještě jednou od začátku.'],
    hamster: {
      look: ['Boo? Kouká na mě.', 'Ano, vidím Tě.'],
      cheeks: ['Cpe si to do tváří. Všechno.', 'Kam se to do něj vejde?'],
      fast: ['Boo dneska trénuje.', 'Ten kdyby poháněl počítač…'],
      run: ['Běž, Boo!', 'Zase kolečko. Furt kolečko.'],
    },
    /** The desktop answers clicks; now and then the hero has something to say about it. */
    desktop: {
      sun: ['Směje se na mě!', 'Sluníčko má dneska náladu.'],
      moon: ['Mrkl na mě?', 'Měsíc dělá, že nic.'],
      fish: ['Ryba!', 'Další! Tam jich je.', 'Ty skáčou jak o závod.'],
      sky: ['Na ploše mi prší.', 'Přeháňka. Jen tady.'],
      star: ['Padá hvězda! Něco si přej.', 'Další. Už nevím, co si přát.'],
      mountain: ['Hó-hó… hó.', 'Ozvěna.'],
      tree: ['Podzim na počkání.', 'Listí. Kdo to bude hrabat?'],
      owl: ['Někdo tam kouká.'],
      meadow: ['Kytka!', 'Další.', 'Bude z toho louka.'],
      folder: ['„Nová složka (7)“.', 'Prázdná. Jako vždycky.'],
      bin: ['Koš vrací úder.', 'Vysypat. Někdy.'],
      drive: ['PAL <3 (E:)'],
      start: ['Start. A nic.'],
      clock: ['Už tolik?', 'Jde přesně.'],
    },
  },
  /** Old programs on the desktop that will never start again: one dry system error each. */
  retro: {
    'retro-vlak': 'VLAK.EXE: soubor nenalezen',
    'retro-bat': 'START.BAT: chybný příkaz nebo název souboru',
    'retro-disk': 'A:\\ není připravena. (P)řerušit, (O)pakovat, (S)elhat?',
  },
  /** BUG hauling the drive away: effort noises and grumbling only. */
  bug: {
    tug: ['Hhhng!', 'Hrrrk!', 'Nnnngh!', 'Hej… rup!', 'Hhhhh!', 'Grrrnk!'],
    puff: ['Uf… uf…', 'Pfff…', 'Uf.', 'Chrr… fuj.', 'Haf… haf… uf.'],
    stuck: ['Hhhhhng!!', 'Nnnn… nejde!', 'Uf… uf… uf…', 'Grrr!', 'Ještě… kousek… hhhng!'],
    poked: ['Au! Nech mě!', 'Tsss! Ruce pryč!'],
    robbed: 'Tsss!',
  },
  toast: 'Bylo připojeno zařízení: PAL <3 (E:)',
  ask: {
    title: 'PAL <3 (E:)',
    body: 'Ahoj! Mám pro Tebe překvápko. Budu u Tebe na stole!',
    icon: 'Medvídek',
    ok: 'OK',
    cancel: 'Zrušit',
  },
  sad: {
    title: ':(',
    body: 'Ty mě nechceš vidět? :-(',
    again: 'Zkusit to znovu',
    later: 'Teď ne',
  },
  /** While the browser's own print dialog is open. */
  printing: { title: 'Tisk', body: 'Už letím do tiskárny!' },
  /** After the print dialog: did it come out? */
  /** After the print dialog: did it come out? Saying no again and again wears the answer down. */
  check: {
    title: 'Tisk',
    body: 'Máš mě? Načti mě foťákem.',
    inHand: 'Jo, mám!',
    notInHand: ['Nic nevyjelo.', 'Ne, nemám to.', 'Nějak to nejde.', 'Nemám.', 'Ne.'],
  },
  /** Every "nothing came out" gets a slightly harder, still sweet push. The last line repeats. */
  push: {
    title: ':(',
    lines: [
      'Ne? To mě mrzí… Chtěl jsem Tě potěšit. Zkusíme to znova?',
      'Jen tu tiskárnu zapni, já počkám. Na Tebe počkám, jak dlouho bude třeba.',
      'Ostatním jsem vylezl napoprvé… Ale Ty jsi šikovnější než oni. Tobě to půjde.',
      'Tolik jsem se na Tebe chystal a Ty mě necháš tady uvnitř? Stačí jedno kliknutí. Kvůli mně.',
      'Tak dobře. Slibuju, že se Ti potom vytisknu sám. Ale teď to ještě jednou zkus, ano? Pro mě.',
    ],
    again: 'Vytisknout znovu',
    screen: 'Ukaž se mi tady',
  },
  /** On a computer, the way round the printer: the blue code, to be read with a phone. */
  onscreen: { title: 'Namiř na mě', done: 'Hotovo' },
  /** On a phone or tablet there is nothing to point a camera at: just the picture. */
  picture: { title: 'Překvapení.png', body: 'Medvídek! Ten je pro Tebe.', done: 'Hotovo', alt: 'Obrázek medvídka' },
  skipped: { title: ':(', body: 'Tak třeba příště.', go: 'Pokračovat' },
} as const;

export const PRINT_SHEET = {
  codeAlt: 'QR kód s medvídkem uprostřed',
} as const;
