// Lightweight mock used in CI to avoid spawning native MongoDB binaries.
// Exports both `MongoMemoryServer` and `MongoMemoryReplSet` with a
// synchronous `getUri()` to match callers that do not `await` it.
const DEFAULT_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/test';

export class MongoMemoryServer {
	static create() {
		return new MongoMemoryServer();
	}

	// Keep `getUri()` synchronous to match call-sites in tests that expect a string.
	getUri(): string {
		return DEFAULT_URI;
	}

	stop(): void {
		// noop for mocked server
		return;
	}
}

export class MongoMemoryReplSet {
	static create(_opts?: unknown) {
		return new MongoMemoryReplSet();
	}

	getUri(): string {
		return DEFAULT_URI;
	}

	stop(): void {
		return;
	}
}
