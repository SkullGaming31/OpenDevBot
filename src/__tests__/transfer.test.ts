import balanceAdapter from '../services/balanceAdapter';
import transferCommand from '../Commands/Fun/transfer';

jest.mock('../services/balanceAdapter');
jest.mock('../chat', () => ({ getChatClient: jest.fn().mockResolvedValue({ say: jest.fn() }) }));
jest.mock('../api/userApiClient', () => ({ getUserApi: jest.fn().mockResolvedValue({ users: { getUserByName: jest.fn().mockResolvedValue({}) } }) }));

jest.setTimeout(10000);

describe('transfer command (unit)', () => {
    beforeEach(() => jest.clearAllMocks());

    test('calls balanceAdapter.transfer with parsed args', async () => {
        const mockTransfer = jest.spyOn(balanceAdapter, 'transfer').mockResolvedValue({} as any);

        const channel = '#test';
        const user = 'sender';
        const args = ['@recipient', '50'];
        const text = '!transfer @recipient 50';
        const msg: any = { userInfo: { userId: '123', userName: 'sender' }, channelId: '1' };

        await transferCommand.execute(channel, user, args, text, msg);

        expect(mockTransfer).toHaveBeenCalledWith('sender', 'recipient', 50);
    });
});
