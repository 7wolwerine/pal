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
  /** Counts scene runs. Every #enter gets its own number, so a done() from an older run, even of the same scene, is told apart from the current one. */
  #run = 0;

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

  /**
   * Opens a scene out of order, tearing down the current one first. This is
   * reachable in the shipped build: the ?debug arrows, ?scene=<id> and the
   * cheat console's edit mode all go through it (main.ts makeJumper). Scene
   * cleanups must therefore hold up to a jump at any moment.
   */
  jumpTo(id: string): void {
    const index = this.#scenes.findIndex((s) => s.id === id);
    if (index < 0) throw new Error(`Unknown scene "${id}".`);
    this.#enter(index);
  }

  #enter(index: number): void {
    // Claim this run first, so anything the old scene does while it is being
    // torn down (such as calling its own done()) already counts as stale.
    const run = ++this.#run;
    const previous = this.#cleanup;
    this.#cleanup = undefined;
    previous?.();
    // The old cleanup started another scene change itself; that one wins.
    if (this.#run !== run) return;
    this.#index = index;
    const scene = this.#scenes[index];
    if (!scene) return;
    this.#onEnter(scene);
    let finished = false;
    const cleanup = scene.mount(this.#ctx, () => {
      // A run may only finish once, and only while it is still the current
      // run. Re-entering the same scene starts a new run, so an old done()
      // from before the jump no longer counts.
      if (finished || this.#run !== run) return;
      finished = true;
      if (!scene.final) this.#enter(index + 1);
    });
    // If the scene finished inside mount, the next scene is already running
    // and owns #cleanup. This run's cleanup was never stored, so run it now:
    // every run is cleaned up exactly once.
    if (this.#run === run) this.#cleanup = cleanup;
    else cleanup?.();
  }
}
