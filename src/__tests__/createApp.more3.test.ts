/* eslint-disable @typescript-eslint/no-explicit-any */
jest.setTimeout(20000);

import request from 'supertest';

describe('createApp webhook edge cases and reload errors', () => {
  let sqlite: typeof import('../database/sqliteConnection');

  async function openTestDatabase() {
    sqlite = await import('../database/sqliteConnection');
    sqlite.closeSqliteDatabase();
    sqlite.openSqliteDatabase(':memory:');
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.ADMIN_API_TOKEN = 'admintoken';
    await openTestDatabase();
  });

  afterEach(() => {
    sqlite.closeSqliteDatabase();
  });

  it('GET /api/v1/admin/webhooks with invalid status falls back to pending and validates limit bounds', async () => {
    const WebhookQueueModel = (await import('../database/models/webhookQueue')).default;
    await WebhookQueueModel.create({ webhookId: 'discord', token: 'secret', payload: {}, status: 'pending' });

    const createApp = (await import('../util/createApp')).default as any;
    const app = createApp();

    const res = await request(app).get('/api/v1/admin/webhooks').set('x-admin-token', 'admintoken').query({ status: 'notastatus' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 1, page: 1, limit: 50 });
    expect(res.body.items[0].status).toBe('pending');

    const largeLimit = await request(app).get('/api/v1/admin/webhooks').set('x-admin-token', 'admintoken').query({ limit: '9999' });
    expect(largeLimit.status).toBe(200);
    expect(largeLimit.body.limit).toBe(200);

    const smallLimit = await request(app).get('/api/v1/admin/webhooks').set('x-admin-token', 'admintoken').query({ limit: '0' });
    expect(smallLimit.status).toBe(200);
    expect(smallLimit.body.limit).toBe(50);
  });

  it('POST /api/v1/admin/webhooks/requeue rejects missing or unusable ids', async () => {
    const createApp = (await import('../util/createApp')).default as any;
    const app = createApp();

    const missing = await request(app).post('/api/v1/admin/webhooks/requeue').set('x-admin-token', 'admintoken').send({});
    expect(missing.status).toBe(400);

    const unusable = await request(app).post('/api/v1/admin/webhooks/requeue').set('x-admin-token', 'admintoken').send({ ids: [null, 1, '  '] });
    expect(unusable.status).toBe(400);
  });

  it('DELETE /api/v1/admin/webhooks rejects missing or unusable ids', async () => {
    const createApp = (await import('../util/createApp')).default as any;
    const app = createApp();

    const missing = await request(app).delete('/api/v1/admin/webhooks').set('x-admin-token', 'admintoken').send({});
    expect(missing.status).toBe(400);

    const unusable = await request(app).delete('/api/v1/admin/webhooks').set('x-admin-token', 'admintoken').send({ ids: [null, 1, '  '] });
    expect(unusable.status).toBe(400);
  });

  it('POST /api/v1/admin/reload returns 200 when operations succeed and 500 when imports fail', async () => {
    sqlite.closeSqliteDatabase();
    jest.resetModules();
    await openTestDatabase();
    jest.doMock('../chat', () => ({ restartChat: jest.fn().mockResolvedValue(undefined) }));
    jest.doMock('../EventSubEvents', () => ({ recreateEventSubs: jest.fn().mockResolvedValue(undefined) }));

    let createApp = (await import('../util/createApp')).default as any;
    let app = createApp();
    let res = await request(app).post('/api/v1/admin/reload').set('x-admin-token', 'admintoken');
    expect(res.status).toBe(200);

    sqlite.closeSqliteDatabase();
    jest.resetModules();
    await openTestDatabase();
    jest.doMock('../chat', () => { throw new Error('chat import fail'); });

    createApp = (await import('../util/createApp')).default as any;
    app = createApp();
    res = await request(app).post('/api/v1/admin/reload').set('x-admin-token', 'admintoken');
    expect(res.status).toBe(500);
  });
});
