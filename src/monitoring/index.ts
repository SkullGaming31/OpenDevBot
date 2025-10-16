import ENVIRONMENT from '../util/env';
import logger from '../util/logger';

export function initMonitoring(): void {
	const dsn = process.env.SENTRY_DSN || process.env.LOGDNA_KEY;
	if (!dsn) return;

	try {
		// Lazy require so tests and environments without Sentry installed don't fail
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const Sentry = require('@sentry/node');
		const Tracing = require('@sentry/tracing');
		Sentry.init({
			dsn,
			tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE) : 0.1,
			environment: ENVIRONMENT,
		});
		logger.info('Monitoring initialized');
	} catch (err) {
		const e = err as Error | unknown;
		logger.warn('Monitoring not initialized: optional package missing or failed to initialize', (e as Error)?.message ?? String(e));
	}
}
