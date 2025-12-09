import logger from '../util/logger';

export function initMonitoring(): void {
	const dsn = process.env.SENTRY_DSN || process.env.LOGDNA_KEY;
	if (!dsn) return;

	try {
		// Lazy require so tests and environments without Sentry installed don't fail
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const Sentry = require('@sentry/node');
		// require tracing package when available; no binding needed here
		try { require('@sentry/tracing'); } catch (e) { /* optional */ }
		Sentry.init({
			dsn,
			tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE) : 0.1,
			environment: process.env.ENVIRONMENT as string,
		});
		logger.info('Monitoring initialized');
	} catch (err) {
		const e = err as Error | unknown;
		logger.warn('Monitoring not initialized: optional package missing or failed to initialize', (e as Error)?.message ?? String(e));
	}
}
