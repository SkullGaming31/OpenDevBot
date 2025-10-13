import { sleep } from '../util/util';

describe('util.sleep', () => {
    test('sleeps for at least the provided time', async () => {
        const start = Date.now();
        await sleep(50);
        const delta = Date.now() - start;
        expect(delta).toBeGreaterThanOrEqual(45);
    });
});
