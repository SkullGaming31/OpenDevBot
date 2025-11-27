import { jest } from '@jest/globals';

describe('util/util helpers', () => {
	test('sleep resolves quickly and does not throw', async () => {
		const { sleep } = await import('../util/util');
		// call with 0 ms — should resolve immediately
		await expect(sleep(0)).resolves.toBeUndefined();
	});

	test('limiter is exported as middleware function', async () => {
		const mod = await import('../util/util');
		// express-rate-limit returns a middleware function
		expect(typeof mod.limiter === 'function' || typeof mod.limiter === 'object').toBe(true);
	});
});
