/* eslint-disable @typescript-eslint/no-explicit-any */
jest.resetModules();
jest.setTimeout(20000);

import fs from 'fs';
import request from 'supertest';

describe('createApp admin extra branches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_API_TOKEN = '';
    process.env.ADMIN_SETUP_TOKEN = '';
  });

  it('POST /api/v1/admin/setup returns 403 when setup not enabled', async () => {
    const createApp = (await import('../util/createApp')).default as any;
    const app = createApp();
    const res = await request(app).post('/api/v1/admin/setup').send({ token: 'x' });
    expect(res.status).toBe(403);
  });

  it('POST /api/v1/admin/setup validates setup token and missing body token', async () => {
    process.env.ADMIN_SETUP_TOKEN = 'setup123';
    // wrong header
    let createApp = (await import('../util/createApp')).default as any;
    let app = createApp();
    let res = await request(app).post('/api/v1/admin/setup').set('x-setup-token', 'wrong').send({ token: 'x' });
    expect(res.status).toBe(401);

    // correct header but missing token
    createApp = (await import('../util/createApp')).default as any;
    app = createApp();
    res = await request(app).post('/api/v1/admin/setup').set('x-setup-token', 'setup123').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/admin/setup returns 400 when ADMIN_API_TOKEN already set', async () => {
    process.env.ADMIN_SETUP_TOKEN = 's';
    process.env.ADMIN_API_TOKEN = 'already';
    const createApp = (await import('../util/createApp')).default as any;
    const app = createApp();
    const res = await request(app).post('/api/v1/admin/setup').set('x-setup-token', 's').send({ token: 'new' });
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/admin/setup persists token to .env when not present', async () => {
    process.env.ADMIN_SETUP_TOKEN = 's2';
    // mock fs
    const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined as any);

    const createApp = (await import('../util/createApp')).default as any;
    const app = createApp();
    const res = await request(app).post('/api/v1/admin/setup').set('x-setup-token', 's2').send({ token: 'persisted' });
    expect(res.status).toBe(200);
    expect(process.env.ADMIN_API_TOKEN).toBe('persisted');

    existsSpy.mockRestore();
    writeSpy.mockRestore();
  });

  it('POST /api/v1/admin/login and validation branches', async () => {
    const createApp = (await import('../util/createApp')).default as any;
    const app = createApp();

    // missing token
    let res = await request(app).post('/api/v1/admin/login').send({});
    expect(res.status).toBe(400);

    // admin not configured
    res = await request(app).post('/api/v1/admin/login').send({ token: 'x' });
    expect(res.status).toBe(503);

    // wrong token
    process.env.ADMIN_API_TOKEN = 'tok';
    res = await request(app).post('/api/v1/admin/login').send({ token: 'bad' });
    expect(res.status).toBe(401);

    // success
    res = await request(app).post('/api/v1/admin/login').send({ token: 'tok' });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('POST /api/v1/admin/reload success and failure paths', async () => {
    process.env.ADMIN_API_TOKEN = 'adm';
    // mock chat and EventSubEvents success
    jest.doMock('../chat', () => ({ restartChat: jest.fn().mockResolvedValue(undefined) }));
    jest.doMock('../EventSubEvents', () => ({ recreateEventSubs: jest.fn().mockResolvedValue(undefined) }));
    let createApp = (await import('../util/createApp')).default as any;
    let app = createApp();
    let res = await request(app).post('/api/v1/admin/reload').set('x-admin-token', 'adm').send({});
    expect(res.status).toBe(200);

    // mock failure
    jest.resetModules();
    process.env.ADMIN_API_TOKEN = 'adm';
    jest.doMock('../chat', () => ({ restartChat: jest.fn().mockRejectedValue(new Error('boom')) }));
    jest.doMock('../EventSubEvents', () => ({ recreateEventSubs: jest.fn().mockResolvedValue(undefined) }));
    createApp = (await import('../util/createApp')).default as any;
    app = createApp();
    res = await request(app).post('/api/v1/admin/reload').set('x-admin-token', 'adm').send({});
    // handler uses Promise.allSettled and returns 200 even if restartChat rejects
    expect(res.status).toBe(200);
  });

  it('POST /api/v1/chat/part validations and client part/quit', async () => {
    process.env.ADMIN_API_TOKEN = 'adm2';
    // missing username
    let createApp = (await import('../util/createApp')).default as any;
    let app = createApp();
    let res = await request(app).post('/api/v1/chat/part').set('x-admin-token', 'adm2').send({});
    expect(res.status).toBe(400);

    // client.part path
    jest.resetModules();
    const joined = new Set<string>(['chan']);
    jest.doMock('../chat', () => ({ getChatClient: jest.fn().mockResolvedValue({ part: jest.fn().mockResolvedValue(undefined) }), joinedChannels: joined }));
    createApp = (await import('../util/createApp')).default as any;
    app = createApp();
    res = await request(app).post('/api/v1/chat/part').set('x-admin-token', 'adm2').send({ username: 'chan' });
    expect(res.status).toBe(200);

    // client.quit path
    jest.resetModules();
    const joined2 = new Set<string>(['chan2']);
    jest.doMock('../chat', () => ({ getChatClient: jest.fn().mockResolvedValue({ quit: jest.fn().mockResolvedValue(undefined) }), joinedChannels: joined2 }));
    createApp = (await import('../util/createApp')).default as any;
    app = createApp();
    res = await request(app).post('/api/v1/chat/part').set('x-admin-token', 'adm2').send({ username: 'chan2' });
    expect(res.status).toBe(200);
  });
});
