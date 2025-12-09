import mongoose from 'mongoose';

import { metricsHandler, healthHandler, readyHandler } from '../monitoring/metrics';

jest.mock('mongoose', () => ({
	connection: { readyState: 1 }
}));

describe('metrics endpoints', () => {
	test('metricsHandler returns metrics content when DB is healthy', async () => {
		const req = {} as any;
		const res: any = {
			headers: {},
			statusCode: 200,
			body: '',
			set: function (k: string, v: string) { this.headers[k] = v; },
			send: function (b: string) { this.body = b; },
			status: function (code: number) { this.statusCode = code; return this; },
			json: function (obj: any) { this.body = obj; }
		};

		const handler = metricsHandler();
		await handler(req, res);

		expect(res.headers['Content-Type']).toBeDefined();
		expect(res.body).toBeDefined();
	});

	test('healthHandler returns ok when DB is healthy', async () => {
		(mongoose.connection as any).readyState = 1;
		const handler = healthHandler();
		const res: any = { statusCode: 200, body: null, status(code: number) { this.statusCode = code; return this; }, json(obj: any) { this.body = obj; } };
		await handler({} as any, res);
		expect(res.body).toEqual({ status: 'ok', db: true });
	});

	test('readyHandler returns 503 when DB is down', async () => {
		(mongoose.connection as any).readyState = 0;
		const handler = readyHandler();
		const res: any = { statusCode: 200, body: null, status(code: number) { this.statusCode = code; return this; }, json(obj: any) { this.body = obj; } };
		await handler({} as any, res);
		expect(res.statusCode).toBe(503);
		expect(res.body).toEqual({ ready: false });
	});
});
