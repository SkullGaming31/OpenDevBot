/* eslint-disable @typescript-eslint/no-explicit-any */
jest.setTimeout(20000);

import request from 'supertest';
import mongoose from 'mongoose';

describe('createApp webhook edge cases and reload errors', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_API_TOKEN = 'admintoken';
    // register mock in mongoose.models so dynamic import picks it up
    (mongoose.models as any)['WebhookQueue'] = WebhookQueueModelMock;
  });

  it('GET /api/v1/admin/webhooks with invalid status falls back to pending and validates limit bounds', async () => {
    countMock.mockResolvedValue(0);
    findMock.mockImplementation(() => ({ sort: () => ({ skip: () => ({ limit: () => ({ lean: () => Promise.resolve([]) }) }) }) }));

    const createApp = (await import('../util/createApp')).default as any;
    const app = createApp();

    // invalid status should default to pending
    let res = await request(app).get('/api/v1/admin/webhooks').set('x-admin-token', 'admintoken').query({ status: 'notastatus' });
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);

    // limit too large should be capped at 200
    res = await request(app).get('/api/v1/admin/webhooks').set('x-admin-token', 'admintoken').query({ limit: '9999' });
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(200);

    // limit too small is treated as falsy and defaults to 50 per implementation
    res = await request(app).get('/api/v1/admin/webhooks').set('x-admin-token', 'admintoken').query({ limit: '0' });
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(50);
  });

  it('POST /api/v1/admin/webhooks/requeue returns 400 for no ids and for invalid object ids', async () => {
    const createApp = (await import('../util/createApp')).default as any;
    const app = createApp();

    let res = await request(app).post('/api/v1/admin/webhooks/requeue').set('x-admin-token', 'admintoken').send({});
    expect(res.status).toBe(400);

    // send ids that are not valid ObjectId
    res = await request(app).post('/api/v1/admin/webhooks/requeue').set('x-admin-token', 'admintoken').send({ ids: ['notanid'] });
    expect(res.status).toBe(400);
  });

  it('DELETE /api/v1/admin/webhooks returns 400 for no ids and for invalid object ids', async () => {
    const createApp = (await import('../util/createApp')).default as any;
    const app = createApp();

    let res = await request(app).delete('/api/v1/admin/webhooks').set('x-admin-token', 'admintoken').send({});
    expect(res.status).toBe(400);

    res = await request(app).delete('/api/v1/admin/webhooks').set('x-admin-token', 'admintoken').send({ ids: ['badid'] });
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/admin/reload returns 200 when operations succeed and 500 when imports fail', async () => {
    // success path: provide restartChat and recreateEventSubs that resolve
    jest.resetModules();
    jest.doMock('../chat', () => ({ restartChat: jest.fn().mockResolvedValue(undefined) }));
    jest.doMock('../EventSubEvents', () => ({ recreateEventSubs: jest.fn().mockResolvedValue(undefined) }));
    let createApp = (await import('../util/createApp')).default as any;
    let app = createApp();
    let res = await request(app).post('/api/v1/admin/reload').set('x-admin-token', 'admintoken');
    expect(res.status).toBe(200);

    // failure path: import throws -> should hit catch and return 500
    jest.resetModules();
    jest.doMock('../chat', () => { throw new Error('chat import fail'); });
    createApp = (await import('../util/createApp')).default as any;
    app = createApp();
    res = await request(app).post('/api/v1/admin/reload').set('x-admin-token', 'admintoken');
    expect(res.status).toBe(500);
  });
});
