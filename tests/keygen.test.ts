import { describe, expect, it } from 'vitest';
import { Witness } from '../src/core/witness.ts';
import { EGGS } from '../src/content/keygen.ts';
import { serialFor } from '../src/ui/keygen.ts';

describe('serialFor', () => {
  it('looks like a keygen serial', () => {
    expect(serialFor([], 'Ty')).toMatch(/^PAL-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
  });

  it('is the same for the same game, and different for a different one', () => {
    const a = new Witness(() => 0);
    a.record({ scene: 'mailbox', kind: 'opened-mail' });
    const b = new Witness(() => 0);
    b.record({ scene: 'mailbox', kind: 'opened-mail' });
    b.record({ scene: 'desk', kind: 'plugged', trick: 'baiting' });
    expect(serialFor(a.events, 'Tester')).toBe(serialFor(a.events, 'Tester'));
    expect(serialFor(a.events, 'Tester')).not.toBe(serialFor(b.events, 'Tester'));
    expect(serialFor(a.events, 'Tester')).not.toBe(serialFor(a.events, 'Jiný'));
  });
});

describe('EGGS', () => {
  it('have unique ids', () => {
    expect(new Set(EGGS.map((e) => e.id)).size).toBe(EGGS.length);
  });
});
