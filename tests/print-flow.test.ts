import { describe, expect, it } from 'vitest';
import { DESK } from '../src/content/intro.ts';
import { Heist, MISSES_BEFORE_SCREEN, REFUSALS_BEFORE_WAY_OUT, SurpriseFlow, TunePlayer, type SurpriseAction } from '../src/scenes/desk/model.ts';

function run(flow: SurpriseFlow, ...actions: SurpriseAction[]): SurpriseFlow {
  for (const action of actions) flow.dispatch(action);
  return flow;
}

describe('SurpriseFlow on a computer', () => {
  it('prints, asks whether it came out, and goes on once it is in the hand', () => {
    const flow = new SurpriseFlow();
    expect(flow.dispatch('ok')).toBe('printing');
    expect(flow.dispatch('printed')).toBe('check');
    expect(flow.dispatch('in-hand')).toBe('done');
    expect(flow.opened).toBe(true);
    expect(flow.onPaper).toBe(true);
    expect(flow.prints).toBe(1);
    expect(flow.notInHand).toBe(0);
    expect(flow.refusals).toBe(0);
  });

  it('does not take no for an answer: a refusal leads back to the same question', () => {
    const flow = run(new SurpriseFlow(), 'cancel');
    expect(flow.state).toBe('sad');
    expect(flow.refusals).toBe(1);
    expect(flow.wayOut).toBe(false);
    expect(() => flow.dispatch('later')).toThrow();
    expect(flow.dispatch('again')).toBe('ask');
  });

  it('offers a way out only after three refusals, and then nothing was opened', () => {
    const flow = new SurpriseFlow();
    for (let i = 1; i <= REFUSALS_BEFORE_WAY_OUT; i++) {
      flow.dispatch('cancel');
      expect(flow.wayOut).toBe(i >= REFUSALS_BEFORE_WAY_OUT);
      if (i < REFUSALS_BEFORE_WAY_OUT) flow.dispatch('again');
    }
    flow.dispatch('later');
    expect(flow.state).toBe('done');
    expect(flow.opened).toBe(false);
    expect(flow.prints).toBe(0);
  });

  it('counts giving in after a refusal as opening it', () => {
    const flow = run(new SurpriseFlow(), 'cancel', 'again', 'ok');
    expect(flow.state).toBe('printing');
    expect(flow.opened).toBe(true);
    expect(flow.refusals).toBe(1);
  });

  it('pushes after every "nothing came out" and prints again', () => {
    const flow = run(new SurpriseFlow(), 'ok', 'printed', 'not-in-hand');
    expect(flow.state).toBe('push');
    expect(flow.notInHand).toBe(1);
    expect(flow.dispatch('reprint')).toBe('printing');
    expect(flow.prints).toBe(2);
    run(flow, 'printed', 'in-hand');
    expect(flow.state).toBe('done');
    expect(flow.onPaper).toBe(true);
  });

  it('offers the screen only from the second "nothing came out" on', () => {
    const flow = run(new SurpriseFlow(), 'ok', 'printed', 'not-in-hand');
    expect(flow.screenOffered).toBe(false);
    expect(() => flow.dispatch('on-screen')).toThrow();
    run(flow, 'reprint', 'printed', 'not-in-hand');
    expect(flow.notInHand).toBe(MISSES_BEFORE_SCREEN);
    expect(flow.screenOffered).toBe(true);
    expect(flow.dispatch('on-screen')).toBe('screen');
    expect(flow.dispatch('seen')).toBe('done');
    expect(flow.onPaper).toBe(false);
    expect(flow.opened).toBe(true);
    expect(flow.prints).toBe(2);
  });

  it('has a different push for at least the first four misses', () => {
    expect(new Set(DESK.push.lines).size).toBeGreaterThanOrEqual(4);
  });

  it('refuses actions that make no sense in the current state', () => {
    const flow = new SurpriseFlow();
    expect(() => flow.dispatch('seen')).toThrow();
    expect(() => flow.dispatch('printed')).toThrow();
    run(flow, 'ok', 'printed', 'in-hand');
    expect(() => flow.dispatch('ok')).toThrow();
  });
});

describe('SurpriseFlow on a phone or tablet', () => {
  it('shows only the picture: no printing, no code', () => {
    const flow = new SurpriseFlow({ handheld: true });
    expect(flow.dispatch('ok')).toBe('picture');
    expect(() => flow.dispatch('printed')).toThrow();
    expect(flow.dispatch('seen')).toBe('done');
    expect(flow.opened).toBe(true);
    expect(flow.prints).toBe(0);
    expect(flow.onPaper).toBe(false);
  });
});

describe('TunePlayer', () => {
  it('plays the tune one note per call, round and round', () => {
    const player = new TunePlayer([60, 62, 64]);
    expect([player.next(), player.next(), player.next(), player.next()]).toEqual([60, 62, 64, 60]);
    expect(player.played).toBe(4);
  });
});

describe('Heist', () => {
  it('gets the drive a tug further each time and never past the limit', () => {
    const heist = new Heist(100, 107, 3);
    expect(heist.pull()).toBe(103);
    expect(heist.stuck).toBe(false);
    expect(heist.pull()).toBe(106);
    expect(heist.pull()).toBe(107);
    expect(heist.stuck).toBe(true);
    expect(heist.pull()).toBe(107);
    expect(heist.tugs).toBe(4);
  });

  it('is stuck from the start when there is nowhere to pull it', () => {
    expect(new Heist(120, 110, 3).stuck).toBe(true);
  });
});
