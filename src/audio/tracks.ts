/**
 * The recorded music: 8-bit covers under a free licence, cut into one loop per
 * scene. Each file holds a stretch of the song that repeats seamlessly between
 * `loopStart` and `loopEnd` (seconds in the file); playback begins at `start`
 * and then circles the loop until the scene moves on. The seams were picked on
 * whole phrases where the music before the end matches the music before the
 * start, with a short crossfade baked in, and each file carries a little of
 * the loop again on both sides, so a decoder that shifts the audio by a few
 * milliseconds still loops cleanly.
 *
 * Which song goes where, by what it is about and how it feels:
 * - Save State (calm chiptune, a game's save screen): the harmless start, the
 *   desk and PAL's first friendly window, painting. The opening plays the song
 *   from its very beginning once, then loops; the garden comes back to it.
 * - Blinding Lights (bright, fast, euphoric, about craving): the dopamine
 *   middle, fidgets, the button not to click, the gold chest and the shiny prize.
 * - The Wolf (a wolf among people): the predator in disguise. Its quiet verses
 *   for the rescue and the plea, the chorus as the download gets in, the calm
 *   bridge for the shelter, among the animals.
 * - Radioactive (waking up to ash and dust): the dread under the toast, then
 *   the crash, when everything falls apart.
 * - Jar of Hearts (someone collecting hearts and leaving scars): the reveal,
 *   where PAL shows the hearts it collected on the way.
 */
export interface Track {
  /** File in `public/music/`. */
  readonly file: string;
  readonly start: number;
  readonly loopStart: number;
  readonly loopEnd: number;
  /** Evens the loops out: louder songs a touch down, quiet verses a touch up. */
  readonly gain: number;
}

export type TrackId =
  | 'mailbox'
  | 'desk'
  | 'welcome'
  | 'paint'
  | 'fidgets'
  | 'dontclick'
  | 'chest'
  | 'prize'
  | 'rescue'
  | 'plea'
  | 'download'
  | 'shelter'
  | 'glass'
  | 'crash'
  | 'reveal'
  | 'garden';

const loop = (file: string, loopEnd: number, gain: number): Track => ({ file, start: 0.5, loopStart: 0.5, loopEnd, gain });

export const TRACKS: Record<TrackId, Track> = {
  // Save State: from the first note, then its first full section, round and round.
  mailbox: { file: 'mailbox.aac', start: 0, loopStart: 25.84381, loopEnd: 41.49381, gain: 0.85 },
  // The same garden later on: straight into the loop.
  garden: { file: 'mailbox.aac', start: 25.84381, loopStart: 25.84381, loopEnd: 41.49381, gain: 0.85 },
  desk: loop('desk.aac', 16.15213, 1.35),
  welcome: loop('welcome.aac', 16.16238, 0.82),
  paint: loop('paint.aac', 16.1568, 0.83),
  // Blinding Lights
  fidgets: loop('fidgets.aac', 34.18522, 0.9),
  dontclick: loop('dontclick.aac', 22.95633, 0.88),
  chest: loop('chest.aac', 34.18422, 0.87),
  prize: loop('prize.aac', 11.72807, 0.87),
  // The Wolf
  rescue: loop('rescue.aac', 10.39678, 1.75),
  plea: loop('plea.aac', 15.34553, 1.58),
  download: loop('download.aac', 20.29227, 1.08),
  shelter: loop('shelter.aac', 30.19107, 1.22),
  // Radioactive
  glass: loop('glass.aac', 14.55562, 1.04),
  crash: loop('crash.aac', 35.63458, 0.87),
  // Jar of Hearts: one whole turn of the song.
  reveal: loop('reveal.aac', 46.7385, 1.47),
};

/** Which recording plays under each scene. Every scene has one; its synth theme plays only if the download fails. */
export const SCENE_TRACK: Record<string, TrackId> = {
  mailbox: 'mailbox',
  desk: 'desk',
  welcome: 'welcome',
  fidgets: 'fidgets',
  paint: 'paint',
  rescue: 'rescue',
  shelter: 'shelter',
  flower: 'garden',
  dontclick: 'dontclick',
  chest: 'chest',
  plea: 'plea',
  download: 'download',
  prize: 'prize',
  glass: 'glass',
  crash: 'crash',
  reveal: 'reveal',
};

export function isTrack(id: string): id is TrackId {
  return Object.hasOwn(TRACKS, id);
}
