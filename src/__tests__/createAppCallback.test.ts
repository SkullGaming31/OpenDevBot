import request from 'supertest';

describe('createApp callback', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
		process.env.TWITCH_CLIENT_ID = 'cid';
		process.env.TWITCH_CLIENT_SECRET = 'csecret';
		process.env.TWITCH_REDIRECT_URL = 'http://localhost/api/v1/auth/twitch/callback';
	});

	test('exchanges code and saves token to DB', async () => {
		jest.setTimeout(10000);

		const fakeToken = { access_token: 'a', refresh_token: 'r', expires_in: 3600, scope: ['chat:read'] };

		// mock axios before importing createApp
		jest.doMock('axios', () => ({
			post: jest.fn().mockResolvedValue({ data: fakeToken }),
			get: jest.fn().mockResolvedValue({ data: { data: [{ id: '123', login: 'bob', broadcaster_type: '' }] } }),
		}));

		// mock TokenModel BEFORE importing createApp
		const findOneAndUpdate = jest.fn().mockImplementation(async (filter, update) => ({
			...filter,
			...update.$set,
			_id: 'token-id'
		}));
		class MockTokenModel {}
		Object.assign(MockTokenModel, { findOneAndUpdate });

		jest.doMock('../database/models/tokenModel', () => ({ TokenModel: MockTokenModel }));

		// now import createApp with the TokenModel mocked
		const createApp = (await import('../util/createApp')).default;
		const app = createApp();
		const res = await request(app).get('/api/v1/auth/twitch/callback').query({ code: 'x' });
		expect(res.status).toBe(200);
		expect(res.body.userId).toBe('123');
		expect(res.body.username).toBe('bob');
		expect(findOneAndUpdate).toHaveBeenCalledWith(
			{ user_id: '123' },
			expect.objectContaining({ $set: expect.objectContaining({ login: 'bob', access_token: 'a' }) }),
			{ upsert: true, returnDocument: 'after' }
		);
	});

	test('does not save a token when Twitch does not return a valid user identity', async () => {
		const fakeToken = { access_token: 'a', refresh_token: 'r', expires_in: 3600, scope: ['chat:read'] };
		jest.doMock('axios', () => ({
			post: jest.fn().mockResolvedValue({ data: fakeToken }),
			get: jest.fn().mockResolvedValue({ data: { data: [{ login: 'unknown' }] } }),
		}));

		const findOneAndUpdate = jest.fn();
		class MockTokenModel {}
		Object.assign(MockTokenModel, { findOneAndUpdate });
		jest.doMock('../database/models/tokenModel', () => ({ TokenModel: MockTokenModel }));

		const createApp = (await import('../util/createApp')).default;
		const response = await request(createApp()).get('/api/v1/auth/twitch/callback').query({ code: 'x' });

		expect(response.status).toBe(500);
		expect(response.body.details).toBe('Twitch user response did not include a valid user identity');
		expect(findOneAndUpdate).not.toHaveBeenCalled();
	});
});
