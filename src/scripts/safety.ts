export function checkDropAllowed(argv: string[] = process.argv, env: NodeJS.ProcessEnv = process.env): boolean {
	const isDevEnv = env.NODE_ENV === 'development' || env.ENVIRONMENT === 'dev';
	const confirmed = argv.includes('--confirm') || env.CONFIRM_DROP === '1';
	return isDevEnv || confirmed;
}

export function requireDropAllowed(argv: string[] = process.argv, env: NodeJS.ProcessEnv = process.env): void {
	if (!checkDropAllowed(argv, env)) {
		throw new Error('Refusing to drop TokenModel collection: not in development and --confirm flag not provided');
	}
}
