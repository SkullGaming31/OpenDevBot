import logger from '../util/logger';
import Database from '../database/index';
import { connectMongoForDevelopment } from '../database/mongoDevTools';

const mockDatabaseConnect = jest.fn();

jest.mock('../database/index', () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(() => ({ connect: mockDatabaseConnect })),
}));

jest.mock('../util/logger', () => ({
	__esModule: true,
	default: { info: jest.fn(), warn: jest.fn() },
}));

const environmentKeys = [
	'ENVIRONMENT',
	'ENABLE_MONGO_DEV_TOOLS',
	'DOCKER_URI',
	'MONGO_URI',
	'MONGO_USER',
	'MONGO_PASS',
	'MONGO_DB',
];
const originalEnvironment = new Map(environmentKeys.map((key) => [key, process.env[key]]));

describe('MongoDB developer tooling environment guard', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		for (const key of environmentKeys) Reflect.deleteProperty(process.env, key);
	});

	afterAll(() => {
		for (const key of environmentKeys) {
			const original = originalEnvironment.get(key);
			if (original === undefined) Reflect.deleteProperty(process.env, key);
			else process.env[key] = original;
		}
	});

	it('does not connect to MongoDB in production even when explicitly enabled', async () => {
		process.env.ENVIRONMENT = 'prod';
		process.env.ENABLE_MONGO_DEV_TOOLS = 'true';
		process.env.DOCKER_URI = 'mongodb://localhost:27017/opendevbot';

		await connectMongoForDevelopment();

		expect(Database).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalledWith(
			'MongoDB developer tooling is disabled outside dev/debug environments',
		);
	});

	it('connects to MongoDB in development when a URI is configured', async () => {
		process.env.ENVIRONMENT = 'dev';
		process.env.DOCKER_URI = 'mongodb://localhost:27017/opendevbot';

		await connectMongoForDevelopment();

		expect(Database).toHaveBeenCalledWith('mongodb://localhost:27017/opendevbot');
		expect(mockDatabaseConnect).toHaveBeenCalledTimes(1);
	});
});
