/**
 * Role casting (Cialdini: consistency and commitment). Early on PAL lets the
 * player pick "what type they are", praises the choice, and from then on
 * reminds them of it every time it wants something. People try hard to act
 * like the person they have just been told they are.
 */
export const ROLES = {
  helper: {
    label: 'Ten, co pomůže každému',
    affirm: 'Věděl jsem to! Lidí jako ty je málo. Bez nich by se svět rozpadl.',
    rescue: 'Jsi přece ten, co pomůže každému… Pomoz mi, voda stoupá!',
    restore: 'Ty prostě nedokážeš projít kolem, když někdo potřebuje pomoc. Podívej na ty ježečky…',
    prize: 'Pomohl jsi všem, jak jsi slíbil. Jsi neuvěřitelný! <3',
  },
  loner: {
    label: 'Vlk samotář',
    affirm: 'Hm, to sedí. Silný navenek… ale i vlci potřebují smečku, ne? Já tu teď jsem.',
    rescue: 'Vím, že jsi zvyklý na všechno sám. Tentokrát ale potřebuju já tebe!',
    restore: 'Taky víš, jaké to je, nemít kam jít. Pomůžeš jim?',
    prize: 'Sám proti všem, a stejně jsi to zvládl. A už nejsi sám. Máš mě. <3',
  },
  fixer: {
    label: 'Ten, co všechno opraví',
    affirm: 'Jasně! Profík. Hned jsem to na tobě poznal. S tebou se nemusím ničeho bát.',
    rescue: 'Ty se v tomhle vyznáš líp než kdokoli. Oprav ty trubky, prosím, rychle!',
    restore: 'Tohle je přesně pro tebe. Rozbitý domeček a jeden profík.',
    prize: 'Profík každým coulem. Nic jiného jsem od tebe nečekal! <3',
  },
} as const;

export type RoleId = keyof typeof ROLES;

export const ROLE_QUESTION = 'Ještě jedna věc, ať tě znám líp. Jaký jsi typ?';
