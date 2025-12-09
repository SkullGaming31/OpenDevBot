import client from 'prom-client';
import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';

// Create a registry so we can register custom metrics without polluting global
const register = new client.Registry();

// Default process metrics
client.collectDefaultMetrics({ register });

// Custom metrics
export const webhookAttempts = new client.Counter({
	name: 'opendevbot_webhook_attempts_total',
	help: 'Total webhook send attempts',
	labelNames: ['provider', 'status'] as const,
});

export const eventSubRetries = new client.Counter({
	name: 'opendevbot_eventsub_retries_total',
	help: 'Total EventSub resubscribe retry attempts',
	labelNames: ['authUserId'] as const,
});

export const tokenRefreshes = new client.Counter({
	name: 'opendevbot_token_refreshes_total',
	help: 'Total token refresh operations',
	labelNames: ['userId', 'result'] as const,
});

export const dbUp = new client.Gauge({
	name: 'opendevbot_db_up',
	help: 'MongoDB connectivity (1 = up, 0 = down)',
});

// Register metrics individually (avoid TS label-name incompatibilities)
// `prom-client` typing for registerMetric can be picky about generics; cast via `unknown` to avoid `any`.
register.registerMetric(webhookAttempts as unknown as client.Counter<string>);
register.registerMetric(eventSubRetries as unknown as client.Counter<string>);
register.registerMetric(tokenRefreshes as unknown as client.Counter<string>);
register.registerMetric(dbUp as unknown as client.Gauge<string>);

// Health check helpers
export async function getDbHealth(): Promise<boolean> {
	try {
		const state = mongoose.connection.readyState;
		// readyState 1 == connected
		return state === 1;
	} catch (e) {
		return false;
	}
}

export function metricsHandler(): (req: Request, res: Response, next?: NextFunction) => Promise<void> {
	return async (_req: Request, res: Response, _next?: NextFunction) => {
		try {
			// update db gauge
			const healthy = await getDbHealth();
			dbUp.set(healthy ? 1 : 0);

			res.set('Content-Type', register.contentType);
			const body = await register.metrics();
			res.send(body);
		} catch (err) {
			res.status(500).send('Error collecting metrics');
		}
	};
}

export function healthHandler() {
	return async (_req: Request, res: Response, _next?: NextFunction) => {
		const healthy = await getDbHealth();
		if (!healthy) return res.status(500).json({ status: 'unhealthy', db: false });
		return res.json({ status: 'ok', db: true });
	};
}

export function readyHandler() {
	return async (_req: Request, res: Response, _next?: NextFunction) => {
		const healthy = await getDbHealth();
		if (!healthy) return res.status(503).json({ ready: false });
		return res.json({ ready: true });
	};
}

export default register;
