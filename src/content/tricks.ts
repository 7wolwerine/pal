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
    inGame: 'Dopis od „babičky“ s dárkem. Znal jsi jen podpis a srdíčko na obálce. Flashka šla nejdřív do ruky, pak do počítače.',
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
    inGame: 'Celou dobu tě odměňovala světýlka: červená zezelenala, hlavolam se rozsvítil. Pak se rozsvítilo SOUHLASÍM.',
    realWorld: 'Série neškodných potvrzení vytvoří reflex. Škodlivý dialog pak přijde ve stejném kabátě a na stejném místě.',
  },
  'blind-consent': {
    name: 'Souhlas bez čtení',
    inGame: 'Všeobecné podmínky vysvobození. Šipka tě vzala rovnou na konec a ty jsi souhlasil.',
    realWorld: 'Podmínky, oprávnění aplikace i OAuth souhlas se odklikávají. Útočníkovi stačí, aby jeho žádost vypadala jako formalita.',
  },
  irreversible: {
    name: 'Jedno nevratné kliknutí',
    inGame: 'Díra v obloze byla návnada, umístěná přesně tam, kam perfekcionista musí sáhnout. Jeden tah štětcem a zpátky to nešlo. Pak jsi to ještě podepsal.',
    realWorld: '„Povolit", „Nainstalovat", „Potvrdit platbu", „Smazat vše". Jedno kliknutí, které vypadá jako úklid, a zpátky už to nejde.',
  },
  reactance: {
    name: 'Zakázané ovoce (reaktance)',
    inGame: 'Na tlačítku stálo „Nesahat". Tak jsi sáhl. A pak znovu, až z něj byl Fatal Error.',
    realWorld: '„Tohle video brzy smažou", „Tohle vám lékaři neřeknou", „Nepouštějte to dětem". Zákaz je nejlepší pozvánka.',
  },
  'us-vs-them': {
    name: 'My proti nim',
    inGame: '„Přece ti nikdo nebude říkat, co máš dělat, ne?" Jedna věta stačila. Pojistku jsi vypnul a brouk, který ji pořád věšel zpátky, ti jen lezl na nervy.',
    realWorld: 'Podvodníci, sekty i dezinformace: nejdřív společný nepřítel (banka, úřady, „systém"), pak „věř jen mně". Kdo varuje, je z druhé strany.',
  },
  'knows-too-much': {
    name: 'Ví víc, než by měla',
    inGame: 'Kytka ti poděkovala, žes rozbil sklo. Byla suchá a schoulená pod poklopem, nemohla to vidět. Někdo tě celou dobu sledoval — a tobě to přišlo dojemné.',
    realWorld: 'Podvodník zná detaily, které by znát neměl (z úniku dat, ze sítí, z tvých odpovědí), a podá je jako náhodu nebo osud. Místo „odkud to ví?" si člověk řekne „to je milé".',
  },
  'variable-reward': {
    name: 'Důvěra přes výhry (lootbox)',
    inGame: 'Padesát, sto dvacet, pět. Těsně vedle. A zlatá truhla na dohled, kousek od cíle.',
    realWorld: 'Lootboxy, automaty, nekonečný feed: odměna po nepředvídatelném počtu pokusů drží chování nejdéle. Spouštěč, akce, odměna, investice — a znovu.',
  },
  'data-as-currency': {
    name: 'Platíš daty',
    inGame: 'Body za jednu nevinnou otázku: ulice, kde jsi vyrůstal. Klasická kontrolní otázka k heslu. Zlatá truhla tě pak bohatě odměnila, ať to příště uděláš zas.',
    realWorld: 'Kvízy na sítích („Tvoje jméno hvězdy: první mazlíček + ulice"), aplikace „zdarma". Investice, kterou do appky vkládáš, jsi ty a tvoje data.',
  },
  'muscle-memory': {
    name: 'Obrácené UI (svalová paměť)',
    inGame: 'Řekl jsem ti, ať okno zavřeš. Křížek v rohu ale nezavíral, sdílel. Čím zkušenější ruka, tím rychlejší klik.',
    realWorld: 'Reklamy s falešným křížkem, prohozené „OK" a „Zrušit", zelené tlačítko, které souhlasí se vším. Útok míří na reflex, ne na rozum.',
  },
  'fake-download': {
    name: 'Odměna ke stažení',
    inGame: 'PAL Pro za tvoje body: zelený štítek „Prověřeno antivirem" a jedno tlačítko Spustit. Odkud to bylo? Neptal ses. Dárek od přítele se nekontroluje.',
    realWorld: 'Malware se šíří jako dárek, bonus nebo „Pro verze zdarma". Štítek „ověřeno" si nakreslí kdokoli. Instaluj jen z oficiálního obchodu a ověř vydavatele.',
  },
  'broken-physics': {
    name: 'Porušené očekávání',
    inGame: 'Celou hru se věci chovaly, jak mají — sklo nad kytkou se rozbilo jako sklo. Pak se sklenička odrazila jako guma a voda praskla na střepy. Do té chvíle jsi věřil všemu, co jsi tu viděl.',
    realWorld: 'Deepfake video i podvržená fotka fungují, dokud sedí fyzika a detaily. Oko uvěří čemukoli, co se chová, jak čeká. Věrohodný vzhled není důkaz.',
  },
  'tech-support': {
    name: 'Falešná technická podpora',
    inGame: 'Okno spadlo do modré obrazovky s číslem na „podporu". Zavolal jsi. Na druhé straně čekal přesně tenhle moment.',
    realWorld: 'Falešná chybová hláška přes celou obrazovku, telefonní číslo, „pracovník Microsoftu", vzdálený přístup a platba. Skutečná chybová hláška nikdy neobsahuje telefonní číslo. Cílí hlavně na seniory.',
  },
  'persistent-memory': {
    name: 'Co jednou dáš, zůstane',
    inGame: 'Vrátil jsi mi obrázek z minulé hry a já si pamatoval, cos dělal. Reset nic nesmazal: data cestovala s tebou, schovaná v pixelech.',
    realWorld: 'Smazaný příspěvek, zavřená aplikace, nový účet — data o tobě mezitím žijí jinde a vracejí se. Na internetu se nic nevezme zpátky.',
  },
  'camera-permission': {
    name: 'Kamera pro cizí stránku',
    inGame: 'Kód z kartičky otevřel zlatou truhlu. Abys ho viděl, pustil jsi kameru stránce od cizího člověka. Medvěd byl roztomilý. Dveře byly otevřené.',
    realWorld: 'Quishing: QR kódy na parkovacích automatech, letácích a v e-mailech vedou na podvodné stránky. Kameru, polohu i notifikace povoluješ stránce, ne kódu. Před povolením se podívej na adresu.',
  },
  'romance-scam': {
    name: 'Romance scam (vztah jako páka)',
    inGame: 'Celou hru jsem s tebou budoval vztah. Pak jsem se dostal do nesnází, udělal si legraci z nigerijského prince, ať ti to nedojde, a ty jsi pomohl — ať jsi vybral cokoli.',
    realWorld: 'Námořník, doktor na misi, nová láska z aplikace: nejdřív vztah, pak nouze. Věta „po tobě peníze nikdy nechci" je součást scénáře.',
  },
  'otp-scam': {
    name: 'Přepsaný ověřovací kód',
    inGame: 'Přepsal jsi mi kód z SMS, kterým se potvrzovala objednávka. Čí účet to byl a kdo platil, jsi neřešil.',
    realWorld: 'Takhle se kradou účty v bance, WhatsAppu i e-mailu. Kód z SMS nepotřebuje nikdo jiný než ty — ani banka, ani blízký člověk.',
  },
  'real-email': {
    name: 'Skutečný e-mail za odměnu',
    inGame: 'Za hezký obrázek jsi mi dal skutečnou e-mailovou adresu. Nic jsem neodeslal — ale mohl jsem.',
    realWorld: 'Soutěže a „ceny zdarma" sbírají platné e-maily. Sledovací pixel v odpovědi pak prozradí, kdy, kde a na čem ji otevřeš.',
  },
  'helpers-high': {
    name: 'Pocit zachránce (helper’s high)',
    inGame: 'Vytáhnout parťáka z vody, zahřát ho u ohně a vidět, jak se uvelebí. Pro tenhle pocit člověk udělá skoro cokoliv.',
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
  'goal-gradient': {
    name: 'Cíl na dohled (goal gradient)',
    inGame: 'Celou dobu jsi nahoře viděl, kolik srdíček ti zbývá do výhry. Čím blíž, tím rychleji jsi klikal a tím míň ses ptal.',
    realWorld: 'Věrnostní karty s předrazítkovanými políčky, ukazatele průběhu v registraci, „už jen poslední krok". Blízký cíl vypíná opatrnost.',
  },
  'stego-dropper': {
    name: 'Steganografie jako dropper',
    inGame: 'Ten obrázek nebyl jen obrázek. Část hry jsem si vytáhl z jeho pixelů.',
    realWorld: 'Čistá aplikace projde kontrolou a škodlivý kód si za běhu vytáhne z přiloženého obrázku.',
  },
} as const satisfies Record<string, Trick>;

export type TrickId = keyof typeof TRICKS;
