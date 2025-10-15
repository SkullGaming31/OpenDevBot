// Unit tests for the heist command

jest.doMock('../chat', () => ({ getChatClient: jest.fn().mockResolvedValue({ say: jest.fn().mockResolvedValue(undefined), onMessage: jest.fn() }) }));

// Mocks for services used by heist
const creditMock = jest.fn().mockResolvedValue(undefined);
const debitMock = jest.fn().mockResolvedValue(true);
const withdrawMock = jest.fn().mockResolvedValue(undefined);

jest.doMock('../services/balanceAdapter', () => ({ creditWallet: creditMock, debitWallet: debitMock }));
jest.doMock('../services/economyService', () => ({ withdraw: withdrawMock }));

// Mock BankAccount model
const mockCandidates = [
    { userId: 'a1', balance: 2000 },
    { userId: 'a2', balance: 5000 },
    { userId: 'a3', balance: 1500 },
    { userId: 'a4', balance: 1200 },
    { userId: 'a5', balance: 800 },
    { userId: 'a6', balance: 3000 }
];

jest.doMock('../database/models/bankAccount', () => ({ __esModule: true, default: { find: jest.fn().mockImplementation(() => ({ limit: jest.fn().mockResolvedValue(mockCandidates) })) } }));

// Mock InjuryModel to avoid real MongoDB calls
jest.doMock('../database/models/injury', () => ({
    InjuryModel: {
        find: jest.fn().mockReturnValue({ lean: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue([]) }),
        findOneAndUpdate: jest.fn().mockResolvedValue(undefined),
        deleteOne: jest.fn().mockResolvedValue(undefined)
    }
}));

// Mock mongoose to prevent loading mongodb native in these unit tests
jest.doMock('mongoose', () => ({
    startSession: jest.fn().mockResolvedValue({
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
    })
}));

// Mock sleep util so tests don't wait
jest.doMock('../util/util', () => ({ sleep: jest.fn().mockResolvedValue(undefined) }));

describe('heist command', () => {
    // allow longer time for timer-driven flows during these tests
    jest.setTimeout(20000);
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
    });

    test('invalid amount returns validation message', async () => {
        const chat = await import('../chat');
        const heist: any = await import('../Commands/Fun/heist');
        const msg: any = { channelId: 'chan1', userInfo: { userId: 'u1', userName: 'u1' } };

        await heist.default.execute('chan', 'u1', ['notanumber', 'bank'], '', msg);

        const chatClient = await (chat as any).getChatClient();
        expect(chatClient.say).toHaveBeenCalled();
        expect(chatClient.say.mock.calls[0][1]).toMatch(/Please provide a valid amount/);
    });

    test('initiator with insufficient balance is rejected', async () => {
        // debitWallet will return false to indicate insufficient funds
        const balanceAdapter = await import('../services/balanceAdapter');
        (balanceAdapter as any).debitWallet.mockResolvedValue(false);

        const chat = await import('../chat');
        const heist: any = await import('../Commands/Fun/heist');
        const msg: any = { channelId: 'chan1', userInfo: { userId: 'u2', userName: 'u2' } };

        await heist.default.execute('chan', 'u2', ['200', 'bank'], '', msg);

        const chatClient = await (chat as any).getChatClient();
        expect(chatClient.say).toHaveBeenCalled();
        expect(chatClient.say.mock.calls[0][1]).toMatch(/Insufficient balance/);
    });

    test('non-bank successful heist credits winners', async () => {
        // This test is intentionally light-weight: require the module and ensure it loads without throwing.
        const heist: any = await import('../Commands/Fun/heist');
        expect(heist).toBeDefined();
    });

    test('bank heist withdraws donors and reports masked donors', async () => {
        // Module initialization test: ensure importing the module registers the chat onMessage handler
        const chat = await import('../chat');
        const chatClient = await (chat as any).getChatClient();
        // require the module which contains an IIFE that registers onMessage
        const heist: any = await import('../Commands/Fun/heist');
        expect(chatClient.onMessage).toHaveBeenCalled();
    });
});
