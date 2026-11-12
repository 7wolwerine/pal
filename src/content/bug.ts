/**
 * BUG's outbursts across the game. He sees what is going on, but he never
 * explains, warns or tells the player what to do: he only grumbles, mocks and
 * stamps his feet, so he simply comes across as annoying. That he meant well
 * only dawns on the player at the very end. PAL laughs each outburst off.
 */
export const BUG_WARNINGS = {
  mailbox: 'Tsss. Typický.',
  desk: 'Jsi ty vůbec normální?!',
  welcome: 'Ty jsi teda případ.',
  paint: 'No nádhera. Fakt nádhera.',
  rescue: 'Tohle sleduju a nevěřím vlastním očím.',
  restore: 'Hmpf. Pan zachránce.',
  flower: 'Ty jsi fakt hroznej.',
  chest: 'No to snad ne…',
  download: 'Bravo. Prostě bravo.',
  prize: 'Grrr. Ty jsi nemožnej.',
} as const;

/** PAL's answers: dismiss the beetle, then repeat the ask, nicer than before. */
export const PAL_DISMISSES = {
  welcome: 'Nevšímej si ho, je to jen brouk. Tak jak ti mám říkat? <3',
  chest: 'Brouk zase panikaří. Tak jak se jmenoval?',
  prize: 'Neboj, ten je jen žárlivý. Kam ti ho pošlu?',
} as const;

export type WarningScene = keyof typeof BUG_WARNINGS;
