import { attemptResubscribe } from '../src/EventSub/retryWorker';
import axios from 'axios';

jest.mock('../src/EventSub/retryManager', () => ({
	__esModule: true,
	default: {
		markFailed: jest.fn().mockResolvedValue(undefined),
		markSucceeded: jest.fn().mockResolvedValue(undefined),
		getPending: jest.fn().mockResolvedValue([]),
	}
}));

jest.mock('axios');

jest.mock('../src/EventSubEvents', () => ({
	createSubscriptionsForAuthUser: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/database/models/tokenModel', () => ({
	TokenModel: {
		findOne: jest.fn()
	}
}));

jest.mock('../src/database/models/eventSubscriptions', () => ({
	SubscriptionModel: {
		findOne: jest.fn()
	}
}));

const { TokenModel } = require('../src/database/models/tokenModel');
const { SubscriptionModel } = require('../src/database/models/eventSubscriptions');
const retryManager = require('../src/EventSub/retryManager').default;
const esEvents = require('../src/EventSubEvents');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('retryWorker.attemptResubscribe', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockedAxios.get.mockResolvedValue({ data: { data: [] } });
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
