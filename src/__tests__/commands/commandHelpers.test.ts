import { parseCommandText, getCooldownRemaining, checkCommandPermission, isUserEditor } from '../../util/commandHelpers';
import { Command } from '../../interfaces/Command';

describe('commandHelpers', () => {
	test('parseCommandText parses command and args', () => {
		const res = parseCommandText('!help arg1 arg2');
		expect(res.commandName).toBe('help');
		expect(res.args).toEqual(['arg1', 'arg2']);
	});

	test('parseCommandText handles bare bang', () => {
		const res = parseCommandText('!');
		// implementation returns empty string for commandName and empty args array
		expect(res.commandName).toBe('');
		expect(res.args).toEqual([]);
	});

	test('getCooldownRemaining returns correct seconds', () => {
		const now = Date.now();
		expect(getCooldownRemaining(undefined, 5000, now)).toBe(0);
		// already expired
		expect(getCooldownRemaining(now - 10000, 5000, now)).toBe(0);
		// 1.5s left -> ceil -> 2
		const last = now - (5000 - 1500);
		expect(getCooldownRemaining(last, 5000, now)).toBe(2);
	});

	test('checkCommandPermission enforces moderator and devOnly rules', () => {
		const modCommand = { moderator: true } as unknown as Command;
		expect(checkCommandPermission(modCommand, false, false, false).allowed).toBe(false);
		expect(checkCommandPermission(modCommand, true, false, false).allowed).toBe(true);

		const devCommand = { devOnly: true } as unknown as Command;
		// not on special channel and not staff
		const res1 = checkCommandPermission(devCommand, false, false, false, '123');
		expect(res1.allowed).toBe(false);
		expect(res1.reason).toBe('devOnly');

		// on special channel should be allowed even if not staff
		const res2 = checkCommandPermission(devCommand, false, false, false, '1155035316');
		expect(res2.allowed).toBe(true);
	});

	test('isUserEditor recognizes editors and handles non-array', () => {
		const editors = [{ userId: 'u1' }, { userId: 'u2' }];
		expect(isUserEditor(editors, 'u2')).toBe(true);
		expect(isUserEditor(editors, 'missing')).toBe(false);
		expect(isUserEditor(null as any, 'u1')).toBe(false);
	});
});
