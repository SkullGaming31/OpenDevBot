import battleroyale from '../Commands/Fun/battleroyale';
import * as chat from '../chat';
import { ChatClient } from '@twurple/chat/lib';

jest.mock('../chat');
jest.mock('../services/balanceAdapter');

describe('battleroyale command (basic)', () => {
  let mockChat: Partial<ChatClient>;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.ENVIRONMENT = 'dev';
    mockChat = {
      say: jest.fn().mockResolvedValue(undefined),
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
  }, 20000);
});
