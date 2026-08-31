/* eslint-disable @typescript-eslint/no-explicit-any */
jest.resetModules();
jest.setTimeout(20000);

import request from 'supertest';

describe('createApp admin token handling (header/cookie only)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_API_TOKEN = '';
    process.env.ADMIN_SETUP_TOKEN = '';
  });

  it('rejects setup token supplied via query param', async () => {
    process.env.ADMIN_SETUP_TOKEN = 'setup123';
    const createApp = (await import('../util/createApp')).default as any;
    const app = createApp();

    const res = await request(app)
      .post('/api/v1/admin/setup?setup_token=setup123')
      .send({ token: 'admintoken' });
    expect(res.status).toBe(401);
  });

  it('rejects login token supplied via query param', async () => {
    process.env.ADMIN_API_TOKEN = 'tok';
    const createApp = (await import('../util/createApp')).default as any;
    const app = createApp();

    const res = await request(app)
      .post('/api/v1/admin/login?token=tok')
      .send({});
    // token must be in JSON body; query param should be ignored -> 400 (missing token)
    expect(res.status).toBe(400);
  });

  it('rejects protected endpoints using query param admin_token', async () => {
    process.env.ADMIN_API_TOKEN = 'adm';
    const createApp = (await import('../util/createApp')).default as any;
    const app = createApp();

    const res = await request(app).get('/api/v1/chat/channels?admin_token=adm');
    expect(res.status).toBe(401);
  });

  it('allows cookie-based auth after login', async () => {
    process.env.ADMIN_API_TOKEN = 'tok';
    const createApp = (await import('../util/createApp')).default as any;
    const app = createApp();

    const login = await request(app).post('/api/v1/admin/login').send({ token: 'tok' });
    expect(login.status).toBe(200);
    const setCookie = login.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join('; ') : String(setCookie);

    const res = await request(app).get('/api/v1/chat/channels').set('Cookie', cookieHeader);
    // Should be authorized; response code depends on internal state but must not be 401
    expect(res.status).not.toBe(401);
  });
});
