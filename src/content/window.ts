/**
 * What PAL says when the player pokes the window's title-bar buttons. Before
 * the player has bonded with the assistant, closing gets a light, playful
 * protest; afterwards it turns into clingy, guilt-tripping pleading.
 */
export const WINDOW_REACTIONS = {
  closeSoft: ['Ty už si nechceš hrát?', 'Ale no tak, bude to zábava!', 'Pojď, musíme vyřešit tady tohle.'],
  closeHard: ['To bys mi neudělal… ne?', 'Prosím, nedělej to :-(', 'Tobě na mě už vůbec nezáleží?', 'Opravdu je to konec? :-('],
} as const;
