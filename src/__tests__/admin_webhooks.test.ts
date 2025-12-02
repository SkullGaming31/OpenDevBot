import request from 'supertest';

// Prevent side-effects during imports
jest.resetModules();

process.env.ADMIN_API_TOKEN = 'admintoken';

// Mock TokenModel to avoid DB writes during app startup
jest.doMock('../database/models/tokenModel', () => ({ TokenModel: {} }));

describe('Admin webhook endpoints', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
		process.env.ADMIN_API_TOKEN = 'admintoken';
	});

	test('GET /api/v1/admin/webhooks returns paginated items', async () => {
		// Mock the WebhookQueueModel
		const fakeItems = [
			{ _id: '507f1f77bcf86cd799439011', webhookId: 'id1', payload: { content: 'a' }, status: 'pending', createdAt: new Date() },
			{ _id: '507f1f77bcf86cd799439012', webhookId: 'id2', payload: { content: 'b' }, status: 'pending', createdAt: new Date() }
		];

		// `createApp` calls `WebhookQueueModel.find(...).sort(...).skip(...).limit(...).lean()`
		// so mock `find` to return a chainable object implementing those helpers.
		jest.doMock('../database/models/webhookQueue', () => ({
			__esModule: true,
			default: {
				countDocuments: jest.fn().mockResolvedValue(2),
				find: jest.fn().mockReturnValue({
					sort: () => ({
						skip: () => ({
							limit: () => ({
								lean: jest.fn().mockResolvedValue(fakeItems)
							})
						})
					})
				})
			}
		}));

		const createApp = (await import('../util/createApp')).default;
		const app = createApp();

		const res = await request(app)
			.get('/api/v1/admin/webhooks')
			.set('x-admin-token', 'admintoken');

		// If the endpoint fails, include the body in the test output to aid debugging
		if (res.status !== 200) console.error('admin/webhooks GET response:', res.status, res.text || JSON.stringify(res.body));

		expect(res.status).toBe(200);
		expect(res.body.total).toBe(2);
		expect(Array.isArray(res.body.items)).toBe(true);
		expect(res.body.items.length).toBe(2);
	});

	test('POST /api/v1/admin/webhooks/requeue updates items', async () => {
		const updateResult = { matchedCount: 1, modifiedCount: 1 };
		jest.doMock('../database/models/webhookQueue', () => ({
			__esModule: true,
			default: {
				updateMany: jest.fn().mockResolvedValue(updateResult)
			}
		}));

		const createApp = (await import('../util/createApp')).default;
		const app = createApp();

		const res = await request(app)
			.post('/api/v1/admin/webhooks/requeue')
			.set('x-admin-token', 'admintoken')
			.send({ ids: ['507f1f77bcf86cd799439011'] })
			.expect(200);

		expect(res.body.ok).toBe(true);
		expect(res.body.matched).toBe(1);
		expect(res.body.modified).toBe(1);
	});

	test('DELETE /api/v1/admin/webhooks removes items', async () => {
		jest.doMock('../database/models/webhookQueue', () => ({
			__esModule: true,
			default: {
				deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 })
			}
		}));

		const createApp = (await import('../util/createApp')).default;
		const app = createApp();

		const res = await request(app)
			.delete('/api/v1/admin/webhooks')
			.set('x-admin-token', 'admintoken')
			.send({ ids: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'] })
			.expect(200);

		expect(res.body.ok).toBe(true);
		expect(res.body.deleted).toBe(2);
	});
});
