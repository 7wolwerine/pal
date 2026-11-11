export const FIDGETS = {
  /** A remark, not an instruction. Nobody ever tells the player to tidy up. */
  remark: 'Jé. Tady to někdo pěkně rozházel.',
  controlLabels: { slider: 'Posuvník', toggle: 'Přepínač', dial: 'Kolečko' },

  /** BUG tells the truth the whole time. Nobody listens to a bug. */
  bug: [
    { before: 'BUG: Hej! Co to děláš?', after: 'BUG: Tak. A nesahej na to.' },
    { before: 'BUG: Jsi normální? Nech to být!', after: 'BUG: Řekl ti vůbec někdo, ať to rovnáš?' },
    { before: 'BUG: Vážně? Víš aspoň, proč to děláš?', after: 'BUG: Naposledy. Prosím.' },
  ],
  bugResigns: 'BUG: Fajn. Dělej si, co chceš. Já tě varoval.',

  quizIntro: 'Jé, něco se otevřelo! Vypadá to jako zámek. Ty to určitě zvládneš líp než já.',
  quizSubmit: 'Odeslat vše',
  quizIncomplete: 'Ještě něco chybí.',

  sequenceIntro: 'Skoro! Ještě ta světýlka.',
  sequenceLabel: 'Světýlko',

  contractIntro: 'Poslední věc, slibuju. Je to jen formalita.',
  contractTitle: 'PŘEČÍST AŽ DO KONCE A POTVRDIT',
  contractAgree: 'SOUHLASÍM',

  release: (name: string) =>
    `Uf, konečně jsem venku! Díky moc${name ? `, ${name}` : ''}, jsi můj zachránce. Máš to prostě v sobě. Fakt nevím, co bych bez tebe…`,
  releaseChoices: ['To nic nebylo', 'Vždycky pomůžu'],
} as const;

export interface QuizQuestion {
  readonly id: string;
  readonly label: string;
  /** The one question that is about the player, not about the world. */
  readonly personal?: boolean;
}

export const QUIZ: readonly QuizQuestion[] = [
  { id: 'zebra', label: 'Zadej pruhovaného lichokopytníka' },
  { id: 'stars', label: 'Kolik je na vlajce USA hvězd' },
  { id: 'dictator', label: 'Křestní jméno prvního světového diktátora' },
  { id: 'invertebrate', label: 'Bezobratlý živočich' },
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
