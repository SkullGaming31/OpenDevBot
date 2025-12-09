/** @type {import('ts-jest').JestConfigWithTsJest} */
const config = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['**/__tests__/**/*.test.ts'],
	setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
	transform: {
		'^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
	},
	moduleNameMapper: {
		'^\\.\\./src/(.*)$': '<rootDir>/src/$1',
		'^/src/(.*)$': '<rootDir>/src/$1',
		'^src/(.*)$': '<rootDir>/src/$1',
		'^@twurple/chat$': '<rootDir>/src/__mocks__/@twurple_chat.ts',
		'^@twurple/chat/lib$': '<rootDir>/src/__mocks__/@twurple_chat.ts',
	},
	// Ignore built artifacts to avoid duplicate manual mock detection
	modulePathIgnorePatterns: ['<rootDir>/dist/'],
	testPathIgnorePatterns: ['<rootDir>/src/scripts/'],
	coveragePathIgnorePatterns: ['<rootDir>/src/scripts/'],
	collectCoverage: true,
	coverageDirectory: '<rootDir>/coverage',
	collectCoverageFrom: [
		'src/**/*.ts',
		'!src/**/__tests__/**',
		'!src/**/__mocks__/**',
		'!src/**/*.d.ts',
		'!src/scripts/**',
	],
	coverageReporters: ['text', 'lcov', 'json'],
	coverageThreshold: {
		global: {
			branches: 50,
			functions: 50,
			lines: 50,
			statements: 50,
		},
	},
};

// In CI environments (GitHub Actions) the mongodb-memory-server package
// may attempt to spawn MongoDB binaries that require OpenSSL 1.1 which
// isn't available on ubuntu-latest runners. When running in CI we map
// imports of `mongodb-memory-server` to a lightweight mock that returns
// the URI from the `MONGO_URI` environment variable (the workflow sets
// this to the provided Mongo service). This avoids downloading binaries
// and makes tests stable in CI while leaving local behavior unchanged.
if (process.env.GITHUB_ACTIONS || process.env.CI) {
	config.moduleNameMapper = config.moduleNameMapper || {};
	config.moduleNameMapper['^mongodb-memory-server$'] = '<rootDir>/test-mocks/mongodb-memory-server.mock.ts';
}

module.exports = config;