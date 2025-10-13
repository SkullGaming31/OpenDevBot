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
        class MockTokenModel {
            user_id: any;
            login: any;
            access_token: any;
            refresh_token: any;
            scope: any;
            expires_in: any;
            obtainmentTimestamp: any;
            broadcaster_type: any;
            constructor(obj: any) {
                Object.assign(this, obj);
            }
            save() { return Promise.resolve(this); }
            static findOne(query: any) { return Promise.resolve(null); }
        }
        // ensure findOne is a jest mock so tests can assert later if desired
        (MockTokenModel as any).findOne = jest.fn().mockResolvedValue(null);

        jest.doMock('../database/models/tokenModel', () => ({ TokenModel: MockTokenModel }));

        // now import createApp with the TokenModel mocked
        const createApp = (await import('../util/createApp')).default;
        const app = createApp();
        const res = await request(app).get('/api/v1/auth/twitch/callback').query({ code: 'x' });
        expect(res.status).toBe(200);
        expect(res.body.userId).toBe('123');
        expect(res.body.username).toBe('bob');
    });
});
