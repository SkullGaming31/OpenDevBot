import createApp from '../src/util/createApp';
import request from 'supertest';
import axios from 'axios';

jest.mock('../src/chat', () => ({ joinChannel: jest.fn() }));

jest.mock('axios');

// Mock TokenModel used by createApp
jest.mock('../src/database/models/tokenModel', () => {
	class TokenModel {
		static async findOneAndUpdate() { return { scope: ['chat:read', 'chat:edit'] }; }
	}
	return { TokenModel };
});

describe('OAuth callback auto-join', () => {
	const mockedAxios = axios as jest.Mocked<typeof axios>;
	beforeEach(() => { jest.resetAllMocks(); process.env.TWITCH_CLIENT_ID = 'cid'; process.env.TWITCH_CLIENT_SECRET = 'csecret'; process.env.TWITCH_REDIRECT_URL = 'http://localhost:3000/api/v1/auth/twitch/callback'; process.env.ENABLE_CHAT = 'true'; });

	it('persists token and calls joinChannel for new user', async () => {
		// axios.post -> token exchange
		mockedAxios.post.mockResolvedValueOnce({ data: { access_token: 'at', refresh_token: 'rt', expires_in: 3600, scope: 'chat:read chat:edit' } });
		// axios.get -> users
		mockedAxios.get.mockResolvedValueOnce({ data: { data: [{ id: '123', login: 'newuser', broadcaster_type: '' }] } });

		const app = createApp();
		const res = await request(app).get('/api/v1/auth/twitch/callback').query({ code: 'abc' }).expect(200);

		// response should include userId and username
		expect(res.body.username).toBe('newuser');

		const chatModule = await import('../src/chat');
		expect(chatModule.joinChannel).toHaveBeenCalledWith('newuser');
	});

	it('does not join a channel after signup when chat is disabled', async () => {
		process.env.ENABLE_CHAT = 'false';
		mockedAxios.post.mockResolvedValueOnce({ data: { access_token: 'at', refresh_token: 'rt', expires_in: 3600, scope: 'chat:read' } });
		mockedAxios.get.mockResolvedValueOnce({ data: { data: [{ id: '123', login: 'newuser', broadcaster_type: '' }] } });
		await request(createApp()).get('/api/v1/auth/twitch/callback').query({ code: 'abc' }).expect(200);
		const chatModule = await import('../src/chat');
		expect(chatModule.joinChannel).not.toHaveBeenCalled();
	});
});
