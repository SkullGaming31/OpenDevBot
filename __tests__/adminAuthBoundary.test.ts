import request from 'supertest';
import createApp from '../src/util/createApp';
import { useInMemorySqliteDatabase } from './sqliteTestSetup';

describe('admin authentication boundary', () => {
	useInMemorySqliteDatabase();
	const originalToken = process.env.ADMIN_API_TOKEN;
	const originalSetupToken = process.env.ADMIN_SETUP_TOKEN;

	beforeEach(() => {
		delete process.env.ADMIN_API_TOKEN;
		delete process.env.ADMIN_SETUP_TOKEN;
	});

	afterAll(() => {
		if (originalToken === undefined) delete process.env.ADMIN_API_TOKEN;
		else process.env.ADMIN_API_TOKEN = originalToken;
		if (originalSetupToken === undefined) delete process.env.ADMIN_SETUP_TOKEN;
		else process.env.ADMIN_SETUP_TOKEN = originalSetupToken;
	});

	it('fails closed for standalone admin reads and writes when no token is configured', async () => {
		const app = createApp();
		const status = await request(app).get('/api/v1/admin/status');
		const reload = await request(app).post('/api/v1/admin/reload').send({});
		expect(status.status).toBe(503);
		expect(status.body).toEqual({ error: 'Admin API token is not configured' });
		expect(reload.status).toBe(503);
		expect((await request(app).get('/health')).status).toBe(200);
	});

	it('requires the private Electron session token when no configured token exists', async () => {
		const app = createApp({ localAdminToken: 'synthetic-session-token' });
		expect((await request(app).get('/api/v1/admin/status')).status).toBe(401);
		expect((await request(app).get('/api/v1/admin/status').set('x-admin-token', 'wrong')).status).toBe(401);
		expect((await request(app).get('/api/v1/admin/status').set('x-admin-token', 'synthetic-session-token')).status).toBe(200);
	});

	it('prefers a configured token over the Electron session token', async () => {
		const app = createApp({ localAdminToken: 'synthetic-session-token' });
		process.env.ADMIN_API_TOKEN = 'synthetic-configured-token';
		expect((await request(app).get('/api/v1/admin/status').set('x-admin-token', 'synthetic-session-token')).status).toBe(401);
		expect((await request(app).get('/api/v1/admin/status').set('x-admin-token', 'synthetic-configured-token')).status).toBe(200);
	});

	it('continues to support setting an admin token at runtime', async () => {
		process.env.ADMIN_SETUP_TOKEN = 'synthetic-setup-token';
		const app = createApp({ localAdminToken: 'synthetic-session-token' });
		const setup = await request(app).post('/api/v1/admin/setup')
			.set('x-setup-token', 'synthetic-setup-token').send({ token: 'synthetic-new-token' });
		expect(setup.status).toBe(200);
		expect((await request(app).get('/api/v1/admin/status').set('x-admin-token', 'synthetic-session-token')).status).toBe(401);
		expect((await request(app).get('/api/v1/admin/status').set('x-admin-token', 'synthetic-new-token')).status).toBe(200);
	});
});
