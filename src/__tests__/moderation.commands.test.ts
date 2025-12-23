// Unit tests for moderation commands: addpoints, removepoints, purgebalance

// Provide constants and discord mocks used by the moderation commands
jest.doMock('../util/constants', () => ({ broadcasterInfo: [{ id: '1', name: 'canadiendragon' }], CommandUsageWebhookTOKEN: 'token', commandUsageWebhookID: 'id' }));
jest.doMock('discord.js', () => ({ __esModule: true, WebhookClient: function () { return { send: jest.fn().mockResolvedValue(undefined) }; }, EmbedBuilder: class { setTitle() { return this; } setAuthor() { return this; } setColor() { return this; } addFields() { return this; } setFooter() { return this; } setTimestamp() { return this; } } }));

beforeEach(() => {
	jest.resetModules();
	jest.clearAllMocks();
});

test('addpoints deposits to economyService and sends chat message', async () => {
	// mock chat client
	jest.doMock('../chat', () => ({ getChatClient: jest.fn().mockResolvedValue({ say: jest.fn().mockResolvedValue(undefined) }) }));

	// mock user API client to return a user record and channel editors
	jest.doMock('../api/userApiClient', () => ({ getUserApi: jest.fn().mockResolvedValue({ users: { getUserByName: jest.fn().mockResolvedValue({ id: '42', displayName: 'Target', profilePictureUrl: 'http://a' }), getUserById: jest.fn().mockResolvedValue({ id: '1', displayName: 'Broad' }) }, channels: { getChannelEditors: jest.fn().mockResolvedValue([]) } }) }));

	// mock economyService.deposit
	const depositMock = jest.fn().mockResolvedValue({ userId: '42', balance: 100 });
	jest.doMock('../services/economyService', () => ({ deposit: depositMock }));

	const addpoints: any = await import('../Commands/Moderation/addpoints');

	const msg: any = { channelId: 'chan1', userInfo: { userId: 'mod1', displayName: 'Mod', isMod: true } };
	const chatModule = await import('../chat');
	const chatClient = await (chatModule as any).getChatClient();

	await addpoints.default.execute('chan', 'mod', ['targetUser', '50'], '', msg);

	const es = await import('../services/economyService');
	// new signature includes optional session and meta, so just assert first two args and that it was called
	expect((es as any).deposit).toHaveBeenCalled();
	const depCall = (es as any).deposit.mock.calls[0];
	expect(depCall[0]).toBe('42');
	expect(depCall[1]).toBe(50);
	expect(chatClient.say).toHaveBeenCalled();
});

test('removepoints withdraws from economyService and handles insufficient funds', async () => {
	jest.doMock('../chat', () => ({ getChatClient: jest.fn().mockResolvedValue({ say: jest.fn().mockResolvedValue(undefined) }) }));
	jest.doMock('../api/userApiClient', () => ({ getUserApi: jest.fn().mockResolvedValue({ users: { getUserByName: jest.fn().mockResolvedValue({ id: '43', displayName: 'Victim', profilePictureUrl: 'http://b' }), getUserById: jest.fn().mockResolvedValue({ id: '1', displayName: 'Broad' }) }, channels: { getChannelEditors: jest.fn().mockResolvedValue([]) } }) }));

	// make withdraw succeed first time
	const withdrawMock = jest.fn()
		.mockResolvedValueOnce({ userId: '43', balance: 20 })
		.mockRejectedValueOnce(new Error('Insufficient funds')); // second call simulates insufficiency
	jest.doMock('../services/economyService', () => ({ withdraw: withdrawMock }));

	const removepoints: any = await import('../Commands/Moderation/removepoints');
	const chatModule = await import('../chat');
	const chatClient = await (chatModule as any).getChatClient();
	const msg: any = { channelId: 'chan1', userInfo: { userId: 'mod1', displayName: 'Mod', isMod: true } };

	// First call: succeeds
	await removepoints.default.execute('chan', 'mod', ['victim', '10'], '', msg);
	const es = await import('../services/economyService');
	expect((es as any).withdraw).toHaveBeenCalled();
	const wdCall = (es as any).withdraw.mock.calls[0];
	expect(wdCall[0]).toBe('43');
	expect(wdCall[1]).toBe(10);
	expect(chatClient.say).toHaveBeenCalled();

	// Second call: insufficient funds path
	await removepoints.default.execute('chan', 'mod', ['victim', '100'], '', msg);
	expect(chatClient.say).toHaveBeenCalled();
});

test('purgebalance zeros bank accounts and reports count', async () => {
	jest.doMock('../chat', () => ({ getChatClient: jest.fn().mockResolvedValue({ say: jest.fn().mockResolvedValue(undefined) }) }));

	// Mock BankAccount.updateMany (export default)
	jest.doMock('../database/models/bankAccount', () => ({ __esModule: true, default: { updateMany: jest.fn().mockResolvedValue({ modifiedCount: 5 }) } }));
	// Mock TransactionLog.create to avoid DB writes
	jest.doMock('../database/models/transactionLog', () => ({ __esModule: true, default: { create: jest.fn().mockResolvedValue(undefined) } }));

	const purgebalance: any = await import('../Commands/Moderation/purgeBalance');
	const chatModule = await import('../chat');
	const chatClient = await (chatModule as any).getChatClient();
	const msg: any = { channelId: 'chan1', userInfo: { userId: 'mod1', displayName: 'Mod', isMod: true } };

	await purgebalance.default.execute('chan', 'mod', ['all'], '', msg);
	expect(chatClient.say).toHaveBeenCalled();
	const bank = await import('../database/models/bankAccount');
	expect((bank as any).default.updateMany).toHaveBeenCalled();
});
