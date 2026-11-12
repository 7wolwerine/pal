/**
 * Treasure, the way an investment scam pays out: small real wins first, a
 * goal in plain sight, a near miss that makes the goal feel close, and the
 * last stretch paid with something about yourself (or the code from the card
 * the stranger handed you). Then the golden chest really pays — so the
 * behaviour the game wanted feels like the right one.
 */
export const CHEST = {
  intro: 'Za všechno, cos dneska udělal, máš odměnu. Tři truhličky, jen pro tebe!',
  pointsLabel: 'Body',
  goalLabel: 'Zlatá truhla',
  chestLabel: (i: number) => `Truhlička ${i}`,
  goldLabel: 'Zlatá truhla',
  reward: (n: number) => `+${n}`,
  /** PAL after each free chest: delight, more delight, then "so close". */
  palAfter: ['Padesát! To je dobrý začátek.', 'Stodvacet! Ty máš ale štěstí!', 'Pět… To bylo o fous. Ještě kousek a je tvoje.'],
  missing: (n: number) => `Do zlaté truhly ti chybí jen ${n} bodů. Mám pro tebe zkratku.`,
  offer: 'Odpovíš na jednu otázku a máš je. Nebo, jestli máš kód z kartičky, otevře ji rovnou.',
  question: 'V jaké ulici jsi vyrůstal?',
  answerButton: (n: number) => `Odpovědět (+${n})`,
  empty: 'Napiš aspoň něco.',
  thanks: (street: string) => `${street}! Tam to muselo být krásné. Tady máš body.`,
  cardLink: 'Mám kód z kartičky',
  cardLabel: 'Kód z kartičky',
  cardSubmit: 'Zadat',
  cardWrong: 'Tohle na kartičce nebylo.',
  cardRight: 'LOVE YOU! Ty jsi mě viděl v kameře! Zámek je otevřený.',
  skip: 'Přeskočit',
  skipped: 'Škoda. Zlatá truhla tu na tebe počká.',
  unlocked: 'Zámek povolil! Otevři ji!',
  treasure: (n: number) => `+${n} bodů!`,
  afterGold: 'Vidíš? Kdo se nebojí, ten vyhrává. Já to věděl.',
  afterGoldFem: 'Vidíš? Kdo se nebojí, ten vyhrává. Já to věděla.',
} as const;
