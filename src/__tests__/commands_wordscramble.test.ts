jest.doMock('../auth/authProvider', () => ({ getChatAuthProvider: jest.fn() }));
jest.doMock('../database/models/tokenModel', () => ({ TokenModel: {} }));

describe('wordScramble command', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	test('start and correct guess', async () => {
		// Mock chat client
		const sayMock = jest.fn().mockResolvedValue(undefined);
		jest.doMock('../chat', () => ({ getChatClient: jest.fn().mockResolvedValue({ say: sayMock }) }));

		// Make random deterministic to pick a known word from the WORDS list
		jest.spyOn(Math, 'random').mockReturnValue(0);

		const cmd: any = await import('../Commands/Fun/wordScramble');

		const msg: any = { channelId: 'chan1', userInfo: { userId: 'u1', userName: 'tester', isMod: true } };
		const chat = await import('../chat');
		await (chat as any).getChatClient();

		// Start the scramble
		await cmd.default.execute('chan', 'tester', [], '', msg);
		expect(sayMock).toHaveBeenCalled();

		// Guess the answer (WORD[0] with Math.random=0 -> first word in list)
		const answer = 'astronaut'; // matches first entry in WORDS in original file
		await cmd.default.execute('chan', 'tester', [answer], '', msg);
		// Should announce the win
		expect(sayMock).toHaveBeenCalledWith('chan', expect.stringContaining('guessed it'));

		// Restore Math.random
		(Math.random as jest.MockedFunction<typeof Math.random>).mockRestore();
	});
});
