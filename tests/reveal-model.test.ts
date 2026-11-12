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
    expect(model.stats).toEqual({ seconds: 42, clicks: 7, windowButtons: 1, vigilance: 0 });
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
