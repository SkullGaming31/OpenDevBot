import { attemptResubscribe } from '../EventSub/retryWorker';

jest.mock('../EventSub/retryManager', () => ({
    __esModule: true,
    default: {
        markFailed: jest.fn().mockResolvedValue(undefined),
        markSucceeded: jest.fn().mockResolvedValue(undefined),
        getPending: jest.fn().mockResolvedValue([]),
    }
}));

jest.mock('../EventSubEvents', () => ({
    createSubscriptionsForAuthUser: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../database/models/tokenModel', () => ({
    TokenModel: {
        findOne: jest.fn()
    }
}));

jest.mock('../database/models/eventSubscriptions', () => ({
    SubscriptionModel: {
        findOne: jest.fn()
    }
}));

const { TokenModel } = require('../database/models/tokenModel');
const { SubscriptionModel } = require('../database/models/eventSubscriptions');
const retryManager = require('../EventSub/retryManager').default;
const esEvents = require('../EventSubEvents');

describe('retryWorker.attemptResubscribe', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('marks failed when no token present', async () => {
        TokenModel.findOne.mockImplementation(() => ({ lean: jest.fn().mockResolvedValue(null) }));
        const rec: any = { subscriptionId: 'sub1', authUserId: '123', attempts: 1 };
        await attemptResubscribe(rec);
        expect(retryManager.markFailed).toHaveBeenCalledWith('sub1', '123', 'No token available for user');
    });

    test('succeeds when subscription appears after targeted create', async () => {
        TokenModel.findOne.mockImplementation(() => ({ lean: jest.fn().mockResolvedValue({ access_token: 'tok' }) }));
        esEvents.createSubscriptionsForAuthUser.mockResolvedValue(undefined);
        SubscriptionModel.findOne.mockImplementation(() => ({ exec: jest.fn().mockResolvedValue({ subscriptionId: 'sub1' }) }));
        const rec: any = { subscriptionId: 'sub1', authUserId: '123', attempts: 1 };
        await attemptResubscribe(rec);
        expect(esEvents.createSubscriptionsForAuthUser).toHaveBeenCalledWith('123', 'tok');
        expect(retryManager.markSucceeded).toHaveBeenCalledWith('sub1', '123');
    });

    test('records failure when token present but subscription not created', async () => {
        TokenModel.findOne.mockImplementation(() => ({ lean: jest.fn().mockResolvedValue({ access_token: 'tok' }) }));
        esEvents.createSubscriptionsForAuthUser.mockResolvedValue(undefined);
        SubscriptionModel.findOne.mockImplementation(() => ({ exec: jest.fn().mockResolvedValue(null) }));
        const rec: any = { subscriptionId: 'sub1', authUserId: '123', attempts: 1 };
        await attemptResubscribe(rec);
        expect(retryManager.markFailed).toHaveBeenCalledWith('sub1', '123', 'Resubscribe attempt did not create subscription');
    });
});
