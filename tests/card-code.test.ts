import { describe, expect, it } from 'vitest';
import { isCardCode } from '../src/content/chest.ts';

describe('isCardCode', () => {
  it('accepts LOVE YOU in any case and spacing, and the number with or without YOU', () => {
    for (const ok of ['LOVE YOU', 'love you', ' Love   You ', '3701', '3701 you', '3107', '3107 YOU']) expect(isCardCode(ok)).toBe(true);
  });

  it('rejects anything else, LOVE on its own included', () => {
    for (const bad of ['', 'LOVE', 'love', '1234', 'love me', '31 07', 'YOU', 'LOVEYOU']) expect(isCardCode(bad)).toBe(false);
  });
});
