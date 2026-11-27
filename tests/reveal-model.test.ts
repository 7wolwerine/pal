import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TRICKS } from '../src/content/tricks.ts';
import { Witness } from '../src/core/witness.ts';
import { buildReveal, buildTimeline, KINDLY_LINE, ONCE_KINDS } from '../src/scenes/reveal-model.ts';
import { KINDLY, kindlyAsked, kindlyCount, kindlyObeyed } from '../src/core/kindly.ts';

describe('buildTimeline', () => {
  it('retells the game in order with mm:ss stamps, once per kind, with counts', () => {
    let now = 0;
    const w = new Witness(() => now);
    now = 4_000;
    w.record({ scene: 'mailbox', kind: 'opened-mail' });
    now = 9_500;
    w.disclose('welcome', 'rapport', 'name', 'Tester');
    w.record({ scene: 'welcome', kind: 'step' });
    now = 61_000;
    w.record({ scene: 'fidgets', kind: 'tidied', data: { round: 1 } });
    w.record({ scene: 'fidgets', kind: 'tidied', data: { round: 2 } });
    w.record({ scene: 'fidgets', kind: 'tidied', data: { round: 3 } });
    w.record({ scene: 'x', kind: 'window-button' });
    w.record({ scene: 'x', kind: 'window-button' });
    w.record({ scene: 'rescue', kind: 'death' });
    w.record({ scene: 'rescue', kind: 'death' });

    const lines = buildTimeline(w.events);
    expect(lines.map((l) => l.time)).toEqual(['00:04', '00:09', '01:01', '01:01', '01:01', '01:01']);
    expect(lines[0]?.text).toMatch(/dopis/);
    expect(lines[1]?.text).toContain('Tester');
    expect(lines[2]?.text).toMatch(/znovu/);
    expect(lines.filter((l) => /odejít/.test(l.text))).toHaveLength(1);
    expect(lines[5]?.text).toContain('2×');
  });

  it('is empty for a player who did nothing', () => {
    expect(buildTimeline(new Witness().events)).toEqual([]);
  });

  it('has a line for the refused plea and for the last hearts before the prize', () => {
    const w = new Witness(() => 0);
    w.record({ scene: 'chest', kind: 'near-goal', trick: 'goal-gradient' });
    w.record({ scene: 'plea', kind: 'plea-refused', data: { n: 1 } });
    w.record({ scene: 'plea', kind: 'plea-refused', data: { n: 2 } });
    const lines = buildTimeline(w.events).map((l) => l.text);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/srdíčka/);
    expect(lines[1]).toMatch(/Řekl jsi mi ne/);
  });

  it('tells the four endings of the surprise apart', () => {
    const line = (data: Record<string, boolean | number>) => {
      const w = new Witness(() => 0);
      w.record({ scene: 'desk', kind: 'surprise', data });
      return buildTimeline(w.events)[0]?.text;
    };
    expect(line({ opened: false, handheld: false, refusals: 3 })).toMatch(/neotevřel.*3×/);
    expect(line({ opened: false, handheld: false, refusals: 1 })).toMatch(/neotevřel\. Řekl jsi ne\.$/);
    expect(line({ opened: true, handheld: true, refusals: 0 })).toMatch(/jen obrázek/);
    expect(line({ opened: true, handheld: false, onPaper: true, refusals: 0 })).toMatch(/Vytiskl/);
    expect(line({ opened: true, handheld: false, onPaper: false, refusals: 0 })).toMatch(/telefon/);
  });

  it('tells a drive taken back from BUG and a chest opened by the card apart', () => {
    const w = new Witness(() => 0);
    w.record({ scene: 'desk', kind: 'grab-flashka', trick: 'baiting', data: { fromBug: true } });
    w.record({ scene: 'chest', kind: 'gold-open', trick: 'variable-reward', data: { by: 'card' } });
    const [grab, gold] = buildTimeline(w.events).map((l) => l.text);
    expect(grab).toMatch(/Brouk/);
    expect(gold).toMatch(/kamery/);

    const plain = new Witness(() => 0);
    plain.record({ scene: 'desk', kind: 'grab-flashka', trick: 'baiting', data: { fromBug: false } });
    const [grab2] = buildTimeline(plain.events).map((l) => l.text);
    expect(grab2).not.toMatch(/Brouk/);
  });

  it('has a line for every event kind the game records that has a story of its own', () => {
    // A few kinds picked by hand, so the check cannot pass by both sides being emptied.
    const anchors = ['opened-mail', 'grab-flashka', 'plugged', 'confirmed', 'first-touch', 'form', 'conditioned', 'consent', 'filled', 'saved', 'sheltered', 'glass-broken', 'forbidden-press', 'chest-open', 'gold-open', 'plea-choice', 'otp-shared', 'download-started', 'saved-image', 'glass-bounced', 'called-support'];
    for (const kind of anchors) expect(ONCE_KINDS, kind).toContain(kind);
    for (const kind of ONCE_KINDS) {
      const w = new Witness(() => 0);
      w.record({ scene: 'x', kind });
      expect(buildTimeline(w.events), kind).toHaveLength(1);
    }
  });

  it('every kind the game records is told on the timeline, or is known to be told another way', () => {
    // Every `kind: '...'` written in the game's code. The pattern also catches the kind
    // fields of things that are not events (the glass's states, the fidgets' objects),
    // so those are listed below too.
    const files = readdirSync(new URL('../src/', import.meta.url), { recursive: true, encoding: 'utf8' })
      .filter((f) => f.endsWith('.ts') && !f.endsWith('reveal-model.ts'));
    const recorded = new Set<string>();
    for (const f of files) {
      const text = readFileSync(new URL(`../src/${f.replaceAll('\\', '/')}`, import.meta.url), 'utf8');
      for (const m of text.matchAll(/kind: '([a-z-]+)'/g)) if (m[1]) recorded.add(m[1]);
    }
    // Told by buildTimeline's own branches or the polite-phrase count, used only by whatIKnow,
    // or never told at all.
    const toldOtherwise = new Set([
      'disclose', 'death', 'tidied', 'surprise', 'kindly-asked', 'kindly-obeyed', 'asked-help',
      'plea-opener', 'shelter', 'step', 'attempt', 'refused', 'not-in-hand', 'on-screen', 'printed-again',
      'flower-exposed', 'paid-with-data', 'mail-sent', 'perch',
      'tilt', 'screw', 'chain', 'book', 'calendar', 'mail', 'incomplete', 'hint', 'fill', 'done',
      'table', 'held', 'raised', 'falling', 'mirror',
    ]);
    const once = new Set(ONCE_KINDS);
    for (const kind of recorded) expect(once.has(kind) || toldOtherwise.has(kind), `"${kind}" has no line on the timeline`).toBe(true);
    // And no line waits for a kind nothing records any more.
    for (const kind of ONCE_KINDS) expect(recorded, kind).toContain(kind);
  });
});

describe('buildReveal', () => {
  it('shows what was disclosed and names each trick once, in order', () => {
    let now = 0;
    const witness = new Witness(() => now);
    witness.disclose('welcome', 'rapport', 'name', 'Tester');
    witness.record({ scene: 'welcome', kind: 'step', trick: 'foot-in-the-door' });
    witness.disclose('welcome', 'security-question', 'assistantKind', 'kočka');
    witness.record({ scene: 'welcome', kind: 'step', trick: 'foot-in-the-door' });
    witness.record({ scene: 'welcome', kind: 'window-button', data: { button: 'close' } });
    witness.tally('click', 7);
    now = 42_400;

    const model = buildReveal(witness);

    expect(model.disclosed).toEqual([
      { label: 'Jméno', value: 'Tester' },
      { label: 'Komu věříš', value: 'kočka' },
    ]);
    expect(model.tricks.map((t) => [t.id, t.evidence])).toEqual([
      ['rapport', 1],
      ['foot-in-the-door', 2],
      ['security-question', 1],
    ]);
    expect(model.tricks[0]?.name).toBe(TRICKS.rapport.name);
    expect(model.stats).toEqual({ seconds: 42, clicks: 7, windowButtons: 1, vigilance: 0, bugWarnings: 0 });
  });

  it('counts the e-mail given for the certificate as paying with data, too', () => {
    const witness = new Witness(() => 0);
    // What the prize scene records when the player hands over their address.
    witness.disclose('prize', 'real-email', 'email', 'tester@example.cz');
    witness.record({ scene: 'prize', kind: 'paid-with-data', trick: 'data-as-currency', data: { field: 'email' } });
    const model = buildReveal(witness);
    expect(model.tricks.map((t) => t.id)).toEqual(['real-email', 'data-as-currency']);
    expect(model.tricks[1]?.name).toBe(TRICKS['data-as-currency'].name);
    expect(model.disclosed).toEqual([{ label: 'E-mail', value: 'tester@example.cz' }]);
  });

  it('adds a line about this player to the tricks that have one', () => {
    const witness = new Witness(() => 0);
    witness.record({ scene: 'fidgets', kind: 'tidied', trick: 'sunk-cost', data: { round: 2, ms: 900 } });
    witness.record({ scene: 'fidgets', kind: 'tidied', trick: 'sunk-cost', data: { round: 4, ms: 700 } });
    witness.record({
      scene: 'fidgets',
      kind: 'consent',
      trick: 'blind-consent',
      data: { words: 140, ms: 6400, egg: false },
    });
    witness.record({ scene: 'fidgets', kind: 'vigilance', data: { what: 'contract-word' } });

    const model = buildReveal(witness);
    const detail = (id: string) => model.tricks.find((t) => t.id === id)?.detail;

    expect(detail('sunk-cost')).toBe('Srovnáno celkem 4×, pokaždé znovu od začátku.');
    expect(detail('blind-consent')).toBe(
      'Dokument měl 140 slov, na přečtení je potřeba asi 40 s. Souhlas padl za 6 s.',
    );
    expect(model.stats.vigilance).toBe(1);
  });

  it('counts the chests from what they paid and says how the golden one was paid for', () => {
    const witness = new Witness(() => 0);
    for (const [n, reward] of [[1, 50], [2, 120], [3, 5]] as const) {
      witness.record({ scene: 'chest', kind: 'chest-open', trick: n < 3 ? 'small-win' : 'variable-reward', data: { n, reward } });
    }
    const detail = () => buildReveal(witness).tricks.find((t) => t.id === 'variable-reward')?.detail;
    expect(detail()).toBe('Otevřel jsi 3× truhličku: 50, 120, 5 bodů.');
    witness.record({ scene: 'chest', kind: 'gold-open', trick: 'variable-reward', data: { by: 'card' } });
    expect(detail()).toMatch(/kameru/);
  });

  it('counts the lamp presses, unless PAL lit them', () => {
    const witness = new Witness(() => 0);
    witness.record({ scene: 'fidgets', kind: 'conditioned', trick: 'conditioning', data: { clicks: 14, resets: 1, ms: 9000 } });
    const detail = () => buildReveal(witness).tricks.find((t) => t.id === 'conditioning')?.detail;
    expect(detail()).toBe('Na světýlka jsi klikl 14× a 1× začal znovu. Nikdo Ti neřekl proč.');
    witness.record({ scene: 'fidgets', kind: 'asked-help' });
    expect(detail()).toBeUndefined();
  });

  it('counts the refusals and the drownings behind the guilt trip', () => {
    const witness = new Witness(() => 0);
    witness.record({ scene: 'rescue', kind: 'attempt', trick: 'guilt-trip', data: { deaths: 0 } });
    const detail = () => buildReveal(witness).tricks.find((t) => t.id === 'guilt-trip')?.detail;
    expect(detail()).toBeUndefined();
    witness.record({ scene: 'rescue', kind: 'saved', trick: 'guilt-trip', data: { deaths: 2 } });
    expect(detail()).toMatch(/^Utopil jsem se Ti 2×/);
    witness.record({ scene: 'desk', kind: 'gave-in', trick: 'guilt-trip', data: { refusals: 1 } });
    expect(detail()).toMatch(/^Počet ne, než z toho bylo ano: 1. Utopil/);
  });

  it('reminds the player of the role they picked', () => {
    const witness = new Witness(() => 0);
    witness.disclose('welcome', 'role-casting', 'role', 'Vlk samotář');
    const model = buildReveal(witness);
    expect(model.disclosed).toEqual([{ label: 'Kým jsi', value: 'Vlk samotář' }]);
    expect(model.tricks.find((t) => t.id === 'role-casting')?.detail).toContain('Vlk samotář');
    expect(buildTimeline(witness.events)[0]?.text).toContain('Vlk samotář');
  });

  it('notices when the player questioned the flower, and counts the button presses', () => {
    const witness = new Witness(() => 0);
    witness.record({ scene: 'flower', kind: 'flower-thanks', trick: 'knows-too-much' });
    for (let n = 1; n <= 5; n++) witness.record({ scene: 'dontclick', kind: 'forbidden-press', trick: 'reactance', data: { n } });
    witness.record({ scene: 'dontclick', kind: 'guard-off', trick: 'us-vs-them', data: { presses: 5 } });
    witness.record({ scene: 'paint', kind: 'filled', trick: 'irreversible', data: { tool: 'brush', ms: 4200 } });
    const detail = (id: string) => buildReveal(witness).tricks.find((t) => t.id === id)?.detail;

    expect(detail('knows-too-much')).toMatch(/Nepřišlo Ti divné/);
    expect(detail('reactance')).toBe('Sáhl jsi 5×, i když na něm stálo, ať to neděláš.');
    expect(detail('us-vs-them')).toBe('Brouk ho 4× pověsil zpátky. Ty jsi ho shodil 5×.');
    expect(detail('irreversible')).toMatch(/za 4 s/);

    witness.record({ scene: 'flower', kind: 'vigilance', data: { what: 'flower-knew' } });
    expect(detail('knows-too-much')).toMatch(/zeptal ses/);
  });

  it('lists every hidden inconsistency, marking the ones the player caught', () => {
    const witness = new Witness(() => 0);
    witness.record({ scene: 'welcome', kind: 'vigilance', data: { what: 'title-flicker' } });
    witness.record({ scene: 'desk', kind: 'vigilance', data: { what: 'refused-surprise' } });
    const { anomalies, stats } = buildReveal(witness);
    expect(anomalies.length).toBeGreaterThanOrEqual(6);
    expect(anomalies.filter((a) => a.found).map((a) => a.id).sort()).toEqual(['refused-surprise', 'title-flicker']);
    expect(stats.vigilance).toBe(2);
  });

  it('skips trick ids that are not in the catalog', () => {
    const witness = new Witness();
    witness.record({ scene: 'x', kind: 'step', trick: 'not-a-real-trick' });
    expect(buildReveal(witness).tricks).toEqual([]);
  });

  it('is empty for a player who did nothing', () => {
    const model = buildReveal(new Witness(() => 0));
    expect(model.disclosed).toEqual([]);
    expect(model.tricks).toEqual([]);
  });
});

describe('the polite phrase', () => {
  it('counts how often PAL said it and how often the player obeyed, once per request', () => {
    let now = 0;
    const w = new Witness(() => now);
    kindlyAsked(w, 'welcome');
    kindlyObeyed(w, 'welcome');
    kindlyObeyed(w, 'welcome'); // a second "yes" to the same request does not count
    kindlyObeyed(w, 'chest'); // obeyed without being asked: not counted
    kindlyAsked(w, 'plea');
    now = 125_000;
    kindlyAsked(w, 'download');
    kindlyObeyed(w, 'download');
    expect(kindlyCount(w.events)).toEqual({ asked: 3, obeyed: 2 });
    const last = buildTimeline(w.events).at(-1);
    expect(last).toEqual({ time: '02:05', text: KINDLY_LINE(3, 2) });
    expect(last?.text).toContain(KINDLY);
    expect(last?.text).toContain('3×');
    expect(last?.text).toContain('2×');
  });

  it('says nothing when PAL never used it', () => {
    const w = new Witness(() => 0);
    w.record({ scene: 'mailbox', kind: 'opened-mail' });
    expect(buildTimeline(w.events).some((l) => l.text.includes(KINDLY))).toBe(false);
  });
});

describe('the golden chest', () => {
  it('names the pick from the golden chest and what it cost', () => {
    const w = new Witness(() => 0);
    w.record({ scene: 'chest', kind: 'gold-open', trick: 'variable-reward', data: { by: 'card' } });
    w.record({ scene: 'chest', kind: 'gold-choice', data: { pick: 'xp' } });
    w.disclose('chest', 'security-question', 'teacher', 'Nováková', { pick: 'xp' });
    const texts = buildTimeline(w.events).map((l) => l.text);
    expect(texts.some((t) => t.includes('zkušenost'))).toBe(true);
    expect(texts.some((t) => t.includes('Nováková') && t.includes('učitelky'))).toBe(true);
    expect(buildReveal(w).disclosed).toContainEqual({ label: 'První paní učitelka', value: 'Nováková' });
  });

  it('says gold when gold was picked', () => {
    const w = new Witness(() => 0);
    w.record({ scene: 'chest', kind: 'gold-choice', data: { pick: 'gold' } });
    w.disclose('chest', 'security-question', 'pet', 'Rex', { pick: 'gold' });
    const texts = buildTimeline(w.events).map((l) => l.text);
    expect(texts.some((t) => t.includes('zlaťáky'))).toBe(true);
    expect(texts.some((t) => t.includes('Rex') && t.includes('mazlíčka'))).toBe(true);
  });
});
