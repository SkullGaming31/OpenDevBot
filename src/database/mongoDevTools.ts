import logger from '../util/logger';

export async function connectMongoForDevelopment(): Promise<void> {
	const enabled = process.env.ENABLE_MONGO_DEV_TOOLS === 'true';
	const isDevelopment = process.env.ENVIRONMENT === 'dev' || process.env.ENVIRONMENT === 'debug';

	if (!isDevelopment) {
		if (enabled) logger.warn('MongoDB developer tooling is disabled outside dev/debug environments');
		return;
	}

	const uri = process.env.DOCKER_URI || process.env.MONGO_URI || '';
	if (!enabled && !uri) return;
	if (!uri) throw new Error('MongoDB developer tooling was enabled but DOCKER_URI/MONGO_URI is not configured');

	const trimQuotes = (value: string | undefined) => (value ?? '').replace(/^"|"$/g, '').replace(/^'|'$/g, '');
	const username = trimQuotes(process.env.MONGO_USER);
	const password = trimQuotes(process.env.MONGO_PASS);
	const databaseName = trimQuotes(process.env.MONGO_DB);
	let resolvedUri = trimQuotes(uri);

	if (/\{MONGO_(USER|PASS|DB)\}/.test(resolvedUri)) {
		if (!username || !password) {
			throw new Error('MongoDB URI contains placeholders but MONGO_USER or MONGO_PASS is not set');
		}
		resolvedUri = resolvedUri
			.replace(/\{MONGO_USER\}/g, encodeURIComponent(username))
			.replace(/\{MONGO_PASS\}/g, encodeURIComponent(password))
			.replace(/\{MONGO_DB\}/g, encodeURIComponent(databaseName));
	}

	const schemeIndex = resolvedUri.indexOf('://');
	const atIndex = schemeIndex === -1 ? -1 : resolvedUri.indexOf('@', schemeIndex + 3);
	const maskedUri = atIndex === -1
		? resolvedUri
		: `${resolvedUri.slice(0, schemeIndex + 3)}****${resolvedUri.slice(atIndex)}`;

	logger.info(`Connecting optional MongoDB developer tooling: ${maskedUri}`);
	const { default: Database } = await import('./index');
	await new Database(resolvedUri).connect();
}
