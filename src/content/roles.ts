import type { SpriteId } from '../ui/sprites.ts';

/**
 * Role casting (Cialdini: consistency and commitment). Early on PAL lets the
 * player pick "what type they are", praises the choice, and from then on
 * reminds them of it every time it wants something. People try hard to act
 * like the person they have just been told they are.
 */
export const ROLES = {
  helper: {
    label: 'Totální lifesaver. Vždycky nás zachrání!',
    affirm: 'Tušil jsem to. Svět by se rozpadl bez lidí, jako jsi Ty.',
    rescue: 'Jsi přece ten, co pomůže každému… Pomoz mi, voda stoupá!',
    prize: 'Pomohl jsi všem, jak jsi slíbil. Jsi neuvěřitelný! <3',
  },
  loner: {
    label: 'Vlk samotář. Museli jsme si ho adoptovat.',
    affirm: 'To sedí. Ale i vlci potřebují smečku, ne? Já Ti teď budu pomáhat.',
    rescue: 'Vím, že jsi zvyklý na všechno sám. Tentokrát ale potřebuju já Tebe!',
    prize: 'Sám proti všem, a stejně jsi to zvládl. A už nejsi sám. Máš mě. <3',
  },
  fixer: {
    label: 'Něco nefunguje? Vím, kdo si bude vědět rady.',
    affirm: 'Wow, hustý. Ty nenecháš nikoho ve štychu a přesně víš, co dělat.',
    rescue: 'Ty se v tomhle vyznáš líp než kdokoli. Prosím, rychle!',
    prize: 'Profík každým coulem. Nic jiného jsem od Tebe nečekal! <3',
  },
} as const;

export type RoleId = keyof typeof ROLES;

/**
 * Ready-made names for the assistant, offered as chips when the player names it: three for every
 * look, one per role. The warmest, plainest name of the three belongs to the rescuer; the one
 * that stands a little apart to the lone wolf; the brisk, capable one to the fixer. Which one the
 * player reaches for says something about them, and the reveal counts it: a picked or typed name
 * leans the profile towards its role. No name is used twice, so a typed one means exactly one role.
 */
export const ASSISTANT_NAMES: Readonly<Record<SpriteId, Readonly<Record<RoleId, string>>>> = {
  girl: { helper: 'Anička', loner: 'Johanka', fixer: 'Bětka' },
  mom: { helper: 'Hanka', loner: 'Iva', fixer: 'Radka' },
  grandma: { helper: 'Božena', loner: 'Libuše', fixer: 'Zdena' },
  cat: { helper: 'Mourka', loner: 'Kiki', fixer: 'Šikulka' },
  dog: { helper: 'Alík', loner: 'Baryk', fixer: 'Rex' },
  // PAL's own three, for a game where the look is somehow not picked: nicknames that fit anyone.
  pal: { helper: 'Míša', loner: 'Saša', fixer: 'Nikola' },
};

/** The three names offered for a look. */
export function namesFor(look: SpriteId | undefined): Readonly<Record<RoleId, string>> {
  return ASSISTANT_NAMES[look ?? 'pal'] ?? ASSISTANT_NAMES.pal;
}

/** The role whose ready-made name this is (typed or picked, any look, any case), or undefined. */
export function roleForName(name: string): RoleId | undefined {
  const wanted = name.trim().toLocaleLowerCase('cs');
  for (const names of Object.values(ASSISTANT_NAMES)) {
    const role = (Object.keys(names) as RoleId[]).find((r) => names[r].toLocaleLowerCase('cs') === wanted);
    if (role) return role;
  }
  return undefined;
}

export const ROLE_QUESTION = 'Jak myslíš, že by Tě nejspíš popsali kamarádi?';
