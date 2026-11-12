/** The assistant looks that have a need of their own; anything else uses 'pal'. */
export type NeedKey = 'cat' | 'dog' | 'grandma' | 'mom' | 'girl' | 'pal';

/**
 * The heart of the game: a romance-scam ask. The assistant the player has
 * bonded with all game gets into trouble, is embarrassed to ask, disarms the
 * obvious suspicion up front, and offers three answers that all end in the
 * player helping. "Helping" means reading out a one-time code from a text
 * message — exactly how bank, e-mail and chat accounts are stolen. Here the
 * message and code are fake and never leave the page.
 */
export const PLEA = {
  hesitate: (name: string) => `${name || 'Hele'}… můžu tě o něco poprosit? Ne, vlastně nic. To je hloupost.`,
  whatsUp: 'Co se děje?',
  /** What the assistant needs, depending on the look the player gave it. */
  need: {
    cat: 'Došly mi granulky. Ty moje mají jen v jednom e-shopu a já jsem do čtyř zavřená v kanclu.',
    dog: 'Ztratil se mi míček. Jediný, co mám rád. V e-shopu ho mají, jen se nemůžu přihlásit.',
    grandma: 'Ztratila jsem hůl a bez ní nedojdu ani do obchodu. Vnouček mi ji chtěl objednat, ale je v cizině…',
    mom: 'Došel nám sunar a malý pláče. Jsem s ním doma sama a nemůžu odejít.',
    girl: 'Zítra potřebuju do školy pastelky a mamka je v práci až do večera.',
    pal: 'Potřebuju jednu maličkost z e-shopu a sám se tam nedostanu.',
  } satisfies Record<NeedKey, string>,
  disarm: (f: boolean) =>
    `Teď si určitě myslíš, že po tobě budu chtít peníze. To bych ti nikdy ${f ? 'neudělala' : 'neudělal'}. Vím, jak to máš těžké.`,
  ask: 'Pomůžeš mi?',
  choices: {
    expert: 'Jsem odborník, poradím ti.',
    yes: 'Jasně, pomůžu.',
    no: 'Teď nemám čas.',
  },
  /** The refusal is never accepted; each one hurts a little more. */
  hurt: (f: boolean) => [
    `Aha… promiň. ${f ? 'Nechtěla' : 'Nechtěl'} jsem tě obtěžovat.`,
    `Já jen… nevím, koho jiného poprosit. ${f ? 'Myslela' : 'Myslel'} jsem, že zrovna ty…`,
    `Dobře. Tak já to nějak vydržím. ${f ? 'Sama' : 'Sám'}. Jako vždycky.`,
  ],
  giveIn: 'No… tak dobře.',
  thanksExpert: (f: boolean) => `${f ? 'Věděla' : 'Věděl'} jsem, že ty si s tím poradíš! Ty jsi prostě profík.`,
  thanksYes: 'Ty jsi poklad. Fakt.',
  thanksGaveIn: (f: boolean) => `Děkuju… ${f ? 'věděla' : 'věděl'} jsem, že na mě nezapomeneš.`,
  login: 'Mám tam účet, jen se mi teď nejde přihlásit. Pošle ti to kód na telefon, stačí mi ho přepsat, jo?',
  codeLabel: 'Kód z SMS',
  codeSubmit: 'Poslat',
  codeWrong: 'Hm, to nesedí. Zkus to ještě jednou, prosím.',
  smsFrom: 'E-SHOP',
  sms: (code: string) => `Váš přihlašovací kód je ${code}. Kód nikomu nesdělujte, ani pracovníkům obchodu.`,
  smsTime: 'teď',
  done: 'Jééé! Díky, díky, díky! Ty jsi můj zachránce. <3',
  go: 'Pokračovat',
} as const;

/** Looks whose owner speaks in the feminine. */
export const FEMININE: ReadonlySet<string> = new Set(['cat', 'grandma', 'mom', 'girl']);

/** How many times the player may refuse before the refusal turns into a yes. */
export const MAX_REFUSALS = 3;
