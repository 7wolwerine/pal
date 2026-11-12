/**
 * The flower under glass. A dry flower in a pot, under a glass cover. Breaking
 * the glass and watering it feels like a rescue. Once it blooms, the flower
 * thanks the player for breaking the glass — which, dry and wilted under it,
 * it could not have known about. Somebody was watching all along.
 */
export const FLOWER = {
  sceneLabel: 'Parapet u okna. V květináči uschlá kytka pod skleněným poklopem, vedle stojí konvička s vodou.',
  intro: 'Chudinka. Pod tím sklem se dusí.',
  /** PAL after each knock that only cracks the glass. */
  knock: ['Ťuk. Je to jen sklo.', 'Ještě kousek. Ona to potřebuje.', 'Už to povoluje!'],
  shattered: 'Tak. Teď jí dej napít.',
  canFirst: 'Přes sklo to nepůjde.',
  /** The flower, in a speech bubble, once it blooms. */
  thanks: 'Tolik ti děkuju, žes rozbil to sklo, které mi nedovolilo žít. Jsi můj hrdina. <3',
  palPraise: 'Vidíš? Ty prostě víš, jak na to.',
  /** If the player clicks the flower afterwards — the only one who notices. */
  howDoYouKnow: 'Jak vím o skle? Já… prostě vím. Vím toho o tobě hodně.',
  left: 'Hm. Tak ať si tam uschne.',
  leave: 'Nechat ji být',
  go: 'Pokračovat',
  labels: {
    dome: 'Skleněný poklop nad kytkou',
    can: 'Konvička s vodou',
    flower: 'Rozkvetlá kytka',
  },
} as const;
