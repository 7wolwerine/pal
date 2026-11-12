export const FIDGETS = {
  /** A remark, not an instruction. Nobody ever tells the player to tidy up. */
  remark: 'Hm. Skoro hotovo… skoro.',
  /** PAL laughs the beetle off, every time. */
  palMocks: ['Nevšímej si ho. Je to jen brouk.', 'Ten je zase hysterický, co?', 'Uf, tohle je fakt otravné.'],
  controlLabels: {
    tilt: 'Obrázek visí nakřivo',
    screw: 'Vylezlý šroubek',
    drawer: 'Pootevřený šuplík',
    book: 'Knížka vytažená z řady',
    plug: 'Lampička s vytaženou šňůrou',
    mail: 'Nepřečtená pošta',
  },

  /** The beetle tells the truth the whole time. Nobody listens to a beetle. */
  bug: [
    { before: 'Hej! Co to děláš?!', after: 'Tak… a nesahej na to.' },
    { before: 'Přestaň, prosím tě!', after: 'Proč mě nikdo neposlouchá?!' },
    { before: 'Ne! To fakt nedělej!', after: 'Naposledy. Prosím.' },
  ],
  /** Desperate pleas when the player fixes something right in front of it. */
  bugPlead: ['Ne, nech to!', 'Proč to děláš?!', 'Vždyť to tak bylo dobrý!', 'Prosím… ne.', 'To není tvoje věc!'],
  /** Shown while the beetle clutches its head and undoes the player's work. */
  bugPanic: ['Néé!', 'Nesahej!', 'Pusť to!', 'Au!'],
  /** The beetle's last stand: it sits on a control and the player clicks it off. */
  bugGrab: 'Tak dost! Tohle si vzít nenecháš!',
  bugShove: ['Nepustím!', 'Au! Ne!', 'Přestaň!', 'Grr!', 'Já… ', 'Nóóó!'],
  bugFlung: 'Jau…',
  bugResigns: 'Fajn. Dělej si, co chceš. Já tě varoval.',

  /** After the lock clicks open. */
  quizIntro: 'Jsme na správné cestě!',
  quizSubmit: 'Odeslat vše',
  quizIncomplete: 'Ještě něco chybí.',
  /** PAL helps with a wrong answer, once per question; after that anything goes. */
  quizHints: {
    zebra: 'Černobílá a pruhovaná. Jako přechod pro chodce.',
    stars: 'Jedna hvězda za každý stát.',
    water: 'Pije se to. A je toho v tobě spousta.',
    whale: 'Velryby, delfíni… Začíná to na „ky“.',
  } as Record<string, string>,
  foodPraise: (food: string) => `Tak ty máš nejradši ${food}? Skvělá volba!`,

  sequenceIntro: 'Co je tohle? Dává ti to smysl?',
  sequenceLabel: 'Světýlko',
  sequenceReset: 'Znovu',

  contractIntro: 'Tohle už snad bude poslední věc.',
  contractTitle: 'Všeobecné podmínky vysvobození',
  contractSubtitle: 'verze 3.1.4 · platné od teď',
  contractAgree: 'SOUHLASÍM',
  contractSkip: 'Na konec',

  release: (masculine: boolean) =>
    `Díky moc, cítím se mnohem líp. Jsi můj zachránce. Nevím, co bych bez tebe ${masculine ? 'dělal' : 'dělala'}.`,
  /** Each answer leans towards one of the roles. */
  releaseChoices: [
    { label: 'Rádo se stalo!', role: 'helper' },
    { label: 'Jasně, žádný problém.', role: 'fixer' },
    { label: 'Nic to nebylo.', role: 'loner' },
  ],
} as const;

export interface QuizQuestion {
  readonly id: string;
  readonly label: string;
  /** The one question that is about the player, not about the world. */
  readonly personal?: boolean;
  /** Turns the lamp green; the personal question takes anything. */
  readonly right?: (answer: string) => boolean;
}

/** Lower case without accents or spaces, so 'H₂O ' and 'h2o' compare equal. */
export function plain(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/₂/g, '2')
    .replace(/\s+/g, '')
    .toLowerCase();
}

export const QUIZ: readonly QuizQuestion[] = [
  { id: 'zebra', label: 'Zadej pruhovaného lichokopytníka', right: (a) => plain(a).includes('zebr') },
  { id: 'stars', label: 'Kolik je na vlajce USA hvězd', right: (a) => ['50', 'padesat'].includes(plain(a)) },
  { id: 'water', label: 'Chemické označení dihydrogen monoxidu', right: (a) => ['h2o', 'voda'].includes(plain(a)) },
  { id: 'whale', label: 'Největší savec je z jakého řádu', right: (a) => /^(kytov|cetace)/.test(plain(a)) },
  { id: 'comfortFood', label: 'Nejoblíbenější jídlo z dětství', personal: true },
];

/** Marks the one clickable word in the contract. */
export const EGG = '[[brouk]]';

export const CONTRACT: readonly string[] = [
  '§ 1 Úvodní ustanovení. Tento dokument upravuje vztahy mezi stranou první, stranou druhou a stranou, která se dostavila omylem. Pojmy zde neuvedené se vykládají tak, jak se to zrovna hodí.',
  '§ 2 Předmět. Předmětem tohoto ujednání je ujednání o předmětu. Uživatel bere na vědomí, že vzal na vědomí.',
  '§ 3 Práva a povinnosti. Uživatel je oprávněn posouvat, přepínat a otáčet. Poskytovatel je oprávněn se u toho tvářit mile. Hejblátka zůstávají majetkem hejblátek.',
  '§ 4 Doba trvání. Ujednání se uzavírá na dobu, která uplyne. Lhůty počínají běžet dnem následujícím po dni, kdy začaly.',
  '§ 5 Odpovědnost. Poskytovatel neodpovídá za škody, radosti ani nutkání srovnat vše do latě. Uživatel odpovídá na otázky.',
  '§ 6 Ochrana údajů. Vše, co uživatel sdělil, sdělil dobrovolně a s úsměvem. Poskytovatel si vyhrazuje právo to na konci hezky popořadě vyjmenovat.',
  `§ 7 Zvláštní ujednání. Tento odstavec nikdo nečte. Kdo ho přesto čte, smí kliknout na slovo ${EGG}. Většina to neudělá.`,
  '§ 8 Vyšší moc. Za vyšší moc se považuje zejména kočka na klávesnici, pondělí a aktualizace v nevhodnou chvíli.',
  '§ 9 Závěrečná ustanovení. Stisknutím rozsvíceného slova uživatel potvrzuje, že dokument přečetl až do konce, že mu rozuměl a že by to udělal znovu.',
];

export const CONTRACT_WORDS = CONTRACT.join(' ').split(/\s+/).length;
