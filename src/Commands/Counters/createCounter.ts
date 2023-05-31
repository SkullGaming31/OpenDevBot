import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Counter, CounterModel } from '../../database/models/counterModel';
import { Command } from '../../interfaces/apiInterfaces';

const createcounter: Command = {
	name: 'counter',
	description: 'create remove and list counters',
	usage: '!createcounter [create|remove|list] countername',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		console.log('we hit the counter command');
		const chatClient = await getChatClient();

		if (args.length !== 2 || !['create', 'remove', 'list'].includes(args[0])) {
			// Invalid command usage, display usage guide
			await chatClient.say(channel, `Usage: ${createcounter.usage}`);
			return;
		}
		const counterName = args[1];
		try {
			switch (args[0]) {
			case 'create':
				// Create a new counter
				await createCounter(counterName);
				await chatClient.say(channel, `Counter "${counterName}" created.`);
				break;
			case 'remove':
				// Remove a counter
				await removeCounter(counterName);
				await chatClient.say(channel, `Counter "${counterName}" removed.`);
				break;
			case 'list':
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
	return CounterModel.find({});
}

export default createcounter;
