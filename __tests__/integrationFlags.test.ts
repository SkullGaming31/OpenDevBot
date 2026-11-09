import { isIntegrationEnabled } from '../src/util/integrationFlags';
import logger from '../src/util/logger';

describe('integration flags', () => {
	const original = process.env.ENABLE_CHAT;

	afterEach(() => {
		if (original === undefined) delete process.env.ENABLE_CHAT;
		else process.env.ENABLE_CHAT = original;
	});

	it.each([['true', true], [' TRUE ', true], ['false', false], ['', false]])(
		'parses %j as %s',
		(value, expected) => {
			process.env.ENABLE_CHAT = value;
			expect(isIntegrationEnabled('ENABLE_CHAT')).toBe(expected);
		},
	);

	it('disables absent and invalid values and warns for invalid values', () => {
		delete process.env.ENABLE_CHAT;
		expect(isIntegrationEnabled('ENABLE_CHAT')).toBe(false);
		process.env.ENABLE_CHAT = 'yes';
		expect(isIntegrationEnabled('ENABLE_CHAT')).toBe(false);
		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('ENABLE_CHAT'));
	});
});
