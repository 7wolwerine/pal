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

  it('ignores a scene that finishes twice or after it was left', () => {
    const log: Log = [];
    const [a, b, end] = [scene('a'), scene('b'), scene('reveal', true)];
    const director = new Director([a, b, end], log);
    director.start();
    const staleFinish = a.finish;
    staleFinish();
    staleFinish();
    expect(director.currentId).toBe('b');
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
    const director = new Director([scene('a'), scene('reveal', true)], log);
    director.jumpTo('reveal');
    expect(director.currentId).toBe('reveal');
    expect(() => director.jumpTo('nope')).toThrow(/Unknown scene/);
  });
});
