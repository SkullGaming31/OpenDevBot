// Jest setup: ensure logger mocks are used and prevent noisy output
// Prefer manual mock under `src/__mocks__/util/logger.ts` and ensure jest picks it up
jest.mock('./src/util/logger');
import logger from './src/util/logger';

// Suppress Mongoose's Jest mock-timers warning in test environments. Mongoose
// prints a noisy warning when Jest's fake timers are enabled; setting this
// env var silences it. If you'd rather address the root cause, consider
// calling `jest.useRealTimers()` in tests that interact with Mongoose.
process.env.SUPPRESS_JEST_WARNINGS = 'true';

// If logger is a manual mock (src/__mocks__/util/logger.ts), its functions are jest.fn()
if (logger) {
	// Reset mock call counts before each test
	beforeEach(() => {
		if ((logger as any).info?.mockReset) (logger as any).info.mockReset();
		if ((logger as any).warn?.mockReset) (logger as any).warn.mockReset();
		if ((logger as any).error?.mockReset) (logger as any).error.mockReset();
		if ((logger as any).debug?.mockReset) (logger as any).debug.mockReset();
	});
}

// Ensure we forward mocked logger calls to console on every test run.
// Tests commonly call `jest.resetModules()` in their own beforeEach which clears
// the module cache; forwarding must therefore be applied inside our beforeEach
// so the freshly-created mock gets the forwarding implementation.

// By default we do not globally silence console output so tests that spy on
// console.* receive calls. If you want to silence console output set
// DISABLE_TEST_CONSOLE_SILENCE=0 in the environment and implement per-test
// silencing.

// Clear prom-client metrics and mongoose models between test runs to avoid
// duplicate metric registration and OverwriteModelError when tests re-import
// model files.
beforeEach(() => {
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const prom = require('prom-client');
		if (prom && prom.register && typeof prom.register.clear === 'function') {
			prom.register.clear();
		}
	} catch (e) {
		// ignore if prom-client not present in this test
	}

	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const mongoose = require('mongoose');
		if (mongoose && mongoose.models) {
			mongoose.models = {};
			mongoose.modelSchemas = {};
		}
	} catch (e) {
		// ignore if mongoose not available
	}

	// Forward logger mock calls to console so tests that spy on console.* see
	// messages produced by logger.info/warn/error/debug in the code under test.
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const mockedLogger = require('./src/util/logger').default;
		if (mockedLogger) {
			try {
				if (mockedLogger.info && typeof mockedLogger.info.mockImplementation === 'function') {
					mockedLogger.info.mockImplementation((...args: any[]) => console.log(...args));
				}
				if (mockedLogger.warn && typeof mockedLogger.warn.mockImplementation === 'function') {
					mockedLogger.warn.mockImplementation((...args: any[]) => console.warn(...args));
				}
				if (mockedLogger.error && typeof mockedLogger.error.mockImplementation === 'function') {
					mockedLogger.error.mockImplementation((...args: any[]) => console.error(...args));
				}
				if (mockedLogger.debug && typeof mockedLogger.debug.mockImplementation === 'function') {
					mockedLogger.debug.mockImplementation((...args: any[]) => console.log(...args));
				}
			} catch (e) {
				// ignore if mockedLogger methods are not jest.fn()
			}
		}
	} catch (e) {
		// ignore when manual mock not present or require fails
	}
});