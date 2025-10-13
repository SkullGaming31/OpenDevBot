describe('EventSub reconnection logic', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
    });

    test('recreates listener on disconnect', async () => {
        // Mock util/constants to avoid Twurple initialization at import
        jest.doMock('../util/constants', () => ({
            broadcasterInfo: [{ id: '1155035316', name: 'skullgaminghq', gameName: 'TestGame' }],
            moderatorIDs: [],
            PromoteWebhookID: '1',
            PromoteWebhookToken: 't',
            TwitchActivityWebhookID: '2',
            TwitchActivityWebhookToken: 't2',
        }));

        // Mock API client helper
        jest.doMock('../api/userApiClient', () => ({ getUserApi: jest.fn().mockResolvedValue({}) }));

        // Mock chat client
        jest.doMock('../chat', () => ({ getChatClient: jest.fn().mockResolvedValue({ say: jest.fn().mockResolvedValue(undefined) }) }));

        // Mock SubscriptionModel to avoid DB access
        const SubscriptionModel = {
            findOne: jest.fn().mockResolvedValue(null),
            findOneAndDelete: jest.fn().mockResolvedValue(null),
        };
        jest.doMock('../database/models/eventSubscriptions', () => ({ SubscriptionModel }));

        // Mock the EventSubWsListener class
        const instances: any[] = [];
        class MockEventSubWsListener {
            handlers: Record<string, any> = {};
            started = false;
            constructor(opts: any) {
                instances.push(this);
            }
            start() { this.started = true; }
            onUserSocketDisconnect(cb: any) { this.handlers.disconnect = cb; }
            onUserSocketConnect(cb: any) { this.handlers.connect = cb; }
            onSubscriptionCreateSuccess(cb: any) { this.handlers.createSuccess = cb; }
            onSubscriptionCreateFailure(cb: any) { this.handlers.createFail = cb; }
            onSubscriptionDeleteSuccess(cb: any) { this.handlers.deleteSuccess = cb; }
            onSubscriptionDeleteFailure(cb: any) { this.handlers.deleteFail = cb; }
            // test helper to trigger handlers
            _triggerDisconnect(userId: string, err?: Error) { return this.handlers.disconnect?.(userId, err); }
        }
        jest.doMock('@twurple/eventsub-ws', () => ({ EventSubWsListener: MockEventSubWsListener }));

        // Now import the module under test
        const mod = await import('../EventSubEvents');
        const { getEventSubs } = mod;

        const log = jest.spyOn(console, 'log').mockImplementation(() => { });

        const l1: any = await getEventSubs();
        // ensure one instance was created
        expect((MockEventSubWsListener as any).instances || instances).toBeDefined();
        expect(instances.length).toBe(1);

        // trigger disconnect
        await l1._triggerDisconnect('659523613', new Error('test')); // call the stored handler

        // wait a tick for async reconnect to complete
        await new Promise((r) => setTimeout(r, 10));

        // a new instance should have been created by reconnect
        expect(instances.length).toBeGreaterThanOrEqual(2);
        expect(log).toHaveBeenCalledWith('EventSub listener reconnected successfully.');

        log.mockRestore();
    });

    test('ignores duplicate reconnection attempts', async () => {
        jest.resetModules();

        jest.doMock('../util/constants', () => ({
            broadcasterInfo: [{ id: '1155035316', name: 'skullgaminghq', gameName: 'TestGame' }],
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
            constructor(opts: any) { instances.push(this); }
            start() { this.started = true; }
            onUserSocketDisconnect(cb: any) { this.handlers.disconnect = cb; }
            onUserSocketConnect(cb: any) { this.handlers.connect = cb; }
            onSubscriptionCreateSuccess(cb: any) { this.handlers.createSuccess = cb; }
            onSubscriptionCreateFailure(cb: any) { this.handlers.createFail = cb; }
            onSubscriptionDeleteSuccess(cb: any) { this.handlers.deleteSuccess = cb; }
            onSubscriptionDeleteFailure(cb: any) { this.handlers.deleteFail = cb; }
            _triggerDisconnect(userId: string, err?: Error) { return this.handlers.disconnect?.(userId, err); }
        }
        jest.doMock('@twurple/eventsub-ws', () => ({ EventSubWsListener: MockEventSubWsListener }));

        const mod = await import('../EventSubEvents');
        const { getEventSubs } = mod;
        const log = jest.spyOn(console, 'log').mockImplementation(() => { });

        const l1: any = await getEventSubs();
        expect(instances.length).toBe(1);

        // call disconnect twice in quick succession
        l1._triggerDisconnect('1', new Error('first'));
        l1._triggerDisconnect('1', new Error('second'));

        // wait for async handling
        await new Promise((r) => setTimeout(r, 20));

        // Only one reconnect attempt should have created a second instance
        expect(instances.length).toBe(2);
        expect(log).toHaveBeenCalledWith('Reconnection attempt already in progress.');

        log.mockRestore();
    });
});
