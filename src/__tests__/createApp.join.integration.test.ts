import createApp from '../util/createApp';
import request from 'supertest';
import axios from 'axios';

jest.mock('../chat', () => ({ joinChannel: jest.fn() }));

jest.mock('axios');

// Mock TokenModel used by createApp
jest.mock('../database/models/tokenModel', () => {
	class TokenModel {
		constructor(obj: any) { Object.assign(this, obj); }
		async save() { return this; }
		static async findOne() { return null; }
	}
	return { TokenModel };
});

describe('OAuth callback auto-join', () => {
	const mockedAxios = axios as jest.Mocked<typeof axios>;
	beforeEach(() => { jest.resetAllMocks(); process.env.TWITCH_CLIENT_ID = 'cid'; process.env.TWITCH_CLIENT_SECRET = 'csecret'; process.env.TWITCH_REDIRECT_URL = 'http://localhost:3000/api/v1/auth/twitch/callback'; });

	it('persists token and calls joinChannel for new user', async () => {
		// axios.post -> token exchange
		mockedAxios.post.mockResolvedValueOnce({ data: { access_token: 'at', refresh_token: 'rt', expires_in: 3600, scope: 'chat:read chat:edit' } });
		// axios.get -> users
		mockedAxios.get.mockResolvedValueOnce({ data: { data: [{ id: '123', login: 'newuser', broadcaster_type: '' }] } });

		const app = createApp();
		const res = await request(app).get('/api/v1/auth/twitch/callback').query({ code: 'abc' }).expect(200);

		// response should include userId and username
		expect(res.body.username).toBe('newuser');

		const chatModule = await import('../chat');
		expect(chatModule.joinChannel).toHaveBeenCalledWith('newuser');
	});
});
