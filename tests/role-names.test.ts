import { describe, expect, it } from 'vitest';
import { ROLES, ROLE_NAMES, roleForName, type RoleId } from '../src/content/roles.ts';
import { lean, strongestRole, type Profile } from '../src/game.ts';

describe('role names', () => {
  it('offers one distinct ready-made name for every role', () => {
    const roles = Object.keys(ROLES) as RoleId[];
    expect(Object.keys(ROLE_NAMES).sort()).toEqual([...roles].sort());
    expect(new Set(Object.values(ROLE_NAMES)).size).toBe(roles.length);
  });

  it('finds the role of a picked or typed name, in any case and with spaces', () => {
    for (const role of Object.keys(ROLE_NAMES) as RoleId[]) {
      expect(roleForName(ROLE_NAMES[role])).toBe(role);
      expect(roleForName(`  ${ROLE_NAMES[role].toUpperCase()} `)).toBe(role);
    }
    expect(roleForName('Micka')).toBeUndefined();
    expect(roleForName('')).toBeUndefined();
  });

  it('a picked name leans the profile towards its role', () => {
    const profile: Profile = { role: 'helper' };
    lean(profile, 'helper', 2);
    const named = roleForName(ROLE_NAMES.fixer);
    if (named) lean(profile, named);
    expect(profile.tendency).toEqual({ helper: 2, fixer: 1 });
    expect(strongestRole(profile)).toBe('helper');
  });
});
