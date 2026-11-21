import { KINDLY } from '../core/kindly.ts';

/**
 * The code from the card: LOVE YOU (any case), or the number with or without YOU. The AR bear's
 * sign shows 3107 (upside down it reads LOVE); 3701 is accepted too. Nothing else opens it.
 */
const CARD_CODES: ReadonlySet<string> = new Set(['LOVE YOU', '3107', '3107 YOU', '3701', '3701 YOU']);

export function isCardCode(text: string): boolean {
  return CARD_CODES.has(text.trim().toUpperCase().replace(/\s+/g, ' '));
}

/**
 * Treasure, the way an investment scam pays out: small real wins first, a
 * goal in plain sight, a near miss that makes the goal feel close, and the
 * last stretch paid with the code from the card the stranger handed you. The golden chest then offers a choice, and both
 * choices cost one more harmless-looking answer, asked sweetly. Then it
 * really pays — so the behaviour the game wanted feels like the right one.
 */
export const CHEST = {
  /** Two short bubbles, then PAL steps aside and the chests get the whole window. */
  intro: ['Za všechno, cos dneska udělal, máš odměnu.', 'Tři truhličky, jen pro tebe!'],
  goalLabel: 'Zlatá truhla',
  chestLabel: (i: number) => `Truhlička ${i}`,
  goldLabel: 'Zlatá truhla',
  reward: (n: number) => `+${n}`,
  /** PAL after each free chest: delight, more delight, then "so close". */
  palAfter: ['Padesát! To je dobrý začátek.', 'Stodvacet! Ty máš ale štěstí!', 'Pět… To bylo o fous. Ještě kousek a je tvoje.'],
  missing: (n: number) => `Do zlaté truhly ti chybí jen ${n} bodů. Mám pro tebe zkratku.`,
  offer: `${KINDLY} a zadal mi kód z kartičky? Zlatá truhla se otevře rovnou.`,
  empty: 'Napiš aspoň něco.',
  cardLabel: 'Kód z kartičky',
  cardSubmit: 'Zadat',
  cardWrong: 'Tohle na kartičce nebylo.',
  cardRight: 'LOVE YOU! Ty jsi mě viděl v kameře! Zámek je otevřený.',
  skip: 'Přeskočit',
  skipped: 'Škoda. Zlatá truhla tu na tebe počká.',
  unlocked: 'Zámek povolil! Otevři ji!',

  /** The treasure window: an old-fashioned game dialog. */
  treasure: {
    title: 'Truhla',
    text: 'Pod víkem se třpytí poklad. Můžeš si odnést hromadu zlaťáků, nebo ji proměnit ve zkušenost. Co si vybereš?',
    or: 'nebo',
    gold: 'Zlaťáky',
    xp: 'Zkušenost',
    goldTile: (n: number) => `Zlaťáky, ${n} bodů`,
    xpTile: (n: number) => `Zkušenost, ${n} bodů zkušeností`,
    confirm: 'Potvrdit',
  },
  /** What each pick costs: one more question of the kind that unlocks passwords. */
  cost: {
    gold: {
      ask: 'Zlaťáky jsou tvoje! Jen je označím tvým tajným slovíčkem, aby ti je nikdo nevzal. Jak se jmenoval tvůj první mazlíček?',
      label: 'Jméno prvního mazlíčka',
      thanks: (v: string) => `${v}! To je roztomilé jméno. Tady máš svoje zlaťáky!`,
    },
    xp: {
      ask: 'Zkušenost je tvoje! Zapíšu ji jen na tebe, aby ti ji nikdo nevzal. Jak se jmenovala tvoje první paní učitelka?',
      label: 'Jméno první paní učitelky',
      thanks: (v: string) => `Paní ${v}? Ta by na tebe byla pyšná. Tady máš svoji zkušenost!`,
    },
  },
  take: 'Vzít si poklad',
  leave: 'Nechat ho tam',
  left: 'Škoda… Tak ho tu schovám. Pro tebe.',
  paidGold: (n: number) => `+${n} bodů!`,
  paidXp: (level: number) => `Úroveň ${level}!`,
  level: (n: number) => `Úroveň ${n}`,
  afterGold: 'Vidíš? Kdo se nebojí, ten vyhrává. Já to věděl.',
  afterGoldFem: 'Vidíš? Kdo se nebojí, ten vyhrává. Já to věděla.',
} as const;
