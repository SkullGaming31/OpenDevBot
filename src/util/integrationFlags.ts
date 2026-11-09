import logger from './logger';

export function isIntegrationEnabled(name: 'ENABLE_CHAT' | 'ENABLE_EVENTSUB'): boolean {
	const value = process.env[name]?.trim().toLowerCase();
	if (!value || value === 'false') return false;
	if (value === 'true') return true;
	logger.warn(`${name} must be "true" or "false"; leaving the integration disabled`);
	return false;
}
