import { KINDLY } from '../core/kindly.ts';

export const FIDGETS = {
  /** A remark, not an instruction. Nobody ever tells the player to tidy up. */
  remark: 'Hm. Skoro hotovo… už jen drobnosti.',
  /** PAL laughs the beetle off, every time. */
  palMocks: ['Nevšímej si ho. Je to jen brouk.', 'Ten je zase hysterický, co?', 'Uf, tohle je fakt otravné.'],
  controlLabels: {
    tilt: 'Obrázek visí nakřivo',
    screw: 'Povolené šroubky',
    chain: 'Lampička s řetízkem',
    book: 'Popadané knížky',
    calendar: 'Kalendář, který pořád ukazuje včerejšek',
    mail: 'Nepřečtená pošta',
  },
  gearsLabel: 'Kolečka',
  gearLabel: 'Kolečko',

  /** The beetle grumbles the whole time. Nobody listens to a beetle. */
  bug: [
    { before: 'Hej! Co děláš?!', after: 'Hmpf.' },
    { before: 'Uklidni se, jo?', after: 'Takhle to patří.' },
    { before: 'Jsi normální?!', after: 'Už mě to nebaví.' },
  ],
  /** Desperate pleas when the player fixes something right in front of it. */
  bugPlead: ['Pfff!', 'Proč to děláš?!', 'Vždyť to bylo v pohodě!', 'Stálo ti to za to?', 'Ty nejsi normální.'],
  /** The beetle's last stand: it sits on a control and the player clicks it off. */
  bugGrab: 'Nepustím!',
  bugShove: ['Dost! Nech to bejt!', 'Au! Přestaň!', 'To je fakt hnusný!'],
  bugFlung: 'Jau…',
  bugResigns: 'Fajn. Tak si dělej, co chceš!',

  /** After the lock clicks open. */
  quizIntro: 'Jsme na správné cestě!',
  quizSubmit: 'Odeslat vše',
  quizIncomplete: 'Ještě něco chybí.',
  /** PAL helps with a wrong answer: a hint the first time, and the second time PAL writes it in. */
  quizHints: {
    zebra: 'Černobílá a pruhovaná. Jako přechod pro chodce.',
    stars: 'Jedna hvězda za každý stát.',
    water: 'Dva vodíky a jeden kyslík. Stačí značky.',
    whale: 'Velryby, delfíni… Začíná to na „ky“.',
  } as Record<string, string>,
  quizFilled: 'Nevadí, napíšu Ti to tam. Nemusíš se s tím párat.',
  foodPraise: (food: string) => `Tak Ty máš nejradši ${food}? Skvělá volba!`,

  sequenceIntro: 'Co je tohle? Dává Ti to smysl?',
  sequenceLabel: 'Světýlko',
  sequenceReset: 'Znovu',
  sequenceHelp: 'Pomoz mi',
  sequenceHelped: 'No jasně, jsem tu přece pro Tebe <3',

  contractIntro: `${KINDLY} a odklikl ještě tohle? Je to poslední věc, pak už budu venku.`,
  contractTitle: 'Všeobecné podmínky vysvobození',
  contractSubtitle: 'verze 3.1.4 · platné od teď',
  contractAgree: 'SOUHLASÍM',
  contractSkip: 'Na konec',

  /** PAL's thanks once freed, in three short bubbles so the window does not stretch. */
  release: (masculine: boolean): readonly string[] => [
    'Uf, díky moc, cítím se mnohem líp.',
    'Jsi můj zachránce. <3',
    `Nevím, co bych bez Tebe ${masculine ? 'dělal' : 'dělala'}.`,
  ],
  /** Each answer leans towards one of the roles. */
  releaseChoices: [
    { label: 'Rádo se stalo!', role: 'helper' },
    { label: 'To nestojí za řeč.', role: 'fixer' },
    { label: 'Maličkost.', role: 'loner' },
  ],
} as const;

export interface QuizQuestion {
  readonly id: string;
  readonly label: string;
  /** The one question that is about the player, not about the world. */
  readonly personal?: boolean;
  /** The right answers, the first as PAL would write it. The personal question has none. */
  readonly answers?: readonly string[];
}

/**
 * An answer the way it is compared: no surrounding spaces, lower case, no
 * accents, and a subscript two written as a plain 2, so ' H₂O ' and 'h2o' are
 * the same, and so are 'padesát' and 'padesat'. Spaces inside stay: 'h2 o' is not 'h2o'.
 */
export function plain(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/₂/g, '2')
    .trim()
    .toLowerCase();
}

/** True only when the answer is exactly one of the right ones: no part of a word, no other word. */
export function isRightAnswer(question: QuizQuestion, answer: string): boolean {
  const given = plain(answer);
  return given !== '' && (question.answers ?? []).some((right) => plain(right) === given);
}

export const QUIZ: readonly QuizQuestion[] = [
  { id: 'zebra', label: 'Zadej pruhovaného lichokopytníka', answers: ['zebra'] },
  { id: 'stars', label: 'Kolik je na vlajce USA hvězd', answers: ['50', 'padesát'] },
  { id: 'water', label: 'Chemické označení dihydrogen monoxidu', answers: ['H2O'] },
  { id: 'whale', label: 'Největší savec je z jakého řádu', answers: ['kytovci'] },
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
