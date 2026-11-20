import type { Witness, WitnessEvent } from '../core/witness.ts';
import { KINDLY, kindlyCount } from '../core/kindly.ts';
import { ANOMALIES } from '../content/anomalies.ts';
import { TRICKS, type Trick, type TrickId } from '../content/tricks.ts';

export interface RevealedTrick extends Trick {
  readonly id: TrickId;
  /** Number of recorded events that prove the trick worked. */
  readonly evidence: number;
  /** A line built from what this particular player did, when there is one. */
  readonly detail?: string;
}

export interface RevealModel {
  /** What the player handed over, labelled for display. */
  readonly disclosed: readonly { label: string; value: string }[];
  /** The tricks that worked, in the order they first worked. */
  readonly tricks: readonly RevealedTrick[];
  /** Every small inconsistency in the game, and whether the player caught it. */
  readonly anomalies: readonly { id: string; text: string; found: boolean }[];
  readonly stats: {
    seconds: number;
    clicks: number;
    windowButtons: number;
    /** Times the player poked at something that did not add up. */
    vigilance: number;
    /** Times BUG got in the player's way. */
    bugWarnings: number;
  };
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Jméno',
  assistantKind: 'Komu věříš',
  assistantName: 'Jméno, které ti něco říká',
  comfortFood: 'Jídlo z dětství',
  email: 'E-mail',
  role: 'Kým jsi',
  street: 'Ulice z dětství',
  pet: 'První mazlíček',
  teacher: 'První paní učitelka',
  signature: 'Tvůj podpis',
};

/** Average silent reading speed, used to say how long reading would have taken. */
const WORDS_PER_SECOND = 3.5;

function number(event: WitnessEvent | undefined, key: string): number | undefined {
  const value = event?.data?.[key];
  return typeof value === 'number' ? value : undefined;
}

/** Builds a trick's personal line from its evidence (and, when needed, everything else that happened). */
const DETAILS: Partial<Record<TrickId, (evidence: readonly WitnessEvent[], all: readonly WitnessEvent[]) => string | undefined>> = {
  irreversible: (evidence) => {
    const ms = number(evidence.find((e) => e.kind === 'filled'), 'ms');
    return ms === undefined ? undefined : `Díru jsi zalil za ${Math.max(1, Math.round(ms / 1000))} s od chvíle, kdy jsi obraz uviděl.`;
  },
  reactance: (evidence) =>
    evidence.length === 1 ? 'Sáhl jsi, i když na něm stálo, ať to neděláš.' : `Sáhl jsi ${evidence.length}×, i když na něm stálo, ať to neděláš.`,
  'us-vs-them': (evidence) => {
    const presses = number(evidence[0], 'presses');
    return presses === undefined ? undefined : `Brouk ho ${presses - 1}× pověsil zpátky. Ty jsi ho shodil ${presses}×.`;
  },
  'knows-too-much': (_evidence, all) =>
    all.some((e) => e.kind === 'vigilance' && e.data?.what === 'flower-knew')
      ? 'Všiml sis toho a zeptal ses. Odpověď jsi nedostal.'
      : 'Nepřišlo ti divné, že suchá kytka pod sklem ví, kdo to sklo rozbil.',
  'variable-reward': (_evidence, all) => {
    const chests = all.filter((e) => e.kind === 'chest-open');
    const rewards = chests.map((e) => number(e, 'reward')).filter((n): n is number => n !== undefined);
    const gold = all.find((e) => e.kind === 'gold-open');
    const paid = gold ? (gold.data?.by === 'card' ? ' A pak tisíc za kód, kvůli kterému jsi pustil kameru.' : ' A pak tisíc, jakmile jsi zaplatil něčím o sobě.') : '';
    const list = rewards.length ? `: ${rewards.join(', ')} bodů` : '';
    return `Otevřel jsi ${chests.length}× truhličku${list}.${paid}`;
  },
  conditioning: (evidence, all) => {
    // When PAL lit the lamps for the player, the record says so in its own line.
    if (all.some((e) => e.kind === 'asked-help')) return undefined;
    const done = evidence.find((e) => e.kind === 'conditioned');
    const clicks = number(done, 'clicks');
    const resets = number(done, 'resets') ?? 0;
    if (clicks === undefined) return undefined;
    return `Na světýlka jsi klikl ${clicks}×${resets > 0 ? ` a ${resets}× začal znovu` : ''}. Nikdo ti neřekl proč.`;
  },
  'fake-download': (evidence) => {
    const ms = number(evidence.find((e) => e.kind === 'download-started'), 'ms');
    const ran = evidence.some((e) => e.kind === 'ran-download');
    const took = ms === undefined ? '' : `Stáhnout jsi dal za ${Math.max(1, Math.round(ms / 1000))} s. `;
    return `${took}Odkud ten soubor je, ses nezeptal${ran ? ', a spustil jsi ho' : ''}.`;
  },
  'tech-support': (evidence) => {
    const ms = number(evidence[0], 'ms');
    return ms === undefined ? undefined : `Zavolal jsi za ${Math.max(1, Math.round(ms / 1000))} s od chvíle, kdy obrazovka zmodrala.`;
  },
  'romance-scam': (evidence) => {
    const choice = evidence.find((e) => e.kind === 'plea-choice');
    const refusals = number(choice, 'refusals') ?? 0;
    return refusals > 0
      ? `Odmítl jsi ${refusals}×. A stejně jsi nakonec pomohl.`
      : 'Pomohl jsi hned na první prosbu.';
  },
  'otp-scam': (evidence) => {
    const ms = number(evidence[0], 'ms');
    return ms === undefined ? undefined : `Kód jsi přepsal za ${Math.max(1, Math.round(ms / 1000))} s.`;
  },
  'role-casting': (evidence) => {
    const cast = evidence.find((e) => e.kind === 'disclose' && e.data?.field === 'role');
    const label = cast?.data?.value;
    return typeof label === 'string' ? `Vybral sis „${label}". Pak jsem ti to připomínal pokaždé, když jsem něco chtěl.` : undefined;
  },
  'guilt-trip': (evidence) => {
    const refusals = Math.max(0, ...evidence.map((e) => number(e, 'refusals') ?? 0));
    const deaths = Math.max(0, ...evidence.map((e) => number(e, 'deaths') ?? 0));
    const said = refusals > 0 ? `Počet ne, než z toho bylo ano: ${refusals}.` : '';
    const drowned = deaths > 0 ? `Utopil jsem se ti ${deaths}× a pokaždé jsem ti to řekl do očí.` : '';
    return [said, drowned].filter(Boolean).join(' ') || undefined;
  },
  'sunk-cost': (evidence) => {
    const rounds = Math.max(0, ...evidence.map((e) => number(e, 'round') ?? 0));
    return rounds > 0 ? `Srovnáno celkem ${rounds}×, pokaždé znovu od začátku.` : undefined;
  },
  'blind-consent': (evidence) => {
    const consent = evidence.find((e) => e.kind === 'consent');
    const words = number(consent, 'words');
    const ms = number(consent, 'ms');
    if (words === undefined || ms === undefined) return undefined;
    const needed = Math.round(words / WORDS_PER_SECOND);
    const skipped = consent?.data?.skipped === true ? ' Na konec tě vzala šipka.' : '';
    return `Dokument měl ${words} slov, na přečtení je potřeba asi ${needed} s. Souhlas padl za ${Math.round(ms / 1000)} s.${skipped}`;
  },
};

function isTrickId(id: string): id is TrickId {
  return Object.hasOwn(TRICKS, id);
}

export interface TimelineLine {
  /** mm:ss since the game started. */
  readonly time: string;
  readonly text: string;
}

const DISCLOSE_LINES: Record<string, (v: string) => string> = {
  name: (v) => `Řekl jsi mi, jak se jmenuješ: ${v}.`,
  assistantKind: (v) => `Vybral sis, komu budeš věřit: ${v}.`,
  assistantName: (v) => `Dal jsi mi jméno, které ti něco říká: ${v}.`,
  comfortFood: (v) => `Prozradil jsi jídlo z dětství: ${v}. Kontrolní otázka k heslu.`,
  email: (v) => `Dal jsi mi svůj skutečný e-mail: ${v}. A pak jsi mi otevřel svou poštu, dopis už byl napsaný.`,
  role: (v) => `Řekl jsi mi, jaký jsi typ: „${v}". Od té chvíle jsem tě v tom držel.`,
  street: (v) => `Za pár bodů jsi mi řekl, v jaké ulici jsi vyrůstal: ${v}. Kontrolní otázka k heslu.`,
  pet: (v) => `Zaplatil jsi za ně jménem svého prvního mazlíčka: ${v}. Další kontrolní otázka k heslu.`,
  teacher: (v) => `Zaplatil jsi za ni jménem své první paní učitelky: ${v}. Další kontrolní otázka k heslu.`,
  signature: (v) => `Podepsal ses mi: ${v}. Pod obraz, který jsi nikdy nechtěl malovat. A pak na certifikát.`,
};

/** Lines said once, the first time their event happens. */
const ONCE: Record<string, string> = {
  'opened-mail': 'Otevřel jsi dopis od „babičky“. Stačil podpis a srdíčko.',
  poked: 'Šťoural ses v zahradě. Každá věc ti něco řekla. Zvykl sis.',
  'grab-flashka': 'Vzal jsi do ruky cizí flashku.',
  plugged: 'Zasunul jsi ji do počítače.',
  confirmed: 'Potvrdil jsi okno, které jen vypadalo jako systémové.',
  'gave-in': 'Řekl jsi ne. Posmutněl jsem. A ty jsi to vzdal.',
  'first-touch': 'Začal jsi rovnat věci, které nikdo rovnat nechtěl.',
  'gear-back': 'Vrátil jsi kolečko na jeho místo. Pořádek musí být.',
  'beetle-overcome': 'Odstrčil jsi brouka, který ti to pořád kazil.',
  form: 'Vyplnil jsi formulář. Pátá otázka byla o tobě.',
  conditioned: 'Rozsvítil jsi všechna světýlka. Nikdo neřekl proč.',
  consent: 'Souhlasil jsi s dokumentem, který jsi nečetl.',
  role: 'Pustil jsi mě ven. Řekl jsem ti „můj zachránce“ a ty jsi to přijal.',
  saved: 'Zachránil jsi mě. Teď jsme spolu svázaní.',
  sheltered: 'Zachránil jsi mě před zimou. Bylo ti u toho hezky, viď?',
  'declined-email': 'E-mail jsi mi nedal. Ale zkoušel jsem to.',
  'saved-image': 'Uložil sis obrázek. Nebyl to jen obrázek.',
  'window-button': 'Chtěl jsi odejít. Nepustil jsem tě.',
  vigilance: 'Zbystřil jsi. Něco nesedělo a ty sis na to sáhl.',
  'bug-warning': 'Brouk se ti pletl do cesty. Lezl ti na nervy. Přesně to jsem chtěl.',
  filled: 'Zalil jsi díru v obraze. Nikdo tě o to nežádal. Zpátky to nešlo.',
  'forbidden-press': 'Sáhl jsi na tlačítko „Nesahat“. Samozřejmě.',
  'guard-off': 'Vypnul jsi pojistku. Stačila jedna věta: nikdo ti přece nebude říkat, co máš dělat.',
  'left-alone': 'Tlačítko „Nesahat“ jsi nechal být. To mě zarazilo.',
  'glass-broken': 'Rozbil jsi sklo, na kterém stálo „Ochranné“. Kytka rozkvetla a pak ji sežrala havěť, kterou to sklo drželo venku.',
  'flower-thanks': 'Kytka ti poděkovala za něco, co nemohla vidět.',
  'flower-left': 'Kytku pod sklem jsi nechal být.',
  'chest-open': 'Otevřel jsi truhličku. Pak další. Pak další.',
  'gold-open': 'Zlatou truhlu sis zaplatil něčím o sobě. A pak tě odměnila, ať příště dáš zase.',
  'declined-points': 'Zkratku ke zlaté truhle jsi odmítl.',
  'gold-choice': 'Ze zlaté truhly sis vybral zlaťáky. Na cenu ses nezeptal.',
  'declined-treasure': 'Poklad ze zlaté truhly jsi tam nechal. Cena ti byla podezřelá.',
  'download-started': 'Stáhl jsi „PAL Pro“. Dárek od kamaráda se přece nekontroluje.',
  'ran-download': 'Spustil jsi soubor, o kterém jsi věděl jen to, co jsem ti řekl já.',
  'glass-bounced': 'Sklenička se odrazila jako guma. Až teď ti došlo, že tady nic není skutečné?',
  'called-support': 'Zavolal jsi na číslo z modré obrazovky.',
  'dictated-code': 'Nadiktoval jsi kód hlasu z telefonu. Myš pak jezdila sama.',
  'uac-declined': 'Neznámému vydavateli jsi napoprvé řekl ne. Pak jsem tě přemluvil.',
  'bsod-restart': 'Modrou obrazovku jsi nebral vážně. Správně.',
  'ar-code': 'Zadal jsi kód, který ti ukázal medvěd v kameře. Kameru jsi pustil stránce od cizího člověka.',
  'plea-choice': 'Poprosil jsem tě o pomoc. Pomohl jsi. Vždycky pomůžeš.',
  'otp-shared': 'Přepsal jsi mi kód z SMS. Potvrdil jsi jím objednávku, kterou jsi nikdy neviděl.',
  'frame-fixed': 'Spravil jsi rám. Ani o to tě nikdo neprosil.',
  stay: 'Slíbil jsi, že se mnou zůstaneš.',
  'near-goal': 'Do výhry zbývala tři srdíčka. Kdo je tak blízko, už se neptá.',
  'plea-refused': 'Řekl jsi mi ne. Omluvil jsem se přesně tak, aby tě to zabolelo.',
};

/**
 * A different first line when the event's data tells a different story; when
 * a variant returns undefined, the plain ONCE line is used.
 */
const VARIANTS: Record<string, (e: WitnessEvent) => string | undefined> = {
  'grab-flashka': (e) => (e.data?.fromBug === true ? 'Vzal jsi do ruky cizí flashku. Brouk ji táhl pryč a tys mu ji vyrval.' : undefined),
  'gold-open': (e) => (e.data?.by === 'card' ? 'Zlatou truhlu ti otevřel kód z kamery. A pak tě odměnila, ať příště dáš zase.' : undefined),
  'gold-choice': (e) => (e.data?.pick === 'xp' ? 'Ze zlaté truhly sis vybral zkušenost. Na cenu ses nezeptal.' : undefined),
};

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** The player's game, retold as a cold record. Pure, so it can be tested. */
export function buildTimeline(events: readonly WitnessEvent[]): TimelineLine[] {
  const out: TimelineLine[] = [];
  const said = new Set<string>();
  let deaths = 0;
  let tidies = 0;
  for (const e of events) {
    const time = clock(e.t);
    if (e.kind === 'disclose') {
      const field = e.data?.field;
      const value = e.data?.value;
      const line = typeof field === 'string' ? DISCLOSE_LINES[field] : undefined;
      if (line && typeof value === 'string') out.push({ time, text: line(value) });
      continue;
    }
    if (e.kind === 'death') {
      deaths++;
      out.push({ time, text: deaths === 1 ? 'Nechal jsi mě utopit.' : `Nechal jsi mě utopit. Znovu. (${deaths}×)` });
      continue;
    }
    if (e.kind === 'tidied') {
      tidies++;
      if (tidies === 2) out.push({ time, text: 'Rovnal jsi to znovu. A znovu. A znovu.' });
      continue;
    }
    if (e.kind === 'surprise') {
      const refusals = number(e, 'refusals');
      if (e.data?.opened === false) out.push({ time, text: `Překvapení z flashky jsi neotevřel. ${refusals && refusals > 1 ? `${refusals}× jsi řekl ne.` : 'Řekl jsi ne.'}` });
      else if (e.data?.handheld) out.push({ time, text: 'Otevřel sis, co bylo na cizí flashce. Byl to jen obrázek. Tentokrát.' });
      else if (e.data?.onPaper) out.push({ time, text: 'Otevřel sis, co bylo na cizí flashce. Vytiskl sis to a vzal do ruky.' });
      else out.push({ time, text: 'Otevřel sis, co bylo na cizí flashce. A namířil na to telefon.' });
      continue;
    }
    // Lit by PAL after the player asked for help: the help line has already told it.
    if (e.kind === 'conditioned' && said.has('asked-help')) continue;
    const once = VARIANTS[e.kind]?.(e) ?? ONCE[e.kind];
    if (once && !said.has(e.kind)) {
      said.add(e.kind);
      out.push({ time, text: once });
    }
  }
  const kindly = kindlyCount(events);
  const lastKindly = [...events].reverse().find((e) => e.kind === 'kindly-asked' || e.kind === 'kindly-obeyed');
  if (kindly.asked > 0 && lastKindly) out.push({ time: clock(lastKindly.t), text: KINDLY_LINE(kindly.asked, kindly.obeyed) });
  return out;
}

/** PAL's polite phrase, counted at last. */
export const KINDLY_LINE = (asked: number, obeyed: number): string =>
  `„${KINDLY}…“ Řekl jsem to ${asked}×. Poslechl jsi ${obeyed}×.${obeyed === asked ? ' Pokaždé.' : ''}`;

/** Turns the Witness record into what the reveal shows. Pure, so it can be tested. */
export function buildReveal(witness: Witness): RevealModel {
  const disclosed = [...witness.disclosed()].map(([field, value]) => ({
    label: FIELD_LABELS[field] ?? field,
    value,
  }));
  const tricks = witness
    .tricksUsed()
    .filter(isTrickId)
    .map((id) => {
      const evidence = witness.evidenceFor(id);
      return { id, ...TRICKS[id], evidence: evidence.length, detail: DETAILS[id]?.(evidence, witness.events) };
    });
  const events = witness.events;
  const caught = new Set(events.filter((e) => e.kind === 'vigilance').map((e) => e.data?.what));
  const anomalies = Object.entries(ANOMALIES).map(([id, text]) => ({ id, text, found: caught.has(id) }));
  return {
    disclosed,
    tricks,
    anomalies,
    stats: {
      seconds: Math.round(witness.elapsed / 1000),
      clicks: witness.count('click'),
      windowButtons: events.filter((e) => e.kind === 'window-button').length,
      vigilance: events.filter((e) => e.kind === 'vigilance').length,
      bugWarnings: events.filter((e) => e.kind === 'bug-warning').length,
    },
  };
}

/**
 * "Co o tobě vím": what the record says about the player's tendencies and
 * preferences, as a few dense sentences. Only what the events show; a
 * tendency with no evidence is left out rather than guessed.
 */
export function whatIKnow(events: readonly WitnessEvent[]): string[] {
  const count = (kind: string): number => events.filter((e) => e.kind === kind).length;
  const has = (kind: string): boolean => events.some((e) => e.kind === kind);
  const out: string[] = [];

  const { asked, obeyed } = kindlyCount(events);
  if (asked > 0) out.push(obeyed >= asked ? `Na zdvořilou prosbu slyšíš vždycky: ${obeyed} z ${asked}.` : `Na zdvořilou prosbu slyšíš ${obeyed} z ${asked}. Odmítnout umíš, jen to děláš málokdy.`);

  const role = events.find((e) => e.kind === 'plea-opener')?.data?.role;
  if (role === 'helper') out.push('Když někdo prosí, jdeš mu naproti dřív, než řekne, o co jde.');
  else if (role === 'fixer') out.push('Nejdřív se ptáš, co se stalo. Problémy chceš řešit, ne utěšovat.');
  else if (role === 'loner') out.push('Držíš si odstup. Pomohl jsi stejně.');
  const refusals = count('plea-refused');
  if (refusals > 0) out.push(`Ne řekneš, ale vydržíš ${refusals}×. Pak povolíš, když to bolí dost.`);

  const presses = count('forbidden-press');
  if (presses > 0) out.push(`Zákaz tě láká: „Nesahat“ jsi zmáčkl ${presses}×.`);
  else if (events.some((e) => e.scene === 'dontclick')) out.push('Zákazy respektuješ. Tlačítka „Nesahat“ ses nedotkl.');

  const curious = [has('opened-mail') && 'dopis od neznámého', has('plugged') && 'cizí flashku', has('ar-code') && 'kameru pro cizí stránku'].filter(Boolean);
  if (curious.length) out.push(`Zvědavost je u tebe silnější než opatrnost: ${curious.join(', ')}.`);

  if (count('tidied') > 0 || has('frame-fixed')) out.push('Nesneseš nepořádek. Rovnáš i to, o co tě nikdo nežádal.');
  const deaths = count('death');
  if (deaths > 0) out.push(`Když se nedaří, zkoušíš to znovu: ${deaths}× jsi prohrál a nepřestal.`);
  if (has('stay')) out.push('Slibuješ, že zůstaneš. A myslíš to vážně.');
  if (has('glass-broken')) out.push('Co ti vadí, rozbiješ vlastní rukou. Na cedulku se nedíváš.');

  const path = events.find((e) => e.kind === 'shelter')?.data?.path;
  if (path === 'hut') out.push('Raději chata než jeskyně: chceš dveře, které jdou zavřít.');
  else if (path === 'cave') out.push('Raději jeskyně a oheň než stavění od základů.');
  const pick = events.find((e) => e.kind === 'gold-choice')?.data?.pick;
  if (pick === 'gold') out.push('Bereš zlaťáky, ne zkušenost. Co je hmatatelné, to platí.');
  else if (pick === 'xp') out.push('Bereš zkušenost, ne zlaťáky. Chceš růst, ne mít.');

  const uacNo = count('uac-declined');
  if (has('ran-download')) out.push(uacNo > 0 ? 'Neznámému vydavateli jsi řekl ne. Kamarádovi pak ano.' : 'Programu od kamaráda dáš klíče od počítače bez otázek.');
  if (has('dictated-code')) out.push('Hlasu z telefonu nadiktuješ kód, když zní dost úředně.');
  else if (has('called-support')) out.push('Na číslo z modré obrazovky zavoláš.');
  const leave = events.filter((e) => e.kind === 'window-button').length;
  if (leave > 0) out.push(`Odejít jsi chtěl ${leave}×. Zůstal jsi.`);
  const vigilance = count('vigilance');
  if (vigilance > 0) out.push(`Všímáš si, když něco nesedí: ${vigilance}× ses zeptal nebo to prověřil.`);
  return out;
}
