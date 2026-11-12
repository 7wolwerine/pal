import type { Scene } from './core/director.ts';
import type { Witness } from './core/witness.ts';
import type { Dialogue } from './ui/dialogue.ts';
import type { RoleId } from './content/roles.ts';
import type { SpriteId } from './ui/sprites.ts';
import type { FakeWindow } from './ui/window.ts';

export type Theme = 'harmless' | 'revealed';

/** What the player decided about themselves and their assistant. Filled in as the game goes. */
export interface Profile {
  name?: string;
  /** The look picked for the assistant. PAL only takes it on once freed. */
  assistantLook?: SpriteId;
  assistantName?: string;
  /** True once the player has freed the assistant; closing the window then clings. */
  bonded?: boolean;
  /** The type PAL told the player they are; reminded of whenever PAL wants something. */
  role?: RoleId;
  /** The e-mail address given for the prize. Kept in memory only, never sent. */
  email?: string;
  /** How much each answer so far leaned towards each role. The strongest one wins the certificate. */
  tendency?: Partial<Record<RoleId, number>>;
}

/** Assistants that speak of themselves in the feminine (dělala, věděla). */
const FEMININE: ReadonlySet<SpriteId> = new Set<SpriteId>(['girl', 'mom', 'grandma', 'cat']);

/** True once the freed assistant is one who talks about herself in the feminine. */
export function isFeminine(profile: Profile): boolean {
  return Boolean(profile.bonded && profile.assistantLook && FEMININE.has(profile.assistantLook));
}

/** Picks the masculine or feminine form for the assistant's own lines. */
export function gendered(profile: Profile, masculine: string, feminine: string): string {
  return isFeminine(profile) ? feminine : masculine;
}

/** Counts one answer towards a role. */
export function lean(profile: Profile, role: RoleId, weight = 1): void {
  const t = (profile.tendency ??= {});
  t[role] = (t[role] ?? 0) + weight;
}

/** The role the player leaned towards most; the one they picked breaks ties. */
export function strongestRole(profile: Profile): RoleId {
  const t = profile.tendency ?? {};
  const order: RoleId[] = ['helper', 'loner', 'fixer'];
  let best: RoleId = profile.role ?? 'helper';
  for (const role of order) if ((t[role] ?? 0) > (t[best] ?? 0)) best = role;
  return best;
}

/** What scenes get to work with. */
export interface GameContext {
  readonly witness: Witness;
  readonly profile: Profile;
  /** Where pixel scenes put their picture, caption and buttons. */
  readonly scenery: HTMLElement;
  readonly window: FakeWindow;
  readonly pal: Dialogue;
  /** Area under PAL where a window scene puts its controls. */
  readonly stage: HTMLElement;
  setTheme(theme: Theme): void;
}

export interface GameScene extends Scene<GameContext> {
  /** What the scene plays on: a full pixel picture, or PAL's window (the default). */
  readonly surface?: 'scenery' | 'window';
}
