import { checkDropAllowed, requireDropAllowed } from '../../scripts/safety';

describe('safety.checkDropAllowed', () => {
  test('allows in development environment', () => {
    expect(checkDropAllowed(['node'], { NODE_ENV: 'development' } as any)).toBe(true);
  });

  test('allows with --confirm flag', () => {
    expect(checkDropAllowed(['node', '--confirm'], {} as any)).toBe(true);
  });

  test('allows with CONFIRM_DROP env', () => {
    expect(checkDropAllowed([], { CONFIRM_DROP: '1' } as any)).toBe(true);
  });

  test('disallows otherwise', () => {
    expect(checkDropAllowed([], {} as any)).toBe(false);
  });

  test('requireDropAllowed throws when not allowed', () => {
    expect(() => requireDropAllowed([], {} as any)).toThrow(/Refusing to drop/);
  });
});
