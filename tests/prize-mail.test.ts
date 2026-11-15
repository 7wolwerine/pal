import { describe, expect, it } from 'vitest';
import { gameAddress, prizeMailto } from '../src/content/prize.ts';

const facts = {
  name: 'Tereza',
  title: 'Záchranář roku',
  score: 1242,
  rank: 87,
  date: new Date(2026, 10, 15),
  url: 'https://example.test/pal/',
};

describe('the prize letter', () => {
  it('is a mailto link to the typed address', () => {
    const href = prizeMailto('tereza.novakova@seznam.cz', facts);
    expect(href.startsWith('mailto:tereza.novakova@seznam.cz?subject=')).toBe(true);
  });

  it('carries the certificate, a line from PAL and the game address, in Czech that survives encoding', () => {
    const url = new URL(prizeMailto('a@b.cz', facts));
    const subject = url.searchParams.get('subject') ?? '';
    const body = url.searchParams.get('body') ?? '';
    expect(subject).toContain('Záchranář roku');
    expect(body).toContain('Ahoj Tereza!');
    expect(body).toContain('uděluje se: Tereza');
    expect(body).toContain('Lepší než 87 % hráčů');
    expect(body).toContain('Tvůj PAL');
    expect(body).toContain('Hra: https://example.test/pal/');
    expect(body).toContain('\r\n');
  });

  it('cannot be bent by an address with extra fields in it', () => {
    const href = prizeMailto('a@b.cz?bcc=x@y.cz&subject=hi', facts);
    expect(href).not.toContain('bcc=');
    expect(href.split('?subject=')).toHaveLength(2);
  });

  it('takes the game address without the query or fragment', () => {
    expect(gameAddress({ protocol: 'https:', host: 'example.test', pathname: '/pal/index.html' })).toBe('https://example.test/pal/index.html');
  });
});
