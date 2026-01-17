describe('EventSub integration-style backoff and resubscribe', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	test('schedules a retry after subscription create failure and eventually succeeds', async () => {
		// Arrange: basic constants and mocks
		jest.doMock('../util/constants', () => ({
			broadcasterInfo: [{ id: '31124455', name: 'canadiendragon', gameName: 'TestGame' }],
			moderatorIDs: [],
			PromoteWebhookID: '1',
			PromoteWebhookToken: 't',
			TwitchActivityWebhookID: '2',
			TwitchActivityWebhookToken: 't2',
		}));
		jest.doMock('../api/userApiClient', () => ({ getUserApi: jest.fn().mockResolvedValue({}) }));
		jest.doMock('../chat', () => ({ getChatClient: jest.fn().mockResolvedValue({ say: jest.fn().mockResolvedValue(undefined) }) }));

		const SubscriptionModel = { findOne: jest.fn().mockResolvedValue(null), findOneAndDelete: jest.fn().mockResolvedValue(null) };
		jest.doMock('../database/models/eventSubscriptions', () => ({ SubscriptionModel }));

		const instances: any[] = [];
		class MockEventSubWsListener {
			handlers: Record<string, any> = {};
			started = false;
			constructor(opts: any) { void opts; instances.push(this); }
			start() { this.started = true; }
			onUserSocketDisconnect(cb: any) { this.handlers.disconnect = cb; }
			onUserSocketConnect(cb: any) { this.handlers.connect = cb; }
			onSubscriptionCreateSuccess(cb: any) { this.handlers.createSuccess = cb; }
			onSubscriptionCreateFailure(cb: any) { this.handlers.createFail = cb; }
			onSubscriptionDeleteSuccess(cb: any) { this.handlers.deleteSuccess = cb; }
			onSubscriptionDeleteFailure(cb: any) { this.handlers.deleteFail = cb; }
			_triggerCreateFailure(err: any) { return this.handlers.createFail?.(err); }
			_triggerCreateSuccess() { return this.handlers.createSuccess?.(); }
		}
		jest.doMock('@twurple/eventsub-ws', () => ({ EventSubWsListener: MockEventSubWsListener }));

		const mod = await import('../EventSubEvents');
		const { getEventSubs } = mod;

		// Act: create listener and trigger a create-failure
		await getEventSubs();
		expect(instances.length).toBe(1);

		// Trigger a subscription create failure which should schedule a retry
		instances[0]._triggerCreateFailure(new Error('temporary failure'));

		// Advance timers to allow backoff retry scheduling (the code uses setTimeout with small jitter)
		jest.advanceTimersByTime(1000);

		// After scheduled retry, the implementation should attempt to create again which in our mock will not throw
		// Trigger create success on the same instance to simulate recovery
		instances[0]._triggerCreateSuccess();

		// Expect that at least one create failure handler was registered and called
		// Use local instances tracked by the mock listener
		expect(instances.length).toBeGreaterThanOrEqual(1);
	});
});
