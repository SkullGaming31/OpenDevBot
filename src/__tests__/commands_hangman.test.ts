jest.doMock('../auth/authProvider', () => ({ getChatAuthProvider: jest.fn() }));
jest.doMock('../database/models/tokenModel', () => ({ TokenModel: {} }));

describe('hangman command', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	test('start, letter guess and full-word guess win', async () => {
		const sayMock = jest.fn().mockResolvedValue(undefined);
		jest.doMock('../chat', () => ({ getChatClient: jest.fn().mockResolvedValue({ say: sayMock }) }));

		// Force deterministic word selection (first word in array)
		jest.spyOn(Math, 'random').mockReturnValue(0);

		const cmd: any = await import('../Commands/Fun/hangman');
		const chat = await import('../chat');
		await (chat as any).getChatClient();

		const msg: any = { channelId: 'chan1', userInfo: { userId: 'u1', userName: 'tester' } };

		// Start the hangman game
		await cmd.default.execute('chan', 'tester', [], '', msg);
		expect(sayMock).toHaveBeenCalledWith('chan', expect.stringContaining('Hangman started'));

		// Guess a letter known to be in the first word (first word in WORDS array is 'javascript')
		await cmd.default.execute('chan', 'tester', ['j'], '', msg);
		expect(sayMock).toHaveBeenCalled();

		// Guess the full word (should win)
		await cmd.default.execute('chan', 'tester', ['javascript'], '', msg);
		expect(sayMock).toHaveBeenCalledWith('chan', expect.stringContaining('guessed the word'));

		(Math.random as jest.MockedFunction<typeof Math.random>).mockRestore();
	});
});
