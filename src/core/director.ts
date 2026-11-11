/**
 * The Director runs scenes one after another. It also guards the one rule the
 * whole game depends on: the reveal is the last thing the player sees, and
 * nothing before it may give the game away.
 */

export type Cleanup = () => void;

export interface Scene<C> {
  readonly id: string;
  /** Marks the reveal. Exactly one scene has it, and it must be the last one. */
  readonly final?: boolean;
  /** Builds the scene. Call `done` once when the player has finished it. */
  mount(ctx: C, done: () => void): Cleanup | void;
}

export class Director<C, S extends Scene<C> = Scene<C>> {
  readonly #scenes: readonly S[];
  readonly #ctx: C;
  readonly #onEnter: (scene: S) => void;
  #index = -1;
  #cleanup: Cleanup | void = undefined;

  constructor(scenes: readonly S[], ctx: C, onEnter: (scene: S) => void = () => {}) {
    if (scenes.length === 0) throw new Error('Director needs at least one scene.');
    const ids = new Set(scenes.map((s) => s.id));
    if (ids.size !== scenes.length) throw new Error('Scene ids must be unique.');
    const finals = scenes.filter((s) => s.final);
    if (finals.length !== 1) throw new Error('Exactly one scene must be final (the reveal).');
    if (!scenes[scenes.length - 1]?.final) throw new Error('The reveal must be the last scene.');
    this.#scenes = scenes;
    this.#ctx = ctx;
    this.#onEnter = onEnter;
  }

  get currentId(): string | undefined {
    return this.#scenes[this.#index]?.id;
  }

  get sceneIds(): string[] {
    return this.#scenes.map((s) => s.id);
  }

  start(): void {
    this.#enter(0);
  }

  /** Development aid for working on one scene. Never wired to anything in the shipped build. */
  jumpTo(id: string): void {
    const index = this.#scenes.findIndex((s) => s.id === id);
    if (index < 0) throw new Error(`Unknown scene "${id}".`);
    this.#enter(index);
  }

  #enter(index: number): void {
    this.#cleanup?.();
    this.#cleanup = undefined;
    this.#index = index;
    const scene = this.#scenes[index];
    if (!scene) return;
    this.#onEnter(scene);
    let finished = false;
    this.#cleanup = scene.mount(this.#ctx, () => {
      // A scene may only finish once, and only while it is the current one.
      if (finished || this.#index !== index) return;
      finished = true;
      if (!scene.final) this.#enter(index + 1);
    });
  }
}
