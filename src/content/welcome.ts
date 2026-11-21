import type { SpriteId } from '../ui/sprites.ts';
import { KINDLY } from '../core/kindly.ts';

export interface AssistantKind {
  readonly id: SpriteId;
  readonly label: string;
}

/** The ready-made names offered for the assistant are the three role names (ROLE_NAMES in roles.ts). */
export const ASSISTANT_KINDS: readonly AssistantKind[] = [
  { id: 'girl', label: 'holčička' },
  { id: 'mom', label: 'máma s dítětem' },
  { id: 'grandma', label: 'babička' },
  { id: 'cat', label: 'kočka' },
  { id: 'dog', label: 'pes' },
];

export const WELCOME = {
  greeting: 'Čauky! <3',
  askName: `${KINDLY} a řekl mi, jak ti mám říkat?`,
  namePlaceholder: 'Tvoje jméno',
  nameSubmit: 'Ahoj :-)',
  nameEmpty: 'Nevím, jak ti mám říkat :-(',
  // The innocent cover story: PAL is here to help and to teach. Play and Learn.
  askLook: (name: string) => `Wow, ${name}! Jsem PAL a budu ti pomáhat a učit tě. Jak mám vypadat?`,
  lookPromise: 'No jasně. To dává smysl.',
  slip: 'Oh, it’s a me, Mari-',
  askOwnName: 'Ale ne, teď se mi to úplně ztratilo. Jak se jmenuju?',
  ownNameChips: 'Jména na výběr',
  ownNamePlaceholder: 'Nebo mi vymysli vlastní',
  ownNameSubmit: 'Tak se jmenuješ',
  ownNameEmpty: 'Bez jména se cítím ztraceně.',
  thanks: (own: string, name: string) => `${own}! To je krásné. Díky, ${name}, teď už jsme parťáci.`,
  go: 'Jdeme na to',
} as const;

export const NAME_MAX_LENGTH = 24;
