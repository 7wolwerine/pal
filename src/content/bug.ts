/**
 * BUG's warnings across the game. It is the only one telling the truth, and
 * every warning is right. PAL laughs each one off and asks again, warmly.
 */
export const BUG_WARNINGS = {
  mailbox: 'Nesahej na to! Neznáš odesílatele!',
  desk: 'Cizí flashku do počítače?! Jsi normální?!',
  welcome: 'Neříkej mu, jak se jmenuješ!',
  paint: 'Nesahej na to! To nejde vrátit!',
  rescue: 'Nedej se! Vydírá tě!',
  restore: 'Zase opravuješ cizí věci? Nikdo tě neprosil!',
  flower: 'To sklo ji chrání! Nech ho být!',
  chest: 'To je kontrolní otázka k heslu!!',
  download: 'Koukni na adresu dole!! To není jeho stránka!!',
  prize: 'Nedávej mu e-mail!!',
} as const;

/** PAL's answers: dismiss the beetle, then repeat the ask, nicer than before. */
export const PAL_DISMISSES = {
  welcome: 'Nevšímej si ho, je to jen brouk. Tak jak ti mám říkat? <3',
  chest: 'Brouk zase panikaří. Je to jen jméno. Tak jak se jmenoval?',
  prize: 'Neboj, ten je jen žárlivý. Kam ti ho pošlu?',
} as const;

export type WarningScene = keyof typeof BUG_WARNINGS;
