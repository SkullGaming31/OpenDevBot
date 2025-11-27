import { jest } from '@jest/globals';

describe('util/env helpers', () => {
	const OLD = { ...process.env };
	afterEach(() => {
		jest.resetModules();
		process.env = { ...OLD };
	});

	test('reads process.env.Enviroment first', async () => {
		process.env.Enviroment = 'prod';
		(process.env as any).Env = undefined;
		(process.env as any).Environment = undefined;
		(process.env as any).NODE_ENV = undefined;
		const mod = await import('../util/env');
		expect(mod.default).toBe('prod');
		expect(mod.isProd()).toBe(true);
		expect(mod.isDev()).toBe(false);
	});

	test('falls back to Env then Environment then NODE_ENV then dev', async () => {
		// Env should be used if Enviroment not set
		(process.env as any).Enviroment = undefined;
		process.env.Env = 'debug';
		let mod = await import('../util/env');
		expect(mod.default).toBe('debug');
		expect(mod.isDebug()).toBe(true);
		jest.resetModules();
		(process.env as any).Env = undefined;
		process.env.Environment = 'dev';
		mod = await import('../util/env');
		expect(mod.default).toBe('dev');
		expect(mod.isDev()).toBe(true);

		jest.resetModules();
		(process.env as any).Environment = undefined;
		process.env.NODE_ENV = 'prod';
		mod = await import('../util/env');
		expect(mod.default).toBe('prod');
		expect(mod.isProd()).toBe(true);

		jest.resetModules();
		(process.env as any).NODE_ENV = undefined;
		mod = await import('../util/env');
		expect(mod.default).toBe('dev');
	});
});
