import type { RewardKind } from '../scenes/chest-model.ts';

/**
 * The lootbox, only hinted at: points as a reward, chests that hold almost
 * nothing, one shiny exception, and a golden chest you can only afford by
 * paying with something about yourself.
 */
export const CHEST = {
  intro: 'Za všechno, cos dneska udělal, máš body! Celých 150.',
  pick: 'Otevři si truhličku. Nikdy nevíš, co v ní bude.',
  pointsLabel: 'Body',
  cost: (n: number) => `${n} bodů`,
  chestLabel: (i: number) => `Truhlička ${i}`,
  goldLabel: 'Zlatá truhla',
  rewards: {
    point: '+1 bod',
    nothing: 'Nic',
    key: 'VZÁCNÉ! Zlatý klíček',
  } satisfies Record<RewardKind, string>,
  palAfter: {
    point: 'Hm, jeden bod. Zkus další!',
    nothing: 'Smůla. Ale příště… kdo ví.',
    key: 'Jůůů! Zlatý klíček! Ten odemyká zlatou truhlu!',
  } satisfies Record<RewardKind, string>,
  broke: 'Zlatá truhla stojí 200 bodů. A tobě zbyl… jeden.',
  offer: 'Chceš body hned? Stačí odpovědět na jednu otázku.',
  question: 'Jak se jmenoval tvůj první mazlíček?',
  earn: 'Získat 200 bodů',
  skip: 'Přeskočit',
  empty: 'Napiš aspoň něco.',
  thanks: (pet: string) => `${pet}! To je krásné jméno. Tady máš body.`,
  goldReward: 'Nálepka „Nejlepší hráč“ ✨',
  afterGold: 'Krásná, ne? Příště tam bude třeba něco většího.',
  skipped: 'Škoda. Zlatá truhla tu na tebe počká.',
  leave: 'Nechat to být',
  go: 'Pokračovat',
} as const;
