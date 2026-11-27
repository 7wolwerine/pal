import type { SpriteId } from '../ui/sprites.ts';
import { KINDLY_PLEASE } from '../core/kindly.ts';

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
  greeting: 'Jé, ahoj! <3',
  askName: 'Řekneš mi prosím, jak se jmenuješ?',
  namePlaceholder: 'Tvoje jméno',
  nameSubmit: 'Ahoj :-)',
  nameEmpty: 'Nevím, jak ti mám říkat :-(',
  /** The name is praised, and only then does PAL introduce itself: Play and Learn, here to help. */
  namePraise: (name: string) => `${name}, to je moc hezké jméno. Já jsem PAL, Tvůj nový asistent. Budeme se spolu učit a já Ti pomůžu.`,
  /**
   * The one request in this scene that asks nicely. It is worded its own way, not with PAL's usual
   * phrase, so that the pattern only shows itself later; the reveal counts it with the rest.
   */
  askLook: `Můžeš mi ${KINDLY_PLEASE} vybrat, jak budu vypadat?`,
  lookPromise: 'Skvělá volba, to dává smysl.',
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
