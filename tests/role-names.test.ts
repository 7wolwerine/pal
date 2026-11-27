import { describe, expect, it } from 'vitest';
import { ASSISTANT_NAMES, ROLES, namesFor, roleForName, type RoleId } from '../src/content/roles.ts';
import { ASSISTANT_KINDS } from '../src/content/welcome.ts';
import { lean, strongestRole, type Profile } from '../src/game.ts';

const ROLE_IDS = Object.keys(ROLES) as RoleId[];
const every = Object.values(ASSISTANT_NAMES).flatMap((names) => Object.values(names));

describe('the assistant’s ready-made names', () => {
  it('offers one name per role for every look the player can pick, and for PAL itself', () => {
    for (const kind of ASSISTANT_KINDS) expect(Object.keys(ASSISTANT_NAMES), kind.id).toContain(kind.id);
    expect(Object.keys(ASSISTANT_NAMES)).toContain('pal');
    for (const [look, names] of Object.entries(ASSISTANT_NAMES)) {
      expect(Object.keys(names).sort(), look).toEqual([...ROLE_IDS].sort());
      expect(new Set(Object.values(names)).size, look).toBe(ROLE_IDS.length);
    }
  });

  it('uses no name twice, so a typed name means exactly one role', () => {
    expect(new Set(every.map((n) => n.toLocaleLowerCase('cs'))).size).toBe(every.length);
  });

  it('falls back to PAL’s own names when no look was picked', () => {
    expect(namesFor(undefined)).toEqual(ASSISTANT_NAMES.pal);
    expect(namesFor('cat')).toEqual(ASSISTANT_NAMES.cat);
  });

  it('finds the role of a picked or typed name, in any case and with spaces', () => {
    for (const names of Object.values(ASSISTANT_NAMES)) {
      for (const role of ROLE_IDS) {
        expect(roleForName(names[role])).toBe(role);
        expect(roleForName(`  ${names[role].toUpperCase()} `)).toBe(role);
      }
    }
    expect(roleForName('Micka')).toBeUndefined();
    expect(roleForName('')).toBeUndefined();
  });

  it('a picked name leans the profile towards its role', () => {
    const profile: Profile = { role: 'helper' };
    lean(profile, 'helper', 2);
    const named = roleForName(ASSISTANT_NAMES.cat.fixer);
    if (named) lean(profile, named);
    expect(profile.tendency).toEqual({ helper: 2, fixer: 1 });
    expect(strongestRole(profile)).toBe('helper');
  });
});
