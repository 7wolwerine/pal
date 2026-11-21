import { describe, expect, it } from 'vitest';
import { Director, type Scene } from '../src/core/director.ts';

type Log = string[];

function scene(id: string, final = false): Scene<Log> & { finish: () => void } {
  const s = {
    id,
    final,
    finish: () => {},
    mount(log: Log, done: () => void) {
      log.push(`mount ${id}`);
      s.finish = done;
      return () => log.push(`cleanup ${id}`);
    },
  };
  return s;
}

describe('Director', () => {
  it('runs scenes in order and cleans up the previous one', () => {
    const log: Log = [];
    const [a, b, end] = [scene('a'), scene('b'), scene('reveal', true)];
    const director = new Director([a, b, end], log);
    director.start();
    a.finish();
    b.finish();
    expect(log).toEqual(['mount a', 'cleanup a', 'mount b', 'cleanup b', 'mount reveal']);
    expect(director.currentId).toBe('reveal');
  });

  it('refuses a scene list where the reveal is not last', () => {
    expect(() => new Director([scene('reveal', true), scene('a')], [])).toThrow(/last/);
  });

  it('refuses a scene list without exactly one reveal', () => {
    expect(() => new Director([scene('a'), scene('b')], [])).toThrow(/final/);
    expect(() => new Director([scene('x', true), scene('y', true)], [])).toThrow(/final/);
  });

  it('refuses duplicate ids and empty lists', () => {
    expect(() => new Director([scene('a'), scene('a', true)], [])).toThrow(/unique/);
    expect(() => new Director([], [])).toThrow(/at least one/);
  });

  it('ignores a scene that finishes twice', () => {
    const log: Log = [];
    const [a, b, end] = [scene('a'), scene('b'), scene('reveal', true)];
    const director = new Director([a, b, end], log);
    director.start();
    const finishA = a.finish;
    finishA();
    finishA();
    expect(director.currentId).toBe('b');
    expect(log).toEqual(['mount a', 'cleanup a', 'mount b']);
  });

  it('ignores a done() from an earlier run of the same scene', () => {
    const log: Log = [];
    const [a, b, end] = [scene('a'), scene('b'), scene('reveal', true)];
    const director = new Director([a, b, end], log);
    director.start();
    const oldFinish = a.finish;
    director.jumpTo('reveal');
    director.jumpTo('a');
    oldFinish();
    expect(director.currentId).toBe('a');
    // The new run's own done() still works.
    a.finish();
    expect(director.currentId).toBe('b');
  });

  it('cleans up exactly once when a scene finishes inside mount', () => {
    const log: Log = [];
    const eager: Scene<Log> = {
      id: 'eager',
      mount(l, done) {
        l.push('mount eager');
        done();
        return () => l.push('cleanup eager');
      },
    };
    const [b, end] = [scene('b'), scene('reveal', true)];
    const director = new Director([eager, b, end], log);
    director.start();
    expect(director.currentId).toBe('b');
    expect(log).toEqual(['mount eager', 'mount b', 'cleanup eager']);
    // b's cleanup was kept, not overwritten by eager's.
    director.jumpTo('reveal');
    expect(log).toEqual(['mount eager', 'mount b', 'cleanup eager', 'cleanup b', 'mount reveal']);
  });

  it('ignores a done() the old scene calls from its own cleanup', () => {
    const log: Log = [];
    const [b, end] = [scene('b'), scene('reveal', true)];
    const a: Scene<Log> = {
      id: 'a',
      mount(l, done) {
        l.push('mount a');
        return () => {
          l.push('cleanup a');
          done();
        };
      },
    };
    const director = new Director([a, b, end], log);
    director.start();
    director.jumpTo('reveal');
    expect(director.currentId).toBe('reveal');
    expect(log).toEqual(['mount a', 'cleanup a', 'mount reveal']);
  });

  it('finishing the final scene leaves it running until a jump tears it down', () => {
    const log: Log = [];
    const [a, end] = [scene('a'), scene('reveal', true)];
    const director = new Director([a, end], log);
    director.start();
    a.finish();
    end.finish();
    end.finish();
    expect(director.currentId).toBe('reveal');
    expect(log).toEqual(['mount a', 'cleanup a', 'mount reveal']);
    director.jumpTo('a');
    expect(log).toEqual(['mount a', 'cleanup a', 'mount reveal', 'cleanup reveal', 'mount a']);
  });

  it('stays on the reveal when the reveal reports done', () => {
    const log: Log = [];
    const end = scene('reveal', true);
    const director = new Director([end], log);
    director.start();
    end.finish();
    expect(director.currentId).toBe('reveal');
    expect(log).toEqual(['mount reveal']);
  });

  it('can jump to a scene by id and rejects unknown ids', () => {
    const log: Log = [];
    const entered: string[] = [];
    const director = new Director([scene('a'), scene('reveal', true)], log, (s) => entered.push(s.id));
    director.start();
    director.jumpTo('reveal');
    expect(director.currentId).toBe('reveal');
    expect(log).toEqual(['mount a', 'cleanup a', 'mount reveal']);
    expect(entered).toEqual(['a', 'reveal']);
    expect(() => director.jumpTo('nope')).toThrow(/Unknown scene/);
  });
});
