/* eslint-disable @typescript-eslint/no-explicit-any */
jest.resetModules();
jest.setTimeout(20000);

const postMock = jest.fn();
const getMock = jest.fn();

jest.doMock('axios', () => ({ post: postMock, get: getMock }));

const saveMock = jest.fn().mockResolvedValue(undefined);
const findOneMock = jest.fn().mockResolvedValue(null);
const TokenModelMock: any = jest.fn().mockImplementation((doc: any) => ({ ...doc, save: saveMock }));
TokenModelMock.findOne = findOneMock;

jest.doMock('../database/models/tokenModel', () => ({ TokenModel: TokenModelMock }));

import request from 'supertest';

describe('createApp', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		process.env.TWITCH_CLIENT_ID = 'cid';
		process.env.TWITCH_CLIENT_SECRET = 'csecret';
		process.env.TWITCH_REDIRECT_URL = 'http://localhost/api/v1/auth/twitch/callback';
	});

	it('redirects to Twitch authorize URL', async () => {
		const createApp = (await import('../util/createApp')).default as any;
		const app = createApp();
		const res = await request(app).get('/api/v1/twitch');
		expect(res.status).toBe(302);
		expect(res.headers.location).toContain('id.twitch.tv/oauth2/authorize');
		expect(res.headers.location).toContain('client_id=cid');
	});

	it('handles oauth callback success and saves token', async () => {
		// Mock axios responses
		postMock.mockResolvedValue({ data: { access_token: 'at', refresh_token: 'rt', expires_in: 3600, scope: 'chat:read chat:edit' } });
		getMock.mockResolvedValue({ data: { data: [{ id: 'u1', login: 'tester', broadcaster_type: '' }] } });

		const createApp = (await import('../util/createApp')).default as any;
		const app = createApp();

		const res = await request(app).get('/api/v1/auth/twitch/callback').query({ code: 'abc' });
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ userId: 'u1', username: 'tester' });
		// TokenModel was constructed and saved
		expect(TokenModelMock).toHaveBeenCalled();
		expect(saveMock).toHaveBeenCalled();
	});

	it('returns 500 when axios token exchange fails with details', async () => {
		const err = new Error('bad');
		// attach a response.data payload like axios error
		(err as any).response = { data: { message: 'invalid_grant' } };
		postMock.mockRejectedValue(err);

		const createApp = (await import('../util/createApp')).default as any;
		const app = createApp();

		const res = await request(app).get('/api/v1/auth/twitch/callback').query({ code: 'abc' });
		expect(res.status).toBe(500);
		expect(res.body).toHaveProperty('details');
	});
});
