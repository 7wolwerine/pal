/**
 * Violated expectations, kept for the very end. Until now everything in the
 * game behaved the way things should — the glass over the flower broke like
 * glass. Here a glass falls off the table and bounces like rubber, while the
 * sparkling wine in it shatters into shards. The first crack in the game's reality.
 */
export const GLASS = {
  sceneLabel: 'Oslava. Na stolku stojí láhev a sklenka se šumivým vínem. U stojacího zrcadla stojí tvoje postavička.',
  toast: 'Na zdraví! Připijem si na tvou výhru.',
  label: 'Sklenka se šumivým vínem',
  after: 'Hm. To se nemělo stát.',
  mirror: 'Stojací zrcadlo',
  /** What the character says to the tired face in the mirror. Exactly this. */
  mirrorLine: 'Navzdory všemu jsem to pořád já.',
} as const;
