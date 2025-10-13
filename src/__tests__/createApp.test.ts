import request from 'supertest';
import createApp from '../util/createApp';

describe('createApp routes', () => {
    test('GET /api/v1/twitch redirects', async () => {
        process.env.TWITCH_CLIENT_ID = 'fake';
        process.env.TWITCH_REDIRECT_URL = 'http://localhost:3000/api/v1/auth/twitch/callback';
        const app = createApp();
        const res = await request(app).get('/api/v1/twitch');
        expect(res.status).toBe(302);
        expect(res.header['location']).toContain('https://id.twitch.tv/oauth2/authorize');
    });
});
