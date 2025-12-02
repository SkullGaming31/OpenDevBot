/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['**/__tests__/**/*.test.ts'],
	setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
	transform: {
		'^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
	},
	moduleNameMapper: {
		'^\\.\\./src/(.*)$': '<rootDir>/src/$1',
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