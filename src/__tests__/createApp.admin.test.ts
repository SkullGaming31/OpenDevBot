/* eslint-disable @typescript-eslint/no-explicit-any */
jest.resetModules();
jest.setTimeout(20000);

import request from 'supertest';
import { useInMemorySqliteDatabase } from './sqliteTestSetup';

describe('createApp admin webhook endpoints', () => {
	useInMemorySqliteDatabase();

	beforeEach(() => {
		process.env.ADMIN_API_TOKEN = 'thisisnotmysecrettoken';
	});

	it('GET /api/v1/admin/webhooks returns items with pagination and count', async () => {
		const WebhookQueueModel = (await import('../database/models/webhookQueue')).default;
		await WebhookQueueModel.create({ webhookId: 'discord', token: 'secret', payload: { event: 'live' }, status: 'pending' });
		await WebhookQueueModel.create({ webhookId: 'discord', token: 'secret', payload: { event: 'offline' }, status: 'failed' });

		const createApp = (await import('../util/createApp')).default as any;
		const app = createApp();

		const res = await request(app).get('/api/v1/admin/webhooks').set('x-admin-token', 'thisisnotmysecrettoken').query({ page: '1', limit: '10', status: 'pending' });
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ total: 1, page: 1, limit: 10 });
		expect(res.body.items).toHaveLength(1);
		expect(res.body.items[0].status).toBe('pending');
	});

	it('POST /api/v1/admin/webhooks/requeue validates ids and updates', async () => {
		const WebhookQueueModel = (await import('../database/models/webhookQueue')).default;
		const item = await WebhookQueueModel.create({ webhookId: 'discord', token: 'secret', payload: {}, status: 'failed' });
		// invalid (no id)
		const createApp = (await import('../util/createApp')).default as any;
		const app = createApp();

		let res = await request(app).post('/api/v1/admin/webhooks/requeue').set('x-admin-token', 'thisisnotmysecrettoken').send({});
		expect(res.status).toBe(400);

		// valid ids
		res = await request(app).post('/api/v1/admin/webhooks/requeue').set('x-admin-token', 'thisisnotmysecrettoken').send({ ids: [item._id] });
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ ok: true, matched: 1, modified: 1 });
		expect((await WebhookQueueModel.findOne({ _id: item._id }).lean())?.status).toBe('pending');
	});

	it('DELETE /api/v1/admin/webhooks validates ids and deletes', async () => {
		const WebhookQueueModel = (await import('../database/models/webhookQueue')).default;
		const item = await WebhookQueueModel.create({ webhookId: 'discord', token: 'secret', payload: {}, status: 'pending' });
		const createApp = (await import('../util/createApp')).default as any;
		const app = createApp();

		let res = await request(app).delete('/api/v1/admin/webhooks').set('x-admin-token', 'thisisnotmysecrettoken').send({});
		expect(res.status).toBe(400);

		res = await request(app).delete('/api/v1/admin/webhooks').set('x-admin-token', 'thisisnotmysecrettoken').send({ ids: [item._id] });
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ ok: true, deleted: 1 });
		expect(await WebhookQueueModel.countDocuments({})).toBe(0);
	});
});
