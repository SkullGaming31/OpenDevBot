import { jest } from '@jest/globals';

describe('roulette command', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	test('denies non-staff users', async () => {
		const say = jest.fn();
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));

		// Prevent loading heavy util/constants which imports DB models
		jest.doMock('../util/constants', () => ({ broadcasterInfo: [{ id: 'broadcaster' }] }));

		const getUserApi = {
			channels: { getChannelInfoById: (jest.fn() as any).mockResolvedValue({ id: 'broadcaster' } as any) },
			moderation: { getModerators: (jest.fn() as any).mockResolvedValue({ data: [] } as any) }
		};
		jest.doMock('../api/userApiClient', () => ({ getUserApi: async () => getUserApi }));

		// Prevent DB model loading
		jest.doMock('../database/models/roulette', () => ({ findOne: jest.fn() }));
		// Prevent loading real balanceAdapter (it pulls in DB models)
		jest.doMock('../services/balanceAdapter', () => ({ creditWallet: (jest.fn() as any) }));

		const cmd = await import('../Commands/Fun/roulette');
		const msg = { userInfo: { userId: 'user1', displayName: 'UserOne', userName: 'user1' } } as any;
		await cmd.default.execute('#chan', 'user1', [], '!roulette', msg);

		expect(say).toHaveBeenCalled();
		expect(String(say.mock.calls[0][1])).toMatch(/do not have permission/);
	});

	test('loses when bullet in chamber (non-mod)', async () => {
		const say = jest.fn();
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));

		// Prevent loading heavy util/constants which imports DB models
		jest.doMock('../util/constants', () => ({ broadcasterInfo: [{ id: 'broadcaster' }] }));

		const getUserApi = {
			channels: { getChannelInfoById: (jest.fn() as any).mockResolvedValue({ id: 'broadcaster' } as any) },
			moderation: { getModerators: (jest.fn() as any).mockResolvedValue({ data: [{ userId: 'mod1' }] } as any), banUser: (jest.fn() as any) }
		};
		jest.doMock('../api/userApiClient', () => ({ getUserApi: async () => getUserApi }));

		// Mock ChamberStateModel: return an existing state with bullets=1
		const save = (jest.fn() as any).mockResolvedValue(undefined as any);
		jest.doMock('../database/models/roulette', () => ({
			findOne: (jest.fn() as any).mockResolvedValue({ bullets: 1, save } as any)
		}));
		// Prevent loading real balanceAdapter (it pulls in DB models)
		jest.doMock('../services/balanceAdapter', () => ({ creditWallet: (jest.fn() as any) }));

		// randomInt: first call (randomPosition) -> 1 (bullet), subsequent calls not used in this path
		jest.doMock('node:crypto', () => ({ randomInt: jest.fn().mockReturnValue(1) }));

		const cmd = await import('../Commands/Fun/roulette');
		const msg = { userInfo: { userId: 'mod1', displayName: 'ModOne', userName: 'mod1', isBroadcaster: false, isMod: false }, channelId: 'chan' } as any;
		await cmd.default.execute('#chan', 'mod1', [], '!roulette', msg);

		expect(say).toHaveBeenCalled();
		// message for failure path
		const text = String(say.mock.calls[0][1]);
		expect(/YOU FAILED|has been Timed Out|lost at roulette/i.test(text)).toBeTruthy();
		expect(save).toHaveBeenCalled();
	});

	test('wins and gets credited when no bullet', async () => {
		const say = jest.fn();
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));

		// Prevent loading heavy util/constants which imports DB models
		jest.doMock('../util/constants', () => ({ broadcasterInfo: [{ id: 'broadcaster' }] }));

		const getUserApi = {
			channels: { getChannelInfoById: (jest.fn() as any).mockResolvedValue({ id: 'broadcaster' } as any) },
			moderation: { getModerators: (jest.fn() as any).mockResolvedValue({ data: [{ userId: 'mod2' }] } as any) }
		};
		jest.doMock('../api/userApiClient', () => ({ getUserApi: async () => getUserApi }));

		// Chamber state with bullets=1
		const save = (jest.fn() as any).mockResolvedValue(undefined as any);
		jest.doMock('../database/models/roulette', () => ({
			findOne: (jest.fn() as any).mockResolvedValue({ bullets: 1, save } as any)
		}));

		// randomInt sequence: first call -> 2 (no bullet), second call -> reward amount e.g., 1000
		const cryptoMock = { randomInt: jest.fn().mockImplementationOnce(() => 2).mockImplementationOnce(() => 1000) } as any;
		jest.doMock('node:crypto', () => cryptoMock);

		const credit = (jest.fn() as any).mockResolvedValue(undefined as any);
		// ensure the module is mocked before importing the command
		jest.doMock('../services/balanceAdapter', () => ({ creditWallet: credit }));

		const cmd = await import('../Commands/Fun/roulette');
		const msg = { userInfo: { userId: 'mod2', displayName: 'ModTwo', userName: 'mod2', isBroadcaster: false, isMod: true }, channelId: 'chan' } as any;
		await cmd.default.execute('#chan', 'mod2', [], '!roulette', msg);

		expect(say).toHaveBeenCalled();
		const found = say.mock.calls.find((c: any[]) => /survived/.test(String(c[1])));
		expect(found).toBeDefined();
		const called = String(found ? found[1] : '');
		expect(called).toContain('survived');
		expect(credit).toHaveBeenCalledWith('mod2', 1000, 'mod2', 'chan');
		expect(save).toHaveBeenCalled();
	});
});
