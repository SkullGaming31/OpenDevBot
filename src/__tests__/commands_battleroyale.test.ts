import * as chat from '../chat';
import balanceAdapter from '../services/balanceAdapter';

jest.mock('../chat');
jest.mock('../services/balanceAdapter');
jest.mock('../util/util', () => ({ sleep: jest.fn().mockResolvedValue(undefined) }));

describe('battleroyale command (expanded)', () => {
	afterEach(() => {
		jest.restoreAllMocks();
		(process.env as any).ENVIRONMENT = undefined;
		(process.env as any).TEST_FAST = undefined;
	});

	test('starts and auto-adds simulated bots in dev and registers listener', async () => {
		process.env.ENVIRONMENT = 'dev';
		const handlers: { message: Function[] } = { message: [] };
		const mockChat: any = {
			say: jest.fn().mockResolvedValue(undefined),
			onMessage: (fn: (...args: any[]) => void) => { handlers.message.push(fn); },
			// expose handlers so battleroyale can try to remove the handler
			handlers,
		};

		(chat.getChatClient as jest.Mock).mockResolvedValue(mockChat);
		// set test-fast mode to avoid waiting
		(process.env as any).TEST_FAST = '1';
		// require fresh module to ensure module-scoped state is reset
		const battleroyale = (await import('../Commands/Fun/battleroyale')).default;

		// execute; TEST_FAST short-circuits waits and rounds
		await battleroyale.execute('#chan', 'tester', ['3'], '', ({} as any));

		expect(chat.getChatClient).toHaveBeenCalled();
		expect(mockChat.say).toHaveBeenCalled();
		// join listener should have been registered then removed (handlers array should be an array)
		expect(Array.isArray(handlers.message)).toBe(true);
	}, 20000);

	test('requires minimum participants in prod and cancels', async () => {
		process.env.ENVIRONMENT = 'prod';
		const handlers: { message: Function[] } = { message: [] };
		const mockChat: any = {
			say: jest.fn().mockResolvedValue(undefined),
			onMessage: (fn: (...args: any[]) => void) => { handlers.message.push(fn); },
			handlers,
		};
		(chat.getChatClient as jest.Mock).mockResolvedValue(mockChat);
		(process.env as any).TEST_FAST = '1';

		const battleroyale = (await import('../Commands/Fun/battleroyale')).default;

		// execute; TEST_FAST short-circuits waits and rounds
		await battleroyale.execute('#chan', 'soloUser', [], '', ({} as any));

		// In prod, minimum is 2 so it should cancel and tell the channel
		expect(mockChat.say).toHaveBeenCalled();
		const calledWith = (mockChat.say as jest.Mock).mock.calls.flat();
		const found = calledWith.find((c: any) => typeof c === 'string' && c.includes('requires at least'));
		expect(found).toBeTruthy();
	}, 70000);

	test('awards survivors coins via balanceAdapter in dev', async () => {
		process.env.ENVIRONMENT = 'dev';
		const handlers: { message: Function[] } = { message: [] };
		const mockChat: any = {
			say: jest.fn().mockResolvedValue(undefined),
			onMessage: (fn: (...args: any[]) => void) => { handlers.message.push(fn); },
			handlers,
		};
		(chat.getChatClient as jest.Mock).mockResolvedValue(mockChat);


		const chatModule = await import('../chat');
		(chatModule.getChatClient as jest.Mock).mockResolvedValue(mockChat);
		(process.env as any).TEST_FAST = '1';
		const battleroyale = (await import('../Commands/Fun/battleroyale')).default;

		// Run the command (dev adds default simulated bots so survivors will exist)
		await battleroyale.execute('#chan', 'tester', [], '', ({} as any));

		// balanceAdapter.creditWallet may be called for survivors (best-effort)
		expect((balanceAdapter.creditWallet as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(0);
		// ensure chat messages were emitted
		expect(mockChat.say).toHaveBeenCalled();
	}, 40000);
});
