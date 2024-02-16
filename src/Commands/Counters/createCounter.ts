import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Counter, CounterModel } from '../../database/models/counterModel';
import { Command } from '../../interfaces/Command';

const createcounter: Command = {
	name: 'createcounter',
	description: 'create remove and list counters',
	usage: '!createcounter [create|remove|list] countername',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		// console.log('we hit the counter command');
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
			console.error(error);
			await chatClient.say(channel, 'An error occurred while executing the command.');
		}
	}
};

async function createCounter(counterName: string): Promise<void> {
	await CounterModel.create({ counterName, value: 0 });
}

async function removeCounter(counterName: string): Promise<void> {
	await CounterModel.findOneAndDelete({ counterName });
}

async function listCounters(): Promise<Counter[]> {
	return CounterModel.find();
}

export default createcounter;