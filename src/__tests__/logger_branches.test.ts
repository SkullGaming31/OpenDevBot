import { jest } from '@jest/globals';

describe('logger branches and fallbacks', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	test('error handles circular objects and writes a fallback string to file', async () => {
		jest.doMock('../util/env', () => ({ ENVIRONMENT: 'dev' }));
		const fs = await import('fs');
		const appendMock = jest.spyOn(fs.promises, 'appendFile').mockResolvedValue(undefined);
		const consoleErr = jest.spyOn(console, 'error').mockImplementation(() => { /* noop */ });

		// Ensure we import the real logger implementation, not a manual mock
		jest.unmock('../util/logger');
		const logger = await import('../util/logger');

		const a: any = { foo: 'bar' };
		a.self = a; // circular

		logger.error(a);

		// wait for the microtask where appendFile is called
		await new Promise((r) => setImmediate(r));

		expect(appendMock).toHaveBeenCalled();
		const data = appendMock.mock.calls[0][1] as string;
		// JSON.stringify would throw for circular structures; formatForLog should fall back to String(a)
		expect(data).toContain('[object Object]');
		// initial console.error for visibility should have been called
		expect(consoleErr).toHaveBeenCalled();

		appendMock.mockRestore();
		consoleErr.mockRestore();
	});

	test('error appendFile rejection logs fallback to console.error', async () => {
		jest.doMock('../util/env', () => ({ ENVIRONMENT: 'dev' }));
		const fs = await import('fs');
		const err = new Error('disk full');
		const appendMock = jest.spyOn(fs.promises, 'appendFile').mockRejectedValue(err);
		const consoleErr = jest.spyOn(console, 'error').mockImplementation(() => { /* noop */ });

		// Ensure we import the real logger implementation, not a manual mock
		jest.unmock('../util/logger');
		const logger = await import('../util/logger');

		logger.error('boom');
		await new Promise((r) => setImmediate(r));

		// should have attempted to append and then logged the append failure
		expect(appendMock).toHaveBeenCalled();
		expect(consoleErr).toHaveBeenCalledWith('logger: failed to write to error log file', err);

		appendMock.mockRestore();
		consoleErr.mockRestore();
	});

	test('time/timeEnd fallback when hrtime unavailable uses Date.now()', async () => {
		jest.doMock('../util/env', () => ({ ENVIRONMENT: 'dev' }));
		// make hrtime.bigint throw to force fallback
		const originalHrtime = (process as any).hrtime;
		(process as any).hrtime = { bigint: () => { throw new Error('no hr'); } };

		// control Date.now
		let now = 1_000_000;
		const dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);

		const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => { /* noop */ });

		// Ensure we import the real logger implementation, not a manual mock
		jest.unmock('../util/logger');
		const logger = await import('../util/logger');

		// start timer (will store BigInt(Date.now()))
		logger.time('t1');
		// advance time
		now += 123;
		logger.timeEnd('t1');

		// info uses console.log and should have been called with timer message
		expect(consoleLog).toHaveBeenCalled();
		const calledWith = consoleLog.mock.calls.find((c: any[]) => c.some((v: any) => String(v).includes('(timer) t1')));
		expect(calledWith).toBeTruthy();

		// restore
		(process as any).hrtime = originalHrtime;
		dateSpy.mockRestore();
		consoleLog.mockRestore();
	});

	test('timeEnd unknown label warns', async () => {
		jest.doMock('../util/env', () => ({ ENVIRONMENT: 'dev' }));
		const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => { /* noop */ });
		// Ensure we import the real logger implementation, not a manual mock
		jest.unmock('../util/logger');
		const logger = await import('../util/logger');

		logger.timeEnd('nope');
		expect(consoleWarn).toHaveBeenCalled();
		const called = consoleWarn.mock.calls[0][0] as string;
		expect(String(called)).toContain('[warn]');

		consoleWarn.mockRestore();
	});
});
