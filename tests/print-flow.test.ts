import { describe, expect, it } from 'vitest';
import { PrintFlow, REFUSALS_BEFORE_WAY_OUT, type PrintAction } from '../src/scenes/desk/model.ts';

function run(flow: PrintFlow, ...actions: PrintAction[]): PrintFlow {
  for (const action of actions) flow.dispatch(action);
  return flow;
}

describe('PrintFlow', () => {
  it('goes straight through when the player agrees and the page comes out', () => {
    const flow = run(new PrintFlow(), 'ok', 'printed', 'came-out');
    expect(flow.state).toBe('happy');
    expect(flow.prints).toBe(1);
    expect(flow.refusals).toBe(0);
  });

  it('does not take no for an answer: a refusal leads back to the same question', () => {
    const flow = run(new PrintFlow(), 'cancel');
    expect(flow.state).toBe('sad');
    expect(flow.refusals).toBe(1);
    expect(flow.wayOut).toBe(false);
    expect(() => flow.dispatch('no-printer')).toThrow();
    expect(flow.dispatch('again')).toBe('ask');
  });

  it('offers a way out only after three refusals', () => {
    const flow = new PrintFlow();
    for (let i = 1; i <= REFUSALS_BEFORE_WAY_OUT; i++) {
      flow.dispatch('cancel');
      expect(flow.wayOut).toBe(i >= REFUSALS_BEFORE_WAY_OUT);
      if (i < REFUSALS_BEFORE_WAY_OUT) flow.dispatch('again');
    }
    run(flow, 'no-printer', 'seen');
    expect(flow.state).toBe('happy');
    expect(flow.prints).toBe(0);
  });

  it('lets a failed print be retried or shown on screen instead', () => {
    const retried = run(new PrintFlow(), 'ok', 'printed', 'did-not', 'again', 'printed', 'came-out');
    expect(retried.state).toBe('happy');
    expect(retried.prints).toBe(2);

    const shown = run(new PrintFlow(), 'ok', 'printed', 'did-not', 'show', 'seen');
    expect(shown.state).toBe('happy');
    expect(shown.prints).toBe(1);
  });

  it('rejects actions that make no sense in the current state', () => {
    const flow = new PrintFlow();
    expect(() => flow.dispatch('printed')).toThrow(/while "ask"/);
    run(flow, 'ok');
    expect(() => flow.dispatch('ok')).toThrow(/while "printing"/);
    run(flow, 'printed', 'came-out');
    expect(() => flow.dispatch('again')).toThrow(/while "happy"/);
    expect(flow.refusals).toBe(0);
  });
});
