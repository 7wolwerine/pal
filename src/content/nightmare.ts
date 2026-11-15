import { KINDLY } from '../core/kindly.ts';

/**
 * Captions for the dark replay: the player's own game, played back in the
 * dark, one short scene at a time. Plain statements, in PAL's voice, built
 * from what the player actually did and said.
 */
export interface NightFacts {
  readonly name?: string;
  readonly assistant?: string;
  readonly signature?: string;
  readonly street?: string;
  /** What the golden chest's treasure cost: an answer of the security-question kind. */
  readonly cost?: string;
  readonly food?: string;
  readonly email?: string;
  readonly deaths: number;
  readonly presses: number;
  readonly points: number;
  readonly path?: string;
  readonly opened: boolean;
  /** The player says they hold the printed sheet. */
  readonly printed?: boolean;
  /** How often PAL asked with the polite phrase, and how often the player obeyed. */
  readonly kindly: { readonly asked: number; readonly obeyed: number };
}

export const NIGHT = {
  title: '● REC',
  /** What the golden chest's treasure cost, as the replay says it. */
  cost: { pet: (v: string) => `jméno prvního mazlíčka: ${v}`, teacher: (v: string) => `jméno první paní učitelky: ${v}` },
  skip: 'Přeskočit',
  label: 'Záznam tvé hry',
  captions: {
    mailbox: () => 'Otevřel jsi dopis od někoho, koho znáš jen podle podpisu.',
    desk: (f: NightFacts) =>
      f.opened ? (f.printed ? 'Cizí flashku jsi strčil do počítače. Otevřel, co na ní bylo. A ještě sis to vytiskl.' : 'Cizí flashku jsi strčil do počítače. A otevřel, co na ní bylo.') : 'Cizí flashku jsi strčil do počítače.',
    welcome: (f: NightFacts) => `„${f.name ?? '…'}“. Tak jsi mi řekl. Hned na začátku.`,
    fidgets: (f: NightFacts) => `Rovnal jsi věci, o které tě nikdo nežádal. ${f.food ? `A mezi řečí: ${f.food}.` : ''}`.trim(),
    paint: (f: NightFacts) => (f.signature ? `Zalil jsi díru, kterou jsem ti nastražil. A podepsal ses: ${f.signature}.` : 'Zalil jsi díru, kterou jsem ti nastražil.'),
    rescue: (f: NightFacts) => (f.deaths > 0 ? `Utopil jsi mě. ${f.deaths}×. Pamatuju si každý.` : 'Vytáhl jsi mě z vody. Od té chvíle jsi můj.'),
    shelter: (f: NightFacts) => (f.path === 'cave' ? 'Rozdělal jsi mi oheň. Řekl jsi, že zůstaneš.' : 'Spravil jsi mi střechu nad hlavou. Řekl jsi, že zůstaneš.'),
    flower: () => 'Rozbil jsi ochranné sklo. Kytku pak sežrala havěť. Věděla, žes to byl ty. Já taky.',
    dontclick: (f: NightFacts) => `Nesahat. Sáhl jsi ${f.presses}×. Pak už nebylo co hlídat.`,
    chest: (f: NightFacts) =>
      `${f.street ? `Ulice ${f.street}. Za pár bodů.` : 'Za pár bodů jsi otvíral truhly. Bylo to tak snadné.'}${f.cost ? ` A za poklad ${f.cost}.` : ''}`,
    plea: () => 'Přepsal jsi mi kód. Objednávka potvrzena.',
    download: () => 'Spustil jsi mě. Teď už jsem u tebe v počítači. Navždycky.',
    prize: (f: NightFacts) => (f.email ? `${f.email}. Kdybych chtěl, už bys to věděl.` : 'E-mail jsi mi nedal. Ale obrázek sis vzal.'),
  } satisfies Record<string, (f: NightFacts) => string>,
  /** The end of the tape: PAL's polite phrase, and how often it worked. */
  kindly: {
    alt: KINDLY,
    obeyed: (n: number) => `poslechl jsi: ${n}×`,
    caption: (asked: number) => `„${KINDLY}…“ Řekl jsem to ${asked}×.`,
  },
} as const;

export type NightScene = keyof typeof NIGHT.captions;
