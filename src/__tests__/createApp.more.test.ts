/* eslint-disable @typescript-eslint/no-explicit-any */
jest.setTimeout(20000);

import request from 'supertest';

describe('createApp additional branches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TWITCH_CLIENT_ID = 'cid';
    process.env.TWITCH_CLIENT_SECRET = 'csecret';
    process.env.TWITCH_REDIRECT_URL = 'http://localhost/api/v1/auth/twitch/callback';
    process.env.ADMIN_API_TOKEN = 'admintoken';
  });

  it('GET /api/v1/chat/channels returns 500 when import fails', async () => {
    jest.resetModules();
    jest.doMock('axios', () => ({ post: jest.fn(), get: jest.fn() }));
    jest.doMock('../chat', () => { throw new Error('chat import failure'); });

    const createApp = (await import('../util/createApp')).default as any;
    const app = createApp();

    const res = await request(app).get('/api/v1/chat/channels').set('x-admin-token', 'admintoken');
    expect(res.status).toBe(500);
  });

  it('POST /api/v1/chat/join validates username and calls joinChannel', async () => {
    jest.resetModules();
    const postMock = jest.fn();
    const getMock = jest.fn();
    jest.doMock('axios', () => ({ post: postMock, get: getMock }));

    const joinMock = jest.fn().mockResolvedValue(undefined);
    jest.doMock('../chat', () => ({ joinChannel: joinMock }));

    const createApp = (await import('../util/createApp')).default as any;
    const app = createApp();

    // missing username
    let res = await request(app).post('/api/v1/chat/join').set('x-admin-token', 'admintoken').send({});
    expect(res.status).toBe(400);

    // valid username in body
    res = await request(app).post('/api/v1/chat/join').set('x-admin-token', 'admintoken').send({ username: '  TestUser  ' });
    expect(res.status).toBe(200);
    expect(joinMock).toHaveBeenCalledWith('TestUser');
  });

  it('OAuth callback updates existing token and calls save', async () => {
    jest.resetModules();
    const postMock = jest.fn();
    const getMock = jest.fn();
    jest.doMock('axios', () => ({ post: postMock, get: getMock }));

    // simulate token exchange and user fetch
    postMock.mockResolvedValue({ data: { access_token: 'at', refresh_token: 'rt', expires_in: 3600, scope: 'chat:read chat:edit' } });
    getMock.mockResolvedValue({ data: { data: [{ id: 'u1', login: 'tester', broadcaster_type: '' }] } });

    const saveMock = jest.fn().mockResolvedValue(undefined);
    const tokenDoc = { save: saveMock } as any;
    const findOneMock = jest.fn().mockResolvedValue(tokenDoc);
    const TokenModelMock: any = jest.fn().mockImplementation((doc: any) => ({ ...doc, save: saveMock }));
    TokenModelMock.findOne = findOneMock;
    jest.doMock('../database/models/tokenModel', () => ({ TokenModel: TokenModelMock }));

    // ensure joinChannel import throws to exercise that catch branch
    jest.doMock('../chat', () => { throw new Error('join import fail'); });

    const createApp = (await import('../util/createApp')).default as any;
    const app = createApp();

    const res = await request(app).get('/api/v1/auth/twitch/callback').query({ code: 'abc' });
    expect(res.status).toBe(200);
    expect(saveMock).toHaveBeenCalled();
  });
});
