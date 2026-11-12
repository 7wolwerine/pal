/**
 * The restore minigame: a little hedgehog family freezing beside their broken
 * house on a snowy night. Every repair warms the world until it turns into a
 * sunny, cosy afternoon. An original take on the "fix the broken home"
 * feeling — nothing to do with any particular existing game.
 */
export const RESTORE = {
  sceneLabel: 'Rozbitý domeček ve vánici a ježčí rodinka, která mrzne venku',
  intro: 'Chudáci ježečci… Úplně mrznou. Pomůžeš mi opravit jim domeček?',
  repairs: {
    roof: { label: 'Díra ve střeše', fixed: 'Střecha už neteče.', needed: 3 },
    window: { label: 'Rozbité okno', fixed: 'Okno zase drží teplo.', needed: 2 },
    door: { label: 'Vyvrácené dveře', fixed: 'Dveře zase zavírají.', needed: 2 },
    lantern: { label: 'Zhaslá lucernička', fixed: 'Lucernička svítí.', needed: 1 },
    flower: { label: 'Uvadlá kytička', fixed: 'Kytička pookřála.', needed: 2 },
  },
  /** Said while a repair is under way (some take more than one click). */
  working: 'Ještě kousek…',
  done: 'Podívej, jak jsou šťastní. To jsi udělal ty. <3',
  go: 'Pokračovat',
} as const;

export type RepairId = keyof typeof RESTORE.repairs;
