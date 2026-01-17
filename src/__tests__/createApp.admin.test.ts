/* eslint-disable @typescript-eslint/no-explicit-any */
jest.resetModules();
jest.setTimeout(20000);

const countMock = jest.fn();
const findMock = jest.fn();
const updateManyMock = jest.fn();
const deleteManyMock = jest.fn();

const WebhookQueueModelMock: any = {
	countDocuments: countMock,
	find: findMock,
	updateMany: updateManyMock,
	deleteMany: deleteManyMock
};

import mongoose from 'mongoose';
import request from 'supertest';

// Ensure the real `webhookQueue` module will export our mock by registering
// it in mongoose.models before the module is imported.
// register mock per-test since jest.setup.ts clears mongoose.models in its beforeEach

describe('createApp admin webhook endpoints', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		process.env.ADMIN_API_TOKEN = 'thisisnotmysecrettoken';
		// re-register our mock into mongoose.models after global setup cleared it
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(mongoose.models as any)['WebhookQueue'] = WebhookQueueModelMock;
	});

	it('GET /api/v1/admin/webhooks returns items with pagination and count', async () => {
		const items = [{ _id: '1', status: 'pending', payload: {} }];
		countMock.mockResolvedValue(1);
		findMock.mockImplementation(() => ({ sort: () => ({ skip: () => ({ limit: () => ({ lean: () => Promise.resolve(items) }) }) }) }));

		const createApp = (await import('../util/createApp')).default as any;
		const app = createApp();

		const res = await request(app).get('/api/v1/admin/webhooks').set('x-admin-token', 'thisisnotmysecrettoken').query({ page: '1', limit: '10', status: 'pending' });
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ total: 1, page: 1, limit: 10 });
		expect(findMock).toHaveBeenCalled();
	});

	it('POST /api/v1/admin/webhooks/requeue validates ids and updates', async () => {
		// invalid (no id)
		const createApp = (await import('../util/createApp')).default as any;
		const app = createApp();

		let res = await request(app).post('/api/v1/admin/webhooks/requeue').set('x-admin-token', 'thisisnotmysecrettoken').send({});
		expect(res.status).toBe(400);

		// valid ids
		const validId = '507f1f77bcf86cd799439011';
		updateManyMock.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
		res = await request(app).post('/api/v1/admin/webhooks/requeue').set('x-admin-token', 'thisisnotmysecrettoken').send({ ids: [validId] });
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ ok: true, matched: 1, modified: 1 });
	});

	it('DELETE /api/v1/admin/webhooks validates ids and deletes', async () => {
		const createApp = (await import('../util/createApp')).default as any;
		const app = createApp();

		let res = await request(app).delete('/api/v1/admin/webhooks').set('x-admin-token', 'thisisnotmysecrettoken').send({});
		expect(res.status).toBe(400);

		const validId = '507f1f77bcf86cd799439011';
		deleteManyMock.mockResolvedValue({ deletedCount: 2 });
		res = await request(app).delete('/api/v1/admin/webhooks').set('x-admin-token', 'thisisnotmysecrettoken').send({ ids: [validId] });
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ ok: true, deleted: 2 });
	});
});
