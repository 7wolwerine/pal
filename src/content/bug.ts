/**
 * BUG's outbursts across the game. It is the only one who sees what is going
 * on, but it never explains anything: it only panics, begs and stamps its
 * feet, so the player cannot tell from it which trick is being played. PAL
 * laughs each outburst off and asks again, warmly.
 */
export const BUG_WARNINGS = {
  mailbox: 'Ne ne ne ne! Nech to tam!',
  desk: 'Co to děláš?! Jsi normální?!',
  welcome: 'Počkej! Co to tam píšeš?!',
  paint: 'Stůj! Ne! Počkej!',
  rescue: 'Proč ho posloucháš?!',
  restore: 'Co je ti po tom?! Nech to být!',
  flower: 'Ne! Nesahej na ni!',
  chest: 'Ne! Tohle ne! Prosím!',
  download: 'Neklikej!! Jsi normální?!',
  prize: 'Už ne! Prosím, už ne!',
} as const;

/** PAL's answers: dismiss the beetle, then repeat the ask, nicer than before. */
export const PAL_DISMISSES = {
  welcome: 'Nevšímej si ho, je to jen brouk. Tak jak ti mám říkat? <3',
  chest: 'Brouk zase panikaří. Tak jak se jmenoval?',
  prize: 'Neboj, ten je jen žárlivý. Kam ti ho pošlu?',
} as const;

export type WarningScene = keyof typeof BUG_WARNINGS;
