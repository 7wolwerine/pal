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
