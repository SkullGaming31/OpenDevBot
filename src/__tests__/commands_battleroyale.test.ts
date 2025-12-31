import battleroyale from '../Commands/Fun/battleroyale';
import * as chat from '../chat';

jest.mock('../chat');
jest.mock('../services/balanceAdapter');
jest.mock('../util/util', () => ({ sleep: jest.fn().mockResolvedValue(undefined) }));

describe('battleroyale command (basic)', () => {
  let mockChat: any;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.ENVIRONMENT = 'dev';
    const handlers: { message: Function[] } = { message: [] };
    mockChat = {
      say: jest.fn().mockResolvedValue(undefined),
      onMessage: (fn: (...args: any[]) => void) => { handlers.message.push(fn); },
      // expose handlers shape so battleroyale can remove the handler in tests
      handlers,
    };
    (chat.getChatClient as jest.Mock).mockResolvedValue(mockChat);
    // keep randomness as-is for this lightweight smoke test
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('starts and auto-adds simulated bots in dev', async () => {
    const channel = '#testchannel';
    const user = 'tester';
    // call with arg '3' to request 3 simulated bots
    await battleroyale.execute(channel, user, ['3'], '', ({} as any));
    expect(chat.getChatClient).toHaveBeenCalled();
    expect(mockChat.say).toHaveBeenCalled();
  }, 60000);
});
