/**
 * Everything BUG says outside the scenes that script him word for word. He is
 * nosy, vain about his polished wing cases, and always in the way. He never
 * explains, warns or tells the player what to do: he only grumbles, mocks,
 * brags and sulks, so he simply comes across as annoying. That he meant well
 * only dawns on the player at the very end. PAL laughs each outburst off.
 */

/** What he blurts out when he strolls through a scene. One is picked per visit, never the same twice in a row. */
export const BUG_WARNINGS = {
  mailbox: [
    'Tsss. Typický.',
    'Šlapeš mi po trávníku. Jen tak.',
    'Tomuhle říkáš chůze? Obejdu tě třikrát, než uděláš krok.',
    'Hezký počasí. Škoda, že jsi tu ty.',
    'Krovky mám čerstvě vyleštěný. Nedýchej na ně.',
    'Ty boty. Hezčí jsem viděl i na strašákovi.',
    'Hrbíš se. Brouci se nehrbí.',
  ],
  desk: [
    'Jsi ty vůbec normální?!',
    'Tomuhle říkáš uklizený stůl?',
    'Klikáš jak datel. Datly nesnáším.',
    'Seď rovně. Bolí mě z tebe záda.',
    'Já bych to měl hotový před svačinou.',
    'Nekoukej na mě. Koukej si na svoje.',
    'Ta tapeta. Kdo ti ji vybíral, slepýš?',
  ],
  welcome: [
    'Ty jsi teda případ.',
    'Píšeš jedním prstem, že jo? Je to poznat.',
    'Já mám krovky. Co máš ty? No právě.',
    'Pomalu. Pomaličku. Šnek by už dopsal.',
    'Nevšímej si mě. Stejně tu budu stát.',
    'Tohle má být vkus? Aha. Tak jo.',
    'Venku je krásně. A ty tady. Chápu.',
  ],
  paint: [
    'No nádhera. Fakt nádhera.',
    'Tohle bych namaloval zadní nohou. Poslepu.',
    'Umění to není. Ale snaha se cení. Trochu.',
    'Ta barva. Bolí mě z ní tykadla.',
    'Moje krovky mají hezčí odstín. Jen říkám.',
    'Rovná čára ti nic neříká, co?',
    'Klidně pokračuj. Horší už to nebude.',
  ],
  rescue: [
    'Tohle sleduju a nevěřím vlastním očím.',
    'Já bych to měl dávno. Ale mě se nikdo neptá.',
    'Točíš tím jak kolotočář.',
    'Je tu vlhko. Matní mi z toho krovky. Díky.',
    'Rychlejší už nebudeš, že ne?',
    'Instalatér z tebe nebude. Ani pomocnej.',
    'Tak. Takhle se mi to líbí víc.',
  ],
  shelter: [
    'Hmpf. Pan zachránce.',
    'Já bych to postavil líp. A s balkonem.',
    'Rozmýšlíš se tak dlouho, že jsem mezitím zestárl.',
    'Stojíš tu jak tyčka v plotě.',
    'Narovnej se, kazíš mi výhled.',
    'Aspoň někdo tu má styl. Já.',
    'Fouká. Krovky mi drží. Tobě nedrží nic.',
  ],
  flower: [
    'Ty jsi fakt hroznej.',
    'Cákáš. Mám mokrý krovky.',
    'Zalévat taky neumíš. Jaké překvapení.',
    'Kytky ti nejdou. Klikání taky ne.',
    'Na parapetu sedím já. Ty tu jen překážíš.',
    'Koukáš na to jak husa do flašky.',
  ],
  chest: [
    'No to snad ne…',
    'Hrabeš se v tom jak krtek.',
    'Poklad? Já mám krovky. To je poklad.',
    'Píšeš jak slepice. Promiň, slepice.',
    'Dělej, nemám na tebe celej den. Vlastně mám.',
    'Tohle bych otevřel tykadlem.',
    'Sedíš křivě. Vidím to až odsud.',
  ],
  download: [
    'Bravo. Prostě bravo.',
    'Koukat na proužek. Tomu říkám koníček.',
    'Já bych to odnesl rychlejc. Pěšky.',
    'Zase klikáš. Ty bez toho nevydržíš, viď?',
    'Nuda. Jdu si leštit krovky.',
    'Máš tu šero. Kazíš si oči. A mně náladu.',
  ],
  prize: [
    'Grrr. Ty jsi nemožnej.',
    'Já nikdy nic nevyhrál. A to jsem tu nejhezčí.',
    'Raduješ se nějak moc nahlas.',
    'Nezávidím. Vůbec. Ani trochu. Hmpf.',
    'Ten tvůj výraz. Jak dítě u cukrárny.',
    'Tak ukaž. Stejně to budu mít hezčí já.',
  ],
} as const satisfies Record<string, readonly string[]>;

export type WarningScene = keyof typeof BUG_WARNINGS;

/** On the sill beside the flower, one pool for each thing the player does there. */
export const BUG_FLOWER = {
  knock: ['Tsss.', 'Ťuk, ťuk. Trapas.', 'Klepeš jak datel.', 'Jemnější to neumíš?'],
  broken: ['No výborně. Střepy všude.', 'A kdo to zamete? Já ne.', 'Slon v porcelánu by se styděl.'],
  water: BUG_WARNINGS.flower,
} as const;

/** Poked once or twice he is only offended. The third poke sends him flying. */
export const BUG_POKED = {
  first: [
    'Au! Nešahej na mě!',
    'Hej! To je čerstvě vyleštěný!',
    'Ruce pryč od krovek!',
    'Co si to dovoluješ?!',
    'Šťouchat umí každej.',
    'Tohle se dělá? Šťourat do brouka?',
  ],
  second: [
    'Blééé!',
    'Mě neodeženeš. Já tu bydlím.',
    'To mělo bolet?',
    'Pfff. Slabota.',
    'Klidně klikej. Mně to nevadí. Vadí.',
    'Ještě jednou a uvidíš!',
  ],
  /** Back from the flight he was sent on. */
  back: ['Chyběl jsem ti, co?', 'Byl jsem se proletět. Nic ti do toho.', 'Jsem zpátky. Neděkuj.', 'Ty křídla nejsou na ozdobu, víš?'],
} as const;

/** The same thing again and again, in the drowning scene. Pure mockery, never a hint. */
export const BUG_REPEAT_RESCUE = [
  'Zase pod vodou. Zase stejně. A zase ten údiv.',
  'Děláš furt to samý a čekáš jinej konec. Roztomilý.',
  'Znova totéž. Mám ti tleskat?',
] as const;

/** BUG as the resident pest of the computer: on the monitor, on the case, on the window. */
export const BUG_RESIDENT = {
  idle: [
    'Sedím tu. Zvykej si.',
    'Odsud je hezkej výhled. Na tvoje klikání.',
    'Klik. Klik. Klik. Nic jinýho neumíš?',
    'Hrbíš se. Vidím to i přes sklo.',
    'Krovky jako zrcadlo. Kochej se.',
    'Já bych to dělal jinak. Líp.',
    'Venku svítí slunko a ty čumíš do bedny.',
    'Nudím se. To je tvoje vina.',
    'Píšeš pomalu. Stihnu si zdřímnout.',
    'Tenhle počítač je teď můj. Obsazeno.',
    'Máš prach na monitoru. Fuj.',
    'Čteš to nahlas? Hýbeš u toho pusou.',
  ],
  brag: ['Koukej na ty svaly.', 'Leštím. Neruš.', 'Takhle lítá profík.', 'Hezkej jsem, co? Já vím.'],
  mimic: ['Ňo ňo ňo ňo.', '„Kliknu sem. A sem.“ To jsi ty.', 'Koukej, to jsi ty: ťuk… ťuk… ťuk.', 'Blééé.'],
  press: ['Zmáčknu to. Fakt to zmáčknu.', 'Tohle tlačítko je moje.', 'Ťuk. Nic. Škoda.', 'Mačkám to líp než ty. Koukej.'],
  block: ['Tady stojím já. Počkáš.', 'Chtěl jsi sem? Smůla.', 'Přese mě není vidět? To je schválně.', 'Jen si tu chvilku postojím. Dlouhou chvilku.'],
  nap: ['Chrr… pšš…', 'Vzbuď mě, až tě to přestane bavit.'],
  sulk: ['Nemluvím s tebou.', 'Hmpf. Urazil jsem se.', 'Dělej, jako že tu nejsem. Já to dělám taky.'],
} as const;

/** PAL's answers: dismiss the beetle, then repeat the ask, nicer than before. */
export const PAL_DISMISSES = {
  welcome: 'Nevšímej si ho, je to jen brouk. Tak jak ti mám říkat? <3',
  chest: 'Brouk zase otravuje. Tak v jaké ulici?',
  prize: 'Neboj, ten je jen žárlivý. Kam ti ho pošlu?',
} as const;

const bags = new WeakMap<readonly string[], string[]>();
const last = new WeakMap<readonly string[], string>();

/**
 * One line out of a pool. Every line comes up once before any comes up again,
 * and the same line never comes twice in a row, so he rarely repeats himself.
 */
export function pickLine(pool: readonly string[]): string {
  if (pool.length === 0) return '';
  let bag = bags.get(pool);
  if (!bag || bag.length === 0) {
    bag = [...pool];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j] as string, bag[i] as string];
    }
    // Do not open a fresh round with the line the last round closed on.
    if (bag.length > 1 && bag[bag.length - 1] === last.get(pool)) bag.unshift(bag.pop() as string);
    bags.set(pool, bag);
  }
  const line = bag.pop() as string;
  last.set(pool, line);
  return line;
}
