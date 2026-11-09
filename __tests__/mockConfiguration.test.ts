import { ChatClient } from '@twurple/chat';
import logger from '../src/util/logger';

describe('shared test mocks', () => {
	it('maps Twurple chat to the root mock', () => {
		const mock = jest.requireActual<typeof import('../__mock__/@twurple_chat')>('../__mock__/@twurple_chat');
		expect(ChatClient).toBe(mock.ChatClient);
	});

	it('keeps the logger auto-mocked after modules are reset', () => {
		expect(jest.isMockFunction(logger.info)).toBe(true);
		jest.resetModules();
		const reloaded = require('../src/util/logger') as typeof import('../src/util/logger');
		expect(jest.isMockFunction(reloaded.default.info)).toBe(true);
	});
});
