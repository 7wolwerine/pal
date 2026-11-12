import { describe, expect, it } from 'vitest';
import { isCardCode } from '../src/content/welcome.ts';

describe('isCardCode', () => {
  it('accepts what the AR bear’s sign shows, in any case and spacing', () => {
    for (const ok of ['3107', 'love', ' LOVE  YOU ', 'Love you', '3107 you']) expect(isCardCode(ok)).toBe(true);
  });

  it('rejects anything else', () => {
    for (const bad of ['', '1234', 'lov', 'love me', '31 07']) expect(isCardCode(bad)).toBe(false);
  });
});
