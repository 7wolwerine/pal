import { describe, expect, it } from 'vitest';
import { Witness } from '../src/core/witness.ts';

function fakeClock() {
  let now = 1000;
  return { clock: () => now, advance: (ms: number) => (now += ms) };
}

describe('Witness', () => {
  it('numbers events and stamps them relative to the session start', () => {
    const { clock, advance } = fakeClock();
    const witness = new Witness(clock);
    advance(250);
    const first = witness.record({ scene: 'a', kind: 'step' });
    advance(750);
    const second = witness.record({ scene: 'a', kind: 'step' });
    expect([first.seq, first.t]).toEqual([0, 250]);
    expect([second.seq, second.t]).toEqual([1, 1000]);
    expect(witness.elapsed).toBe(1000);
  });

  it('is append-only: recorded events cannot be changed from outside', () => {
    const witness = new Witness();
    const data = { field: 'name', value: 'Tester' };
    const event = witness.record({ scene: 'welcome', kind: 'disclose', trick: 'rapport', data });
    data.value = 'tampered';
    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event.data)).toBe(true);
    expect(() => ((event as { kind: string }).kind = 'x')).toThrow();
    (witness.events as unknown[]).length = 0;
    expect(witness.events).toHaveLength(1);
    expect(witness.disclosed().get('name')).toBe('Tester');
  });

  it('keeps the latest value per disclosed field, in order of first disclosure', () => {
    const witness = new Witness();
    witness.disclose('welcome', 'rapport', 'name', 'V');
    witness.disclose('welcome', 'osint', 'assistantName', 'Micka');
    witness.disclose('welcome', 'rapport', 'name', 'Tester');
    expect([...witness.disclosed()]).toEqual([
      ['name', 'Tester'],
      ['assistantName', 'Micka'],
    ]);
  });

  it('lists tricks in the order they first worked and returns their evidence', () => {
    const witness = new Witness();
    witness.record({ scene: 'a', kind: 'step', trick: 'foot-in-the-door' });
    witness.record({ scene: 'a', kind: 'noise' });
    witness.record({ scene: 'a', kind: 'disclose', trick: 'rapport' });
    witness.record({ scene: 'b', kind: 'step', trick: 'foot-in-the-door' });
    expect(witness.tricksUsed()).toEqual(['foot-in-the-door', 'rapport']);
    expect(witness.evidenceFor('foot-in-the-door').map((e) => e.seq)).toEqual([0, 3]);
  });

  it('tallies without storing events', () => {
    const witness = new Witness();
    witness.tally('click');
    witness.tally('click', 2);
    expect(witness.count('click')).toBe(3);
    expect(witness.count('nothing')).toBe(0);
    expect(witness.events).toHaveLength(0);
  });
});
