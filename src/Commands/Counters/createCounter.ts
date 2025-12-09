import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Counter, CounterModel } from '../../database/models/counterModel';
import { Command } from '../../interfaces/Command';
import logger from '../../util/logger';

const createcounter: Command = {
	name: 'createcounter',
	description: 'create remove and list counters',
	usage: '!createcounter [create|remove|list] countername',
	/**
	 * Executes the createcounter command, allowing users to create, remove, or list counters.
	 * 
	 * @param {string} channel - The channel in which the command is executed.
	 * @param {string} user - The user who triggered the command.
	 * @param {string[]} args - The arguments passed with the command.
	 * @param {string} text - The full text of the message.
	 * @param {ChatMessage} msg - The chat message object containing additional metadata.
	 * 
	 * The command supports the following options:
	 * - 'create <counterName>': Creates a new counter with the specified name.
	 * - 'remove <counterName>': Removes the specified counter.
	 * - 'list': Lists all existing counters.
	 * 
	 * Provides usage instructions if the command or arguments are invalid, and handles errors during execution.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		void user; void text; void msg;
		// logger.info('we hit the counter command');
		const chatClient = await getChatClient();

		if (args.length === 0 || !['create', 'remove', 'list'].includes(args[0])) return chatClient.say(channel, `Usage: ${createcounter.usage}`);
		try {
			switch (args[0]) {
				case 'create':
					if (args.length !== 2) {
						await chatClient.say(channel, 'Invalid usage for create command. Usage: !createcounter create countername');
						return;
					}
					// Create a new counter
					const counterNameCreate = args[1];
					await createCounter(counterNameCreate);
					logger.debug('creating counter', { name: counterNameCreate });
					await chatClient.say(channel, `Counter "${counterNameCreate}" created.`);
					break;
				case 'remove':
					if (args.length !== 2) {
						await chatClient.say(channel, 'Invalid usage for remove command. Usage: !createcounter remove countername');
						return;
					}
					// Remove a counter
					const counterNameRemove = args[1];
					await removeCounter(counterNameRemove);
					await chatClient.say(channel, `Counter "${counterNameRemove}" removed.`);
					break;
				case 'list':
					if (args.length !== 1) {
						await chatClient.say(channel, 'Invalid usage for list command. Usage: !createcounter list');
						return;
					}
					// List all counters
					const counters = await listCounters();
					if (counters.length === 0) {
						await chatClient.say(channel, 'No counters found.');
					} else {
						const counterNames = counters.map(counter => counter.counterName).join(', ');
						await chatClient.say(channel, `Counters: ${counterNames}`);
					}
					break;
				default:
					await chatClient.say(channel, `Invalid command option: ${args[0]}`);
					break;
			}
		} catch (error) {
			logger.error('error creating counter', error as Error);
			await chatClient.say(channel, 'An error occurred while executing the command.');
		}
	}
};

/**
 * Creates a new counter with the specified name and initializes its value to 0.
 * @param {string} counterName - The name of the counter to create.
 * @returns {Promise<void>} - A promise that resolves when the counter is created.
 */
async function createCounter(counterName: string): Promise<void> {
	await CounterModel.create({ counterName, value: 0 });
}

/**
 * Removes a counter with the specified name.
 * @param {string} counterName - The name of the counter to remove.
 * @returns {Promise<void>} - A promise that resolves when the counter is removed.
 */
async function removeCounter(counterName: string): Promise<void> {
	await CounterModel.findOneAndDelete({ counterName });
}

/**
 * Finds all counters in the database and returns them in an array.
 * @returns {Promise<Counter[]>} - A promise that resolves with an array of Counter objects.
 */
async function listCounters(): Promise<Counter[]> {
	return CounterModel.find();
}

export default createcounter;