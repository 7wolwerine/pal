import { describe, expect, it } from 'vitest';
import { TRICKS } from '../src/content/tricks.ts';
import { Witness } from '../src/core/witness.ts';
import { buildReveal, buildTimeline } from '../src/scenes/reveal-model.ts';

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
    witness.record({ scene: 'paint', kind: 'filled', trick: 'irreversible', data: { tool: 'bucket', ms: 4200 } });
    const detail = (id: string) => buildReveal(witness).tricks.find((t) => t.id === id)?.detail;

    expect(detail('knows-too-much')).toMatch(/Nepřišlo ti divné/);
    expect(detail('reactance')).toBe('Klikl jsi 5×, i když tě tlačítko prosilo, ať to neděláš.');
    expect(detail('us-vs-them')).toBe('Brouk ho 4× pověsil zpátky. Ty jsi ho shodil 5×.');
    expect(detail('irreversible')).toMatch(/za 4 s/);

    witness.record({ scene: 'flower', kind: 'vigilance', data: { what: 'flower-knew' } });
    expect(detail('knows-too-much')).toMatch(/zeptal ses/);
  });

  it('lists every hidden inconsistency, marking the ones the player caught', () => {
    const witness = new Witness(() => 0);
    witness.record({ scene: 'welcome', kind: 'vigilance', data: { what: 'title-flicker' } });
    witness.record({ scene: 'popup', kind: 'vigilance', data: { what: 'inverted-popup' } });
    const { anomalies, stats } = buildReveal(witness);
    expect(anomalies.length).toBeGreaterThanOrEqual(8);
    expect(anomalies.filter((a) => a.found).map((a) => a.id).sort()).toEqual(['inverted-popup', 'title-flicker']);
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
