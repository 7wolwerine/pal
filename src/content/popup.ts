/**
 * Inverted UI. Near the end, when the player has learned to click without
 * thinking, a "data sharing" popup appears and PAL asks them to close it.
 * The × in the corner shares; the big green button shares; only the small
 * grey "No" dismisses it. Experienced people reach for the × by reflex.
 * The sharing is theatre: nothing is sent anywhere.
 */
export const POPUP = {
  palAsk: 'Ach jo, zase vyskakovací okno. Zavři ho, ať můžeme dál.',
  title: 'Sdílení výsledků',
  text: 'Chcete sdílet své jméno, odpovědi a herní výsledky s našimi partnery?',
  /** What the × really does, said only by its tooltip and its accessible name. */
  closeTruth: 'Souhlasím a sdílet',
  yes: 'Ano, sdílet vše',
  no: 'Ne',
  sending: (n: number, of: number) => `Odesílám partnerům… ${n}/${of}`,
  sent: (of: number) => `Sdíleno s ${of} partnery ✓`,
  partners: 312,
  palAfterReflex: 'Ups. To byl křížek? Hm. Dneska je všechno nějak naopak.',
  palAfterYes: 'Super, aspoň to máme z krku.',
  palAfterNo: 'Hm. Ty to vždycky čteš, co?',
  go: 'Pokračovat',
} as const;
