/**
 * Role casting (Cialdini: consistency and commitment). Early on PAL lets the
 * player pick "what type they are", praises the choice, and from then on
 * reminds them of it every time it wants something. People try hard to act
 * like the person they have just been told they are.
 */
export const ROLES = {
  helper: {
    label: 'Totální lifesaver. Vždycky nás zachrání!',
    affirm: 'Tušil jsem to. Svět by se rozpadl bez lidí, jako jsi ty.',
    rescue: 'Jsi přece ten, co pomůže každému… Pomoz mi, voda stoupá!',
    prize: 'Pomohl jsi všem, jak jsi slíbil. Jsi neuvěřitelný! <3',
  },
  loner: {
    label: 'Vlk samotář. Museli jsme si ho adoptovat.',
    affirm: 'To sedí. Ale i vlci potřebují smečku, ne? Já Ti teď budu pomáhat.',
    rescue: 'Vím, že jsi zvyklý na všechno sám. Tentokrát ale potřebuju já tebe!',
    prize: 'Sám proti všem, a stejně jsi to zvládl. A už nejsi sám. Máš mě. <3',
  },
  fixer: {
    label: 'Něco nefunguje? Vím, kdo si bude vědět rady.',
    affirm: 'Wow, hustý. Ty nenecháš nikoho ve štychu a přesně víš, co dělat.',
    rescue: 'Ty se v tomhle vyznáš líp než kdokoli. Prosím, rychle!',
    prize: 'Profík každým coulem. Nic jiného jsem od tebe nečekal! <3',
  },
} as const;

export type RoleId = keyof typeof ROLES;

/**
 * Three ready-made names for the assistant, one per role, offered as chips when the player names it.
 * Common Czech nicknames that fit a boy and a girl alike: Míša the cuddly helper, Saša the lone
 * wolf, Nikola the inventor who can fix anything.
 */
export const ROLE_NAMES: Readonly<Record<RoleId, string>> = {
  helper: 'Míša',
  loner: 'Saša',
  fixer: 'Nikola',
};

/** The role whose ready-made name this is (typed or picked, any case), or undefined. */
export function roleForName(name: string): RoleId | undefined {
  const wanted = name.trim().toLocaleLowerCase('cs');
  return (Object.keys(ROLE_NAMES) as RoleId[]).find((role) => ROLE_NAMES[role].toLocaleLowerCase('cs') === wanted);
}

export const ROLE_QUESTION = 'Jak myslíš, že by Tě nejspíš popsali kamarádi?';
