// Jest setup: ensure logger mocks are used and prevent noisy output
// Prefer manual mock under `src/__mocks__/util/logger.ts` and ensure jest picks it up
jest.mock('./src/util/logger');
import logger from './src/util/logger';

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

// Optionally silence console as well during tests. Set DISABLE_TEST_CONSOLE_SILENCE=1 to keep console output.
if (!process.env.DISABLE_TEST_CONSOLE_SILENCE) {
    beforeAll(() => {
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'info').mockImplementation(() => { });
        jest.spyOn(console, 'warn').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterAll(() => {
        // restore console mocks
        // @ts-ignore
        logger.info.mockRestore?.();
        // @ts-ignore
        logger.info.mockRestore?.();
        // @ts-ignore
        logger.warn.mockRestore?.();
        // @ts-ignore
        logger.error.mockRestore?.();
    });
}
