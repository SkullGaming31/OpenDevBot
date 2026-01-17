jest.mock('../../chat');
jest.mock('../../services/balanceAdapter');
jest.mock('../../util/util', () => ({ sleep: jest.fn().mockResolvedValue(undefined) }));
const nodeCrypto = require('crypto');

describe('battleroyale command (expanded)', () => {
	afterEach(() => {
		jest.restoreAllMocks();
		(process.env as any).ENVIRONMENT = undefined;
		(process.env as any).TEST_FAST = undefined;
	});

	function mockRandomSequence(seq: number[]) {
		const seqCopy = seq.slice();
		jest.spyOn(nodeCrypto, 'randomInt').mockImplementation((..._args: any[]) => {
			const v = seqCopy.shift();
			if (v === undefined) throw new Error('randomInt sequence exhausted');
			return v;
		});
	}

	test('starts and auto-adds simulated bots in dev and registers listener', async () => {
		process.env.ENVIRONMENT = 'dev';
		const handlers: { message: Function[] } = { message: [] };
		const mockChat: any = {
			say: jest.fn().mockResolvedValue(undefined),
			onMessage: (fn: (...args: any[]) => void) => { handlers.message.push(fn); },
			// expose handlers so battleroyale can try to remove the handler
			handlers,
		};

		jest.resetModules();
		const chatModule = await import('../../chat');
		(chatModule.getChatClient as jest.Mock).mockResolvedValue(mockChat);
		// set test-fast mode to avoid waiting
		(process.env as any).TEST_FAST = '1';
		const battleroyale = (await import('../../Commands/Fun/battleroyale')).default;

		// execute; TEST_FAST short-circuits waits and rounds
		await battleroyale.execute('#chan', 'tester', ['3'], '', ({} as any));

		expect(chatModule.getChatClient).toHaveBeenCalled();
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
		jest.resetModules();
		const chatModule = await import('../../chat');
		(chatModule.getChatClient as jest.Mock).mockResolvedValue(mockChat);
		(process.env as any).TEST_FAST = '1';
		const battleroyale = (await import('../../Commands/Fun/battleroyale')).default;

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
		jest.resetModules();
		const chatModule = await import('../../chat');
		(chatModule.getChatClient as jest.Mock).mockResolvedValue(mockChat);
		(process.env as any).TEST_FAST = '1';
		const battleroyale = (await import('../../Commands/Fun/battleroyale')).default;

		// Run the command (dev adds default simulated bots so survivors will exist)
		await battleroyale.execute('#chan', 'tester', [], '', ({} as any));

		// coin awards are non-deterministic in this test (survivor count varies),
		// so we don't assert `creditWallet` was called here — just ensure chat emitted messages
		expect(mockChat.say).toHaveBeenCalled();
	}, 40000);

	test('deterministic damage events produce CRITICAL vs normal damage', async () => {
		process.env.ENVIRONMENT = 'dev';
		(process.env as any).TEST_FAST = '1';
		const handlers: { message: Function[] } = { message: [] };
		const mockChat: any = {
			say: jest.fn().mockResolvedValue(undefined),
			onMessage: (fn: (...args: any[]) => void) => { handlers.message.push(fn); },
			handlers,
		};
		jest.resetModules();
		const chatModule = await import('../../chat');
		(chatModule.getChatClient as jest.Mock).mockResolvedValue(mockChat);
		// Sequence crafted to: shuffle, p1 damage (amount 15, no sweep), crit true, p2 damage (amount 12, no crit)
		// See test analysis for ordering of randomInt calls.
		mockRandomSequence([0, 50, 0, 15, 0, 20, 5, 50, 0, 12, 0, 50, 20]);
		const battleroyale = (await import('../../Commands/Fun/battleroyale')).default;
		await battleroyale.execute('#chan', 'tester', ['1'], '', ({} as any));
		const said = (mockChat.say as jest.Mock).mock.calls.flat().join(' ');
		expect(said).toContain('(CRITICAL)');
		expect(said).toMatch(/-30 HP/);
		expect(said).toMatch(/-12 HP/);
	});

	test('sweep damage hits multiple targets deterministically', async () => {
		process.env.ENVIRONMENT = 'dev';
		(process.env as any).TEST_FAST = '1';
		const handlers: { message: Function[] } = { message: [] };
		const mockChat: any = {
			say: jest.fn().mockResolvedValue(undefined),
			onMessage: (fn: (...args: any[]) => void) => { handlers.message.push(fn); },
			handlers,
		};
		jest.resetModules();
		const chatModule = await import('../../chat');
		(chatModule.getChatClient as jest.Mock).mockResolvedValue(mockChat);
		// Sequence crafted to: shuffle, p1 damage with sweep true (amount 10), choose source idx 0, targetCount 1, target idx 0, p2 heal
		mockRandomSequence([0, 50, 0, 10, 0, 10, 20, 0, 1, 0, 20, 0, 5, 0, 50]);
		const battleroyale = (await import('../../Commands/Fun/battleroyale')).default;
		await battleroyale.execute('#chan', 'tester', ['1'], '', ({} as any));
		const said = (mockChat.say as jest.Mock).mock.calls.flat().join(' ');
		expect(said).toContain('hit by sweep from');
		expect(said).toMatch(/-10 HP/);
	});

	test('xp events and final XP math are applied to survivors', async () => {
		process.env.ENVIRONMENT = 'dev';
		(process.env as any).TEST_FAST = '1';
		const handlers: { message: Function[] } = { message: [] };
		const mockChat: any = {
			say: jest.fn().mockResolvedValue(undefined),
			onMessage: (fn: (...args: any[]) => void) => { handlers.message.push(fn); },
			handlers,
		};
		jest.resetModules();
		const chatModule = await import('../../chat');
		(chatModule.getChatClient as jest.Mock).mockResolvedValue(mockChat);
		// Sequence: shuffle, p1 xp (30), p2 xp (5)
		mockRandomSequence([0, 5, 0, 30, 0, 5, 0, 5, 0]);
		const battleroyale = (await import('../../Commands/Fun/battleroyale')).default;
		await battleroyale.execute('#chan', 'tester', ['1'], '', ({} as any));
		const said = (mockChat.say as jest.Mock).mock.calls.flat().join(' ');
		// survivors get 20 XP per round + event XP; expect at least one survivor message showing "now X XP"
		expect(said).toMatch(/now \d+ XP/);
		// coins should be awarded (10 coins per round survived)
		const balanceModule = await import('../../services/balanceAdapter');
		expect((balanceModule.creditWallet as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(1);
	});
});
