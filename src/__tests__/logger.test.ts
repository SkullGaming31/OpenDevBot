import { jest } from '@jest/globals';

describe('logger', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	test('info, warn and error write to console and error appends to file', async () => {
		// ensure dev env so debug/info behave predictably
		process.env.ENVIRONMENT = 'dev';

		// spy console methods
		const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
		const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

		// mock fs.promises.appendFile to avoid disk IO
		const fs = await import('fs');
		const appendSpy = jest.spyOn(fs.promises, 'appendFile' as any).mockResolvedValue(undefined as any);

		jest.unmock('../util/logger');
		const logger = (await import('../util/logger')).default;

		logger.info('hello', { a: 1 });
		expect(logSpy).toHaveBeenCalled();
		expect(logSpy.mock.calls[0][0]).toBe('[info]');

		logger.warn('be careful');
		expect(warnSpy).toHaveBeenCalled();
		expect(warnSpy.mock.calls[0][0]).toBe('[warn]');

		const err = new Error('boom');
		logger.error(err, 'extra');
		// console.error should be called synchronously
		expect(errorSpy).toHaveBeenCalled();
		// appendFile should have been scheduled
		expect(appendSpy).toHaveBeenCalled();

		// restore spies
		logSpy.mockRestore();
		warnSpy.mockRestore();
		errorSpy.mockRestore();
		appendSpy.mockRestore();
	});

	test('debug only logs when environment is dev', async () => {
		process.env.ENVIRONMENT = 'dev';
		jest.resetModules();
		const debugSpyDev = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
		jest.unmock('../util/logger');
		const loggerDev = (await import('../util/logger')) as any;
		loggerDev.debug('x');
		expect(debugSpyDev).toHaveBeenCalled();
		debugSpyDev.mockRestore();

		// in prod debug should be silent
		process.env.ENVIRONMENT = 'prod';
		jest.resetModules();
		const debugSpyProd = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
		jest.unmock('../util/logger');
		const loggerProd = (await import('../util/logger')) as any;
		loggerProd.debug('x');
		expect(debugSpyProd).not.toHaveBeenCalled();
		debugSpyProd.mockRestore();
	});

	test('time and timeEnd record and log elapsed time', async () => {
		process.env.ENVIRONMENT = 'dev';
		jest.resetModules();
		const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
		jest.unmock('../util/logger');
		const logger = (await import('../util/logger')).default;

		logger.time('t1');
		// small delay to ensure non-zero elapsed when possible
		await new Promise((r) => setTimeout(r, 1));
		logger.timeEnd('t1');

		// info logs via console.log in timeEnd
		expect(logSpy).toHaveBeenCalled();
		const found = logSpy.mock.calls.some(call => call.map((c: any) => String(c)).join(' ').includes('(timer)') || call.map((c: any) => String(c)).join(' ').includes('timer'));
		expect(found).toBe(true);
		logSpy.mockRestore();
	});

	test('time/timeEnd falls back when hrtime.bigint is unavailable', async () => {
		process.env.ENVIRONMENT = 'dev';
		jest.resetModules();

		// temporarily make hrtime.bigint throw to exercise the fallback path
		const origHr = (process as any).hrtime;
		try {
			(process as any).hrtime = { bigint: () => { throw new Error('no-hr'); } };

			const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
			jest.unmock('../util/logger');
			const logger = (await import('../util/logger')).default;

			logger.time('fallbackTimer');
			// small delay
			await new Promise((r) => setTimeout(r, 1));
			logger.timeEnd('fallbackTimer');

			expect(logSpy).toHaveBeenCalled();
			const found = logSpy.mock.calls.some(call => call.map((c: any) => String(c)).join(' ').includes('(timer)'));
			expect(found).toBe(true);
			logSpy.mockRestore();
		} finally {
			(process as any).hrtime = origHr;
		}
	});

	test('timeEnd warns for unknown label', async () => {
		process.env.ENVIRONMENT = 'dev';
		jest.resetModules();
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
		jest.unmock('../util/logger');
		const logger = (await import('../util/logger')) as any;
		logger.timeEnd('nope');
		expect(warnSpy).toHaveBeenCalled();
		const calledWith = warnSpy.mock.calls[0][1];
		expect(String(calledWith)).toContain('timeEnd called for unknown label');
		warnSpy.mockRestore();
	});

	test('error handles appendFile rejection and falls back for circular objects', async () => {
		process.env.ENVIRONMENT = 'dev';
		jest.resetModules();

		const fs = await import('fs');
		const appendSpy = jest.spyOn(fs.promises, 'appendFile' as any).mockRejectedValue(new Error('disk-fail'));

		const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

		jest.unmock('../util/logger');
		const logger = (await import('../util/logger')) as any;

		// create a circular object to force JSON.stringify to throw inside formatForLog
		const a: any = {};
		a.self = a;

		logger.error(a, 'extra');

		// wait for the appendFile promise rejection handler to run
		await new Promise((r) => setImmediate(r));

		// initial console.error call for the error log entry
		expect(errorSpy).toHaveBeenCalled();

		// appendFile should have been attempted and rejected
		expect(appendSpy).toHaveBeenCalled();
		const msg = appendSpy.mock.calls[0][1] as string;
		expect(msg).toEqual(expect.any(String));
		// because stringify will fail, formatForLog falls back to String(a) which should include '[object Object]'
		expect(msg).toContain('[object Object]');

		// the rejection handler should log a secondary error about failing to write file
		const foundFallback = errorSpy.mock.calls.some(c => String(c[0]).includes('logger: failed to write to error log file'));
		expect(foundFallback).toBe(true);

		appendSpy.mockRestore();
		errorSpy.mockRestore();
	});
});
