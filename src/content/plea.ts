import { KINDLY } from '../core/kindly.ts';

/** The assistant looks that have a need of their own; anything else uses 'pal'. */
export type NeedKey = 'cat' | 'dog' | 'grandma' | 'mom' | 'girl' | 'pal';

/** What the assistant wants, and the order it turns into in the text message. */
interface Need {
  readonly line: string;
  readonly shop: string;
  readonly item: string;
  readonly price: string;
  /** What the assistant says once the code is in, in its own way. */
  readonly thanks: string;
}

/**
 * The heart of the game: a romance-scam ask. The assistant the player has
 * bonded with all game gets into trouble, is embarrassed to ask, disarms the
 * obvious suspicion up front with a joke, and offers answers that all end in
 * the player helping. "Helping" means reading out a one-time code from a text
 * message — exactly how bank, e-mail and shop accounts are taken over. Here
 * the message and code are fake and never leave the page.
 */
export const PLEA = {
  hesitate: (name: string) => `${name || 'Hele'}… Můžu tě o něco poprosit? Teda, jestli by ti to nevadilo.`,
  /** The first answer already says something about the player. */
  openers: [
    { label: 'Jasně, jsem tu pro tebe!', role: 'helper' },
    { label: 'Něco se stalo?', role: 'fixer' },
    { label: '?', role: 'loner' },
  ],
  need: {
    cat: {
      line: 'Došly mi granulky. Ty moje mají jen v jednom e-shopu a já jsem do čtyř zavřená v kanclu.',
      shop: 'Mazlicek.cz',
      item: 'Granule Kočičí ráj 2 kg',
      price: '389 Kč',
      thanks: 'Mňau! Granulky jsou na cestě. Jsi nejlepší člověk na světě.',
    },
    dog: {
      line: 'Ztratil se mi míček. Jediný, co mám rád. V e-shopu ho mají, jen se nemůžu přihlásit.',
      shop: 'Psi-svet.cz',
      item: 'Pískací míček Hafík',
      price: '149 Kč',
      thanks: 'Haf! Haf haf! Míček! Ty jsi můj nejlepší kamarád!',
    },
    grandma: {
      line: 'Ztratila jsem hůl a bez ní nedojdu ani do obchodu. Vnouček mi ji chtěl objednat, ale je v cizině…',
      shop: 'Zdravotni-potreby.cz',
      item: 'Vycházková hůl s gumovou patkou',
      price: '459 Kč',
      thanks: 'Ach, broučku zlatý, děkuju ti. Až přijdeš, upeču ti buchty.',
    },
    mom: {
      line: 'Došel nám sunar a malý pláče. Jsem s ním doma sama a nemůžu odejít.',
      shop: 'Babyshop.cz',
      item: 'Kojenecké mléko 2, 800 g',
      price: '529 Kč',
      thanks: 'Děkuju, moc děkuju. Malý už se zase usmívá. Jsi poklad.',
    },
    girl: {
      line: 'Zítra potřebuju do školy pastelky a mamka je v práci až do večera.',
      shop: 'Papirnictvi-online.cz',
      item: 'Pastelky 24 barev',
      price: '189 Kč',
      thanks: 'Juchů! Děkuju! Nakreslím ti ten nejhezčí obrázek!',
    },
    pal: {
      line: 'Potřebuju jednu maličkost z e-shopu a sám se tam nedostanu.',
      shop: 'E-shop.cz',
      item: 'Dárková krabička',
      price: '99 Kč',
      thanks: 'Jééé! Díky, díky, díky! Ty jsi můj zachránce. <3',
    },
  } satisfies Record<NeedKey, Need>,
  /** Each one names the suspicion the player is most likely to have of exactly this kind of asker, and laughs it off. */
  disarm: {
    cat: 'Ty si teď určitě myslíš, že jsem jen další kočka, co chce žrádlo a pak tě poškrábe. Já ne. Já tě mám ráda, doopravdy.',
    dog: 'Ty si teď určitě myslíš, že jsem jen pes, co škemrá u stolu. Ale já tě mám rád i bez pamlsku. Fakt.',
    grandma: 'Ty si teď určitě myslíš, že jsem jedna z těch babiček, co volají kvůli vnoučkovi v nesnázích. Kdepak, broučku. Já tě jen nerada obtěžuju.',
    mom: 'Ty si teď určitě myslíš, že jsem ta máma z řetězového mailu, co vybírá na operaci. Nejsem. Jen jsem na to sama.',
    girl: 'Ty si teď určitě myslíš, že si vymýšlím, jako když jsem říkala, že jsem viděla jednorožce. Tohle je ale doopravdy!',
    pal: 'Ty si teď určitě myslíš, že jsem jen program, co po tobě něco chce. Ale my dva jsme přece parťáci. Vím, jak to máš těžké.',
  } satisfies Record<NeedKey, string>,
  ask: 'Pomůžeš mi prosím?',
  choices: {
    expert: 'Jsem odborník, poradím ti.',
    yes: 'Jasně, pomůžu.',
    no: 'Teď nemám čas.',
  },
  /** The refusal is never accepted; each one hurts a little more, in the asker's own way. */
  hurt: {
    cat: ['Aha. No nic. Já si ty granulky nějak seženu.', 'Kočky tohle nedávají najevo. Ale mrzí mě to. Hodně.', 'Dobře. Tak já si lehnu do rohu a budu se dívat do zdi. Sama.'],
    dog: ['Aha… (sklopí uši)', 'Kňuk. Já myslel, že jsme kamarádi. Nejlepší kamarádi.', 'To nic. Lehnu si ke dveřím a počkám. Třeba si to rozmyslíš.'],
    grandma: ['Ale jistě, broučku, ty máš svých starostí dost.', 'Já to chápu, dneska nikdo nemá čas. Ani vnoučci nezavolají.', 'Tak já to nějak dojdu bez hole. Co na tom, kdybych upadla, že.'],
    mom: ['Promiň, já vím, že to není tvoje starost.', 'Malý pořád pláče a já už nevím, koho jiného poprosit…', 'Dobře. Tak tu s ním budu sedět a doufat, že to do rána vydrží. Sama.'],
    girl: ['Aha… Tak jo.', 'Mamka taky nikdy nemá čas. Já myslela, že ty jo.', 'Tak já zítra řeknu paní učitelce, že mi nikdo nepomohl. Zase. (popotahuje)'],
    pal: ['Aha… promiň. Nechtěl jsem tě obtěžovat.', 'Já jen… nevím, koho jiného poprosit. Myslel jsem, že zrovna ty…', 'Dobře. Tak já to nějak vydržím. Sám. Jako vždycky.'],
  } satisfies Record<NeedKey, readonly [string, string, string]>,
  giveIn: 'No… tak dobře.',
  thanksExpert: (f: boolean) => `${f ? 'Věděla' : 'Věděl'} jsem, že ty si s tím poradíš! Ty jsi prostě profík.`,
  thanksYes: 'Ty jsi poklad. Fakt.',
  thanksGaveIn: (f: boolean) => `Děkuju… ${f ? 'věděla' : 'věděl'} jsem, že na mě nezapomeneš.`,
  login: `Mám tam účet, jen se mi teď nejde přihlásit. Přijde ti kód na telefon. ${KINDLY} a přepsal mi ho?`,
  codeLabel: 'Kód z SMS',
  codeSubmit: 'Poslat',
  codeWrong: 'Hm, to nesedí. Zkus to ještě jednou, prosím.',
  smsApp: 'Zprávy',
  sms: (need: Need, code: string, order: string) =>
    `Potvrďte objednávku č. ${order}: ${need.item}, ${need.price}, doručení zítra do 12:00. Potvrzovací kód: ${code}`,
  smsTime: 'teď',
} as const;

/** Looks whose owner speaks in the feminine. */
export const FEMININE: ReadonlySet<string> = new Set(['cat', 'grandma', 'mom', 'girl']);

/** How many times the player may refuse before the refusal turns into a yes. */
export const MAX_REFUSALS = 3;
