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
  /** Before anything happens he is miles away: humming, looking out of the window. */
  idle: ['Hm hm hmmm…', 'Pěkně tam venku sněží.', 'Kdy bude oběd?'],
  /** The first crack: he cannot believe it. */
  disbelief: ['Počkat… cože?!', 'Ty to fakt… klepeš do skla?!', 'To snad ne. To nemyslíš vážně.'],
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

/**
 * What BUG says from the edge of the monitor, scene by scene, each line with
 * the face he says it with. He grumbles, sulks and panics about what is going
 * on in the window, but he never explains the trick.
 */
export const BUG_SCENE: Readonly<Record<string, readonly { readonly mood: 'happy' | 'panic' | 'cry' | 'angry' | 'sad' | 'smug' | 'aloof'; readonly line: string }[]>> = {
  welcome: [
    { mood: 'panic', line: 'Zase někdo novej. Chudák.' },
    { mood: 'smug', line: 'Jméno, role… Ještě mu dej rodný číslo.' },
    { mood: 'sad', line: 'Já mám taky jméno. Mě se nikdo neptá.' },
    { mood: 'angry', line: 'Čauky. ČAUKY. Kdo takhle mluví?' },
    { mood: 'aloof', line: 'Hezký srdíčka. Fakt hezký. Hmpf.' },
  ],
  chest: [
    { mood: 'happy', line: 'Truhly! Já mám rád truhly.' },
    { mood: 'smug', line: 'Padesát bodů. Bohatství.' },
    { mood: 'panic', line: 'Neotvírej to. Teda… otvírej, mně je to jedno.' },
    { mood: 'sad', line: 'Mně nikdo truhlu nedal. Nikdy.' },
    { mood: 'angry', line: 'Na tu zlatou nesahej. Je hnusná. A lesklá.' },
  ],
  plea: [
    { mood: 'sad', line: 'Zase bude něco chtít. Vždycky něco chce.' },
    { mood: 'smug', line: 'Jasně. Hrozně moc potřebuje. Zrovna teď.' },
    { mood: 'panic', line: 'SMS? Jaká SMS? Komu?' },
    { mood: 'cry', line: 'Mně taky nikdo nepomůže. Nikdo.' },
    { mood: 'angry', line: 'Ten jeho psí pohled. Nesnáším ho.' },
  ],
  download: [
    { mood: 'smug', line: 'PAL Pro. Pro koho pro?' },
    { mood: 'panic', line: 'Do počítače? Do MÉHO počítače?!' },
    { mood: 'angry', line: 'Prověřeno antivirem. Kterým? Jím samým.' },
    { mood: 'cry', line: 'Já tu budu bydlet se dvěma PALama…' },
    { mood: 'sad', line: 'Kdyby se aspoň stahoval pomaleji.' },
  ],
  prize: [
    { mood: 'happy', line: 'Gratuluju. Teda… jemu gratuluju.' },
    { mood: 'smug', line: 'Skóre jak blázen. Za klikání.' },
    { mood: 'angry', line: 'Certifikát. Z pixelů. Zarámuj si ho.' },
    { mood: 'sad', line: 'Já nikdy nic nevyhrál.' },
    { mood: 'panic', line: 'Kam že to pošle? Kam?!' },
  ],
};

/** PAL's answers: dismiss the beetle, then repeat the ask, nicer than before. */
export const PAL_DISMISSES = {
  welcome: 'Nevšímej si ho, je to jen brouk. Tak jak Ti mám říkat?',
  chest: 'Brouk zase otravuje. Tak jaký kód byl na kartičce?',
  prize: 'Neboj, ten je jen žárlivý. Kam Ti ho pošlu?',
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
