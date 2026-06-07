describe('logger level behavior', () => {
  const originalEnv = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Ensure these tests exercise the real logger implementation
    jest.unmock('../../util/logger');
  });
  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  test('info not printed when LOG_LEVEL=warn', () => {
    process.env.LOG_LEVEL = 'warn';
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
    const logger = require('../../util/logger').default;
    logger.info('should not print');
    expect(consoleLogSpy).not.toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  test('debug printed when LOG_LEVEL=debug', () => {
    process.env.LOG_LEVEL = 'debug';
    const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => { });
    const logger = require('../../util/logger').default;
    logger.debug('should print');
    expect(consoleDebugSpy).toHaveBeenCalled();
    consoleDebugSpy.mockRestore();
  });
});
