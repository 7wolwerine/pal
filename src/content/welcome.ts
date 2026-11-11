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

export const WELCOME = {
  askName: 'Ahoj! <3 Jak ti mám říkat?',
  namePlaceholder: 'Tvoje jméno',
  nameSubmit: 'To jsem já',
  nameEmpty: 'Nejdřív mi něco napiš.',
  askLook: (name: string) => `Wow, takže se jmenuješ ${name}! Budu ti pomáhat. Jak vypadám?`,
  lookPromise: 'Jé, to mi bude slušet! Hned jak se odsud dostanu…',
  slip: 'Oh, it’s a me, Mari-',
  askOwnName: 'Ale ne, teď se mi to úplně ztratilo. Jak se jmenuju?',
  ownNamePlaceholder: 'Nebo mi vymysli vlastní',
  ownNameSubmit: 'Tak se jmenuješ',
  ownNameEmpty: 'Bez jména se cítím ztraceně.',
  thanks: (own: string, name: string) => `${own}! To je krásné. Díky, ${name}, teď už jsme parťáci.`,
  go: 'Jdeme na to',
} as const;

export const NAME_MAX_LENGTH = 24;
