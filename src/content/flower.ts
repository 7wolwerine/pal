/**
 * The flower under glass. A dry flower in a pot, under a glass cover, and a
 * watering can beside it. Nobody explains anything. Breaking the glass and
 * watering it feels like a rescue. Once it blooms, the flower thanks the
 * player for breaking the glass — which, dry and wilted under it, it could
 * not have known about. Somebody was watching all along.
 *
 * The glass had a plate on it: protective glass. Once it is gone, nothing
 * keeps the little crawlers out, and the bloom the player was so proud of is
 * eaten in front of them. Nobody says why.
 */
export const FLOWER = {
  sceneLabel: 'Parapet u okna. V květináči uschlá kytka pod skleněným poklopem s cedulkou Ochranné sklo, vedle stojí konvička s vodou.',
  /** The brass plate on the sill in front of the glass. */
  plate: 'Ochranné sklo',
  /** The flower, in a speech bubble, once it blooms. */
  thanks: 'Tolik Ti děkuju, žes rozbil to sklo, které mi nedovolilo žít. Jsi můj hrdina. <3',
  /** If the player clicks the flower afterwards — the only one who notices. */
  howDoYouKnow: 'Jak vím o skle? Já… prostě vím. Vím toho o Tobě hodně.',
  left: 'Hm. Tak ať si tam uschne.',
  /** When the crawlers are on it. The flower only feels it; nobody explains anything. */
  hurt: 'Au… Co to po mně leze?',
  /** After she has eaten them, one by one. */
  ate: 'Mňam. Bez skla je tu aspoň co jíst.',
  /** For screen readers, as the crawlers come in. */
  pestsLabel: 'Po parapetu lezou k rozkvetlé kytce drobní brouci a okusují jí okvětní lístky. Pak je kytka jednoho po druhém sní.',
  leave: 'Nechat ji být',
  labels: {
    dome: 'Skleněný poklop nad kytkou',
    can: 'Konvička s vodou',
    flower: 'Rozkvetlá kytka',
  },
} as const;
