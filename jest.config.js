/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.ts'],
    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.json'
        }
    }
};
