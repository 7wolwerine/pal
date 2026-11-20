/** What the cheat console answers. */
export const CONSOLE = {
  label: 'Konzole',
  kaching: '+1 000 bodů. Kaching!',
  motherlode: '+50 000 bodů. Tolik peněz!',
  dragons: 'Pět černých draků. Jen se dívají.',
  editOn: 'Režim úprav: srdíčka nahoře otevřou kteroukoli scénu.',
  editOff: 'Režim úprav vypnut.',
  unknown: 'Neznámý příkaz.',
  heart: (n: number) => `Otevřít scénu ${n}`,
  gift: 'Otevřít výhru',
} as const;
