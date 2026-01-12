/* eslint-disable @typescript-eslint/no-explicit-any */
jest.setTimeout(20000);

describe('createApp additional uncovered branches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TWITCH_CLIENT_ID = 'cid';
    process.env.TWITCH_CLIENT_SECRET = 'csecret';
    process.env.TWITCH_REDIRECT_URL = 'http://localhost/api/v1/auth/twitch/callback';
    (process.env as any).ADMIN_API_TOKEN = undefined;
    (process.env as any).ADMIN_SETUP_TOKEN = undefined;
    (process.env as any).ENVIRONMENT = undefined;
  });

  it('GET /api/v1/twitch?type=bot redirects with bot scopes and type', async () => {
    jest.resetModules();
    jest.doMock('axios', () => ({ post: jest.fn(), get: jest.fn() }));

    const createApp = (await import('../util/createApp')).default as any;
    const request = (await import('supertest')).default;
    const app = createApp();

    const res = await request(app).get('/api/v1/twitch').query({ type: 'bot' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('type=bot');
    expect(decodeURIComponent(res.headers.location)).toContain('channel:manage:extensions');
  });

  it('GET /api/v1/auth/twitch redirects to /api/v1/twitch with type', async () => {
    jest.resetModules();
    jest.doMock('axios', () => ({ post: jest.fn(), get: jest.fn() }));

    const createApp = (await import('../util/createApp')).default as any;
    const request = (await import('supertest')).default;
    const app = createApp();

    const res = await request(app).get('/api/v1/auth/twitch').query({ type: 'bot' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/api/v1/twitch?type=bot');
  });

  it('OAuth callback: axios.get user fetch returns unexpected shape -> 500 with details', async () => {
    jest.resetModules();
    const postMock = jest.fn().mockResolvedValue({ data: { access_token: 'at', refresh_token: 'rt', expires_in: 3600 } });
    const getMock = jest.fn().mockResolvedValue({ data: {} });
    jest.doMock('axios', () => ({ post: postMock, get: getMock }));

    const saveMock = jest.fn().mockResolvedValue(undefined);
    const findOneMock = jest.fn().mockResolvedValue(null);
    const TokenModelMock: any = jest.fn().mockImplementation((doc: any) => ({ ...doc, save: saveMock }));
    TokenModelMock.findOne = findOneMock;
    jest.doMock('../database/models/tokenModel', () => ({ TokenModel: TokenModelMock }));

    const createApp = (await import('../util/createApp')).default as any;
    const request = (await import('supertest')).default;
    const app = createApp();

    const res = await request(app).get('/api/v1/auth/twitch/callback').query({ code: 'abc' });
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('details');
  });

  it('POST /api/v1/admin/setup returns 500 when FS write fails', async () => {
    jest.resetModules();
    jest.doMock('axios', () => ({ post: jest.fn(), get: jest.fn() }));
    jest.doMock('fs', () => ({
      existsSync: jest.fn().mockReturnValue(true),
      readFileSync: jest.fn().mockReturnValue(''),
      writeFileSync: jest.fn(() => { throw new Error('disk write fail'); })
    }));

    process.env.ADMIN_SETUP_TOKEN = 'setuptoken';
    delete process.env.ADMIN_API_TOKEN;

    const createApp = (await import('../util/createApp')).default as any;
    const request = (await import('supertest')).default;
    const app = createApp();

    const res = await request(app).post('/api/v1/admin/setup').set('x-setup-token', 'setuptoken').send({ token: 'newtoken' });
    expect(res.status).toBe(500);
  });

  it('POST /api/v1/admin/login sets Secure cookie in prod', async () => {
    jest.resetModules();
    jest.doMock('axios', () => ({ post: jest.fn(), get: jest.fn() }));
    process.env.ADMIN_API_TOKEN = 'admintoken';
    process.env.ENVIRONMENT = 'prod';

    const createApp = (await import('../util/createApp')).default as any;
    const request = (await import('supertest')).default;
    const app = createApp();

    const res = await request(app).post('/api/v1/admin/login').send({ token: 'admintoken' });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'] && String(res.headers['set-cookie'][0])).toContain('Secure');
  });

  it('GET /api/v1/chat/channels accepts cookie-based admin auth', async () => {
    jest.resetModules();
    jest.doMock('axios', () => ({ post: jest.fn(), get: jest.fn() }));
    const joined = new Set(['#one', '#two']);
    jest.doMock('../chat', () => ({ joinedChannels: joined }));
    process.env.ADMIN_API_TOKEN = 'admintoken';

    const createApp = (await import('../util/createApp')).default as any;
    const request = (await import('supertest')).default;
    const app = createApp();

    const res = await request(app).get('/api/v1/chat/channels').set('cookie', 'admin_token=admintoken');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ channels: Array.from(joined) });
  });
});
