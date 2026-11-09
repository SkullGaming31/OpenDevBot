describe('EventSub reconnection logic', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	test('keeps the existing listener when Twurple reports a socket disconnect', async () => {
		jest.doMock('../src/util/constants', () => ({
			broadcasterInfo: [], moderatorIDs: [],
			PromoteWebhookID: '1', PromoteWebhookToken: 't',
			TwitchActivityWebhookID: '2', TwitchActivityWebhookToken: 't2',
		}));
		jest.doMock('../src/api/userApiClient', () => ({ getUserApi: jest.fn().mockResolvedValue({}) }));
		jest.doMock('../src/chat', () => ({ getExistingChatClient: jest.fn() }));
		const instances: MockEventSubWsListener[] = [];
		class MockEventSubWsListener {
			disconnect?: (userId: string, error?: Error) => void;
			start = jest.fn();
			stop = jest.fn();
			constructor() { instances.push(this); }
			onUserSocketDisconnect(cb: (userId: string, error?: Error) => void) { this.disconnect = cb; }
			onUserSocketConnect() {}
			onSubscriptionCreateSuccess() {}
			onSubscriptionCreateFailure() {}
			onSubscriptionDeleteSuccess() {}
			onSubscriptionDeleteFailure() {}
		}
		jest.doMock('@twurple/eventsub-ws', () => ({ EventSubWsListener: MockEventSubWsListener }));
		const { getEventSubs } = await import('../src/EventSubEvents');
		const listener = await getEventSubs();
		instances[0].disconnect?.('user-1', new Error('test disconnect'));
		expect(await getEventSubs()).toBe(listener);
		expect(instances).toHaveLength(1);
		expect(instances[0].stop).not.toHaveBeenCalled();
	});
});
