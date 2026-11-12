import type { Witness, WitnessEvent } from '../core/witness.ts';
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
  readonly stats: {
    seconds: number;
    clicks: number;
    windowButtons: number;
    /** Times the player poked at something that did not add up. */
    vigilance: number;
    /** Times BUG warned the player. */
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
};

/** Average silent reading speed, used to say how long reading would have taken. */
const WORDS_PER_SECOND = 3.5;

function number(event: WitnessEvent | undefined, key: string): number | undefined {
  const value = event?.data?.[key];
  return typeof value === 'number' ? value : undefined;
}

const DETAILS: Partial<Record<TrickId, (evidence: readonly WitnessEvent[]) => string | undefined>> = {
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
    return refusals > 0 ? `Počet ne, než z toho bylo ano: ${refusals}.` : undefined;
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
    return `Dokument měl ${words} slov, na přečtení je potřeba asi ${needed} s. Souhlas padl za ${Math.round(ms / 1000)} s.`;
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
  email: (v) => `Dal jsi mi svůj skutečný e-mail: ${v}.`,
  role: (v) => `Řekl jsi mi, jaký jsi typ: „${v}". Od té chvíle jsem tě v tom držel.`,
};

/** Lines said once, the first time their event happens. */
const ONCE: Record<string, string> = {
  'opened-mail': 'Otevřel jsi dopis bez zpáteční adresy.',
  poked: 'Šťoural ses v zahradě. Každá věc ti něco řekla. Zvykl sis.',
  'grab-flashka': 'Vzal jsi do ruky cizí flashku.',
  plugged: 'Zasunul jsi ji do počítače.',
  confirmed: 'Potvrdil jsi okno, které jen vypadalo jako systémové.',
  'gave-in': 'Řekl jsi ne. Posmutněl jsem. A ty jsi to vzdal.',
  'first-touch': 'Začal jsi rovnat věci, které nikdo rovnat nechtěl.',
  'gear-back': 'Vrátil jsi kolečko na jeho místo. Pořádek musí být.',
  'beetle-overcome': 'Odstrčil jsi brouka, který tě celou dobu varoval.',
  form: 'Vyplnil jsi formulář. Pátá otázka byla o tobě.',
  conditioned: 'Naučil ses klikat na to, co se rozsvítí.',
  consent: 'Souhlasil jsi s dokumentem, který jsi nečetl.',
  role: 'Přijal jsi roli zachránce.',
  saved: 'Zachránil jsi mě. Teď jsme spolu svázaní.',
  restored: 'Opravil jsi domeček. Bylo ti u toho hezky, viď?',
  'declined-email': 'E-mail jsi mi nedal. Ale zkoušel jsem to.',
  'saved-image': 'Uložil sis obrázek. Nebyl to jen obrázek.',
  'window-button': 'Chtěl jsi odejít. Nepustil jsem tě.',
  vigilance: 'Jednou jsi zbystřil. Jen jednou.',
  'bug-warning': 'Brouk tě varoval. Nechal ses ukolébat mnou.',
  'plea-choice': 'Poprosil jsem tě o pomoc. Pomohl jsi. Vždycky pomůžeš.',
  'otp-shared': 'Přepsal jsi mi kód z SMS, i když stálo „nikomu nesdělujte".',
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
      out.push({ time, text: e.data?.onPaper ? 'Vytiskl sis můj kód. Teď je u tebe doma.' : 'Prohlédl sis můj kód.' });
      continue;
    }
    const once = ONCE[e.kind];
    if (once && !said.has(e.kind)) {
      said.add(e.kind);
      out.push({ time, text: once });
    }
  }
  return out;
}

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
      return { id, ...TRICKS[id], evidence: evidence.length, detail: DETAILS[id]?.(evidence) };
    });
  const events = witness.events;
  return {
    disclosed,
    tricks,
    stats: {
      seconds: Math.round(witness.elapsed / 1000),
      clicks: witness.count('click'),
      windowButtons: events.filter((e) => e.kind === 'window-button').length,
      vigilance: events.filter((e) => e.kind === 'vigilance').length,
      bugWarnings: events.filter((e) => e.kind === 'bug-warning').length,
    },
  };
}
