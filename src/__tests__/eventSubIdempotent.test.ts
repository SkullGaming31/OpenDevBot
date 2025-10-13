// Import at runtime to avoid ts-jest module resolution issues in the test environment
// eslint-disable-next-line @typescript-eslint/no-var-requires
// @ts-ignore
const SubscriptionManager = require('../EventSub/idempotent').default;

describe('SubscriptionManager (scaffolding)', () => {
    const mgr = new SubscriptionManager();
    const bc = '12345';
    const evt = 'stream.online';

    beforeEach(() => mgr.reset());

    test('creates a subscription and returns created status', async () => {
        const res = await mgr.createOrEnsureSubscription(bc, evt);
        expect(res.status).toBe('created');
        expect(res.id).toBeDefined();
        expect(res.attempts).toBe(0);
    });

    test('is idempotent: subsequent calls return existing', async () => {
        const a = await mgr.createOrEnsureSubscription(bc, evt);
        const b = await mgr.createOrEnsureSubscription(bc, evt);
        expect(a.status).toBe('created');
        expect(b.status).toBe('existing');
        expect(a.id).toBe(b.id);
    });

    test('markCreateFailed increments attempts and records error', async () => {
        // simulate a failure before a success
        await mgr.markCreateFailed(bc, evt, 'network error');
        let rec = mgr.getRecord(bc, evt)!;
        expect(rec.attempts).toBe(1);
        expect(rec.lastError).toBe('network error');

        // simulate another failure
        await mgr.markCreateFailed(bc, evt, 'timeout');
        rec = mgr.getRecord(bc, evt)!;
        expect(rec.attempts).toBe(2);
        expect(rec.lastError).toBe('timeout');
    });
});
