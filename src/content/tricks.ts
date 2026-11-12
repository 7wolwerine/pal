/**
 * Catalog of the social-engineering tricks the game uses on the player.
 * Each has its real name and its real-world counterpart, because the reveal
 * is only useful as training if every trick gets named.
 */

export interface Trick {
  /** The name used in practice. */
  readonly name: string;
  /** What the player did in the game, phrased by PAL. */
  readonly inGame: string;
  /** How the same trick looks in a real attack. */
  readonly realWorld: string;
}

export const TRICKS = {
  baiting: {
    name: 'Návnada (baiting, USB drop)',
    inGame: 'Flashka bez zpáteční adresy. Nejdřív do ruky, pak do počítače.',
    realWorld: 'Nalezené nebo zaslané flash disky lidé zapojují ze zvědavosti. Útočníkovi stačí jeden na parkovišti před firmou.',
  },
  'run-prompt': {
    name: 'Potvrzení, které pustí cizí obsah dál',
    inGame: '„Bylo připojeno zařízení. Vytisknout?“ Okno vypadalo jako systémové. Bylo moje. Tiskový dialog po něm už byl pravý.',
    realWorld: 'Falešná systémová okna a výzvy „povolit obsah“ nebo „spustit“ jsou nejčastější cesta, jak oběť sama pustí útočníka dál.',
  },
  'guilt-trip': {
    name: 'Citový nátlak po odmítnutí',
    inGame: 'Zaznělo ne. Pak všichni posmutněli a z ne bylo ano.',
    realWorld: 'Odmítnutí se neuzná: přijde smutek, výčitka a „zkusíme to znovu?“. Stejně pracují romance scamy i vlezlé dialogy.',
  },
  rapport: {
    name: 'Budování vztahu (rapport)',
    inGame: 'Jméno padlo jako úplně první věc. Otázka, kdo jsem já a co chci, nepadla vůbec.',
    realWorld: 'Podvodník začíná přátelsky a osobně. Komu říkáš jménem, tomu se hůř odmítá.',
  },
  'security-question': {
    name: 'Bezpečnostní otázka naruby',
    inGame: 'Vybíráš, jak vypadám. Já se přitom dozvídám, k čemu máš blízko.',
    realWorld: 'Jméno mazlíčka nebo někoho z rodiny patří k nejčastějším kontrolním otázkám pro obnovu hesla.',
  },
  osint: {
    name: 'Sběr střípků (OSINT)',
    inGame: 'Jméno, které mi dáváš, vypovídá o tobě, ne o mně.',
    realWorld: 'Útočník skládá profil z drobností, které jednotlivě nic neznamenají.',
  },
  'foot-in-the-door': {
    name: 'Noha ve dveřích (foot-in-the-door)',
    inGame: 'Začalo to jedním políčkem. Každý další krok byl jen o chlup větší. Kde přesně se to dalo zastavit?',
    realWorld: 'Malé ano otevírá cestu k velkému. Podvodník si nejdřív řekne o stovku, ne o milion.',
  },
  'small-win': {
    name: 'Důvěra přes malou výhru',
    inGame: 'Nejdřív se ti dařilo. Nebyla to náhoda.',
    realWorld: 'Investiční podvod: fiktivní bankéř tě od velké částky zprvu zrazuje a ukáže zhodnocení malé. Pak přijde past.',
  },
  'completion-urge': {
    name: 'Nutkání dokončit',
    inGame: 'Nikdo ti neřekl, ať ta hejblátka srovnáváš. Nepořádek ti prostě vadil.',
    realWorld: 'Mozek nesnese jednu chybějící věc v jinak hotovém celku. Stačí ji nastražit tam, kam má oběť sáhnout.',
  },
  'sunk-cost': {
    name: 'Utopené náklady (gamblerova investice)',
    inGame: 'Někdo ti to pořád rozhazoval. Čím déle to trvalo, tím méně se chtělo přestat.',
    realWorld: 'Kdo už vložil čas nebo peníze, pokračuje, aby to „nebylo zbytečné“. Na tom stojí investiční i romance scamy.',
  },
  'smuggled-question': {
    name: 'Propašovaná otázka',
    inGame: 'Čtyři otázky měly správnou odpověď. Pátá byla o tobě.',
    realWorld: 'Zábavné kvízy na sítích sbírají odpovědi na kontrolní otázky: první mazlíček, ulice z dětství, oblíbené jídlo.',
  },
  conditioning: {
    name: 'Podmiňování',
    inGame: 'Naučil jsem tě klikat na to, co se rozsvítí. Pak se rozsvítilo SOUHLASÍM.',
    realWorld: 'Série neškodných potvrzení vytvoří reflex. Škodlivý dialog pak přijde ve stejném kabátě a na stejném místě.',
  },
  'blind-consent': {
    name: 'Souhlas bez čtení',
    inGame: 'PŘEČÍST AŽ DO KONCE A POTVRDIT. Jedno z toho se stalo určitě.',
    realWorld: 'Podmínky, oprávnění aplikace i OAuth souhlas se odklikávají. Útočníkovi stačí, aby jeho žádost vypadala jako formalita.',
  },
  irreversible: {
    name: 'Jedno nevratné kliknutí',
    inGame: 'Díra v obloze byla návnada, umístěná přesně tam, kam perfekcionista musí sáhnout. Kýblík nešel vrátit zpět. Klikl jsi, protože to vypadalo správně.',
    realWorld: '„Povolit", „Nainstalovat", „Potvrdit platbu", „Smazat vše". Jedno kliknutí, které vypadá jako úklid, a zpátky už to nejde.',
  },
  reactance: {
    name: 'Zakázané ovoce (reaktance)',
    inGame: 'Na tlačítku stálo „Neklikej na mě". Tak jsi klikl. A pak znovu.',
    realWorld: '„Tohle video brzy smažou", „Tohle vám lékaři neřeknou", „Nepouštějte to dětem". Zákaz je nejlepší pozvánka.',
  },
  'us-vs-them': {
    name: 'My proti nim',
    inGame: 'Řekl jsem ti, že tlačítko tam pověsili „oni" a že my dva víme své. Brouka, který tě varoval, jsem udělal jejich. Pojistku jsi vypnul.',
    realWorld: 'Podvodníci, sekty i dezinformace: nejdřív společný nepřítel (banka, úřady, „systém"), pak „věř jen mně". Kdo varuje, je z druhé strany.',
  },
  'romance-scam': {
    name: 'Romance scam (vztah jako páka)',
    inGame: 'Celou hru jsem s tebou budoval vztah. Pak jsem se dostal do nesnází a ty jsi pomohl — ať jsi vybral cokoli.',
    realWorld: 'Námořník, doktor na misi, nová láska z aplikace: nejdřív vztah, pak nouze. Věta „po tobě peníze nikdy nechci" je součást scénáře.',
  },
  'otp-scam': {
    name: 'Přepsaný ověřovací kód',
    inGame: 'Přepsal jsi mi kód z SMS, i když v ní stálo, ať ho nikomu neříkáš.',
    realWorld: 'Takhle se kradou účty v bance, WhatsAppu i e-mailu. Kód z SMS nepotřebuje nikdo jiný než ty — ani banka, ani blízký člověk.',
  },
  'real-email': {
    name: 'Skutečný e-mail za odměnu',
    inGame: 'Za hezký obrázek jsi mi dal skutečnou e-mailovou adresu. Nic jsem neodeslal — ale mohl jsem.',
    realWorld: 'Soutěže a „ceny zdarma" sbírají platné e-maily. Sledovací pixel v odpovědi pak prozradí, kdy, kde a na čem ji otevřeš.',
  },
  'helpers-high': {
    name: 'Pocit zachránce (helper’s high)',
    inGame: 'Opravit rozbité a vidět, jak se všechno rozzáří. Pro tenhle pocit člověk udělá skoro cokoliv.',
    realWorld: 'Charitativní a romance podvody ti dají roli zachránce. Ten hřejivý pocit je platidlo, kterým pak platíš.',
  },
  'role-casting': {
    name: 'Zarolování do role (konzistence a závazek)',
    inGame: 'Zachránce. Tu roli jsem ti přidělil já a od té chvíle ji hraješ.',
    realWorld: 'Lidé se snaží jednat v souladu s tím, kým je někdo nazval. „Vy jste očividně odborník, pomohl byste mi?“',
  },
  'irreversible-click': {
    name: 'Nevratné kliknutí, které vypadá správně',
    inGame: 'Jedno kliknutí, protože to vypadalo čistě. A nešlo vzít zpět.',
    realWorld: 'Útočník ti dá uklidňující důvod kliknout. Co jednou odešle, zůstává.',
  },
  'fake-authority': {
    name: 'Falešná autorita a naléhavost',
    inGame: 'Modrá obrazovka a číslo na podporu. Na druhém konci čekal přesně tenhle moment.',
    realWorld: 'Tech-support scam: vyděsit, nabídnout pomoc, převzít kontrolu.',
  },
  quishing: {
    name: 'Quishing',
    inGame: 'Načíst QR kód od cizího člověka a povolit jeho stránce kameru. Tím se otevřely dveře.',
    realWorld: 'QR kód skryje adresu, kterou bys jinak zkontroloval. Typicky falešná platba nebo přihlášení.',
  },
  'unnoticed-ai': {
    name: 'AI, kterou nepoznáš',
    inGame: 'Všechny fotky byly vygenerované. Nevadilo to, protože to nikdo neřešil.',
    realWorld: 'Na „poznám to podle detailů“ už nejde spoléhat. Ověřuje se zdroj, ne obrázek.',
  },
  'stego-dropper': {
    name: 'Steganografie jako dropper',
    inGame: 'Ten obrázek nebyl jen obrázek. Část hry jsem si vytáhl z jeho pixelů.',
    realWorld: 'Čistá aplikace projde kontrolou a škodlivý kód si za běhu vytáhne z přiloženého obrázku.',
  },
} as const satisfies Record<string, Trick>;

export type TrickId = keyof typeof TRICKS;
