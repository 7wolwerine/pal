import { describe, expect, it } from 'vitest';
import { splitTitle } from '../src/ui/certificate.ts';

describe('certificate title', () => {
  it('splits a long title near its middle', () => {
    expect(splitTitle('Nejvěrnější přítel umělé inteligence')).toEqual(['Nejvěrnější přítel', 'umělé inteligence']);
    expect(splitTitle('Profík')).toEqual(['Profík', '']);
  });
});
