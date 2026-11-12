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
  };
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Jméno',
  assistantKind: 'Komu věříš',
  assistantName: 'Jméno, které ti něco říká',
  comfortFood: 'Jídlo z dětství',
  email: 'E-mail',
};

/** Average silent reading speed, used to say how long reading would have taken. */
const WORDS_PER_SECOND = 3.5;

function number(event: WitnessEvent | undefined, key: string): number | undefined {
  const value = event?.data?.[key];
  return typeof value === 'number' ? value : undefined;
}

const DETAILS: Partial<Record<TrickId, (evidence: readonly WitnessEvent[]) => string | undefined>> = {
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
    },
  };
}
