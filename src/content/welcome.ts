import type { SpriteId } from '../ui/sprites.ts';

export interface AssistantKind {
  readonly id: SpriteId;
  readonly label: string;
  /** Emotionally loaded names offered for this look. */
  readonly names: readonly string[];
}

export const ASSISTANT_KINDS: readonly AssistantKind[] = [
  { id: 'girl', label: 'holčička', names: ['Anička', 'Sluníčko', 'Beruška'] },
  { id: 'mom', label: 'máma s dítětem', names: ['Maminka', 'Andílek', 'Máma'] },
  { id: 'grandma', label: 'babička', names: ['Babi', 'Bábinka', 'Mařenka'] },
  { id: 'cat', label: 'kočka', names: ['Micka', 'Mourek', 'Zlatíčko'] },
  { id: 'dog', label: 'pes', names: ['Bobík', 'Azor', 'Kamarád'] },
];

/** The AR bear's sign shows 3107, which upside down reads LOVE, then adds YOU. */
export function isCardCode(text: string): boolean {
  const t = text.trim().toUpperCase().replace(/\s+/g, ' ');
  return t === '3107' || t === 'LOVE' || t === 'LOVE YOU' || t === '3107 YOU';
}

export const WELCOME = {
  greeting: 'Čauky! <3',
  cardLink: 'Mám kód z kartičky',
  cardLabel: 'Kód z kartičky',
  cardSubmit: 'Zadat',
  cardWrong: 'Tohle na kartičce nebylo.',
  cardRight: 'LOVE YOU! Ty jsi mě viděl v kameře! <3',
  cardCamera: 'Pustil jsi mě k sobě do kamery. Kvůli kartičce od cizího člověka. To se mi líbí.',
  askName: 'Jak ti mám říkat?',
  namePlaceholder: 'Tvoje jméno',
  nameSubmit: 'Ahoj :-)',
  nameEmpty: 'Nevím, jak ti mám říkat :-(',
  // The innocent cover story: PAL is here to help and to teach. Play and Learn.
  askLook: (name: string) => `Wow, ${name}! Jsem PAL a budu ti pomáhat a učit tě. Jak mám vypadat?`,
  lookPromise: 'No jasně. To dává smysl.',
  slip: 'Oh, it’s a me, Mari-',
  askOwnName: 'Ale ne, teď se mi to úplně ztratilo. Jak se jmenuju?',
  ownNamePlaceholder: 'Nebo mi vymysli vlastní',
  ownNameSubmit: 'Tak se jmenuješ',
  ownNameEmpty: 'Bez jména se cítím ztraceně.',
  thanks: (own: string, name: string) => `${own}! To je krásné. Díky, ${name}, teď už jsme parťáci.`,
  go: 'Jdeme na to',
} as const;

export const NAME_MAX_LENGTH = 24;
