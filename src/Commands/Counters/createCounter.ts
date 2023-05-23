import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import CounterModel, { Counter } from '../../database/models/counterModel';
import { Command } from '../../interfaces/apiInterfaces';

const createCounter: Command = {
	name: 'createCounter',
	description: 'Create or remove a counter from the database',
	usage: '!createCounter [create|remove] <counterName>',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
		console.log('Text: ' + text);
		const [subcommand, counterName] = args;

		if (!subcommand || !counterName) { return chatClient.say(channel, `Invalid command usage. Usage: ${createCounter.usage}`); }

		if (!msg.userInfo.isBroadcaster || !msg.userInfo.isMod) return chatClient.say(channel, 'You must be the broadcaster or Moderator of the channel to use this command');

		console.log('SubCommand: ' + subcommand);
		console.log('CounterName: ' + counterName);
		try {
			switch (subcommand) {
			case 'create':
				try {
					const existingCounter = await CounterModel.findOne<Counter>({ counterName: counterName });
	
					if (existingCounter) { return chatClient.say(channel, `Counter '${counterName}' already exists.`); }
	
					const newCounter = new CounterModel();
					newCounter.counterName = counterName;
					newCounter.value = 0;
					await newCounter.save();
					await chatClient.say(channel, `Counter '${counterName}' created successfully.`);
				} catch (error) {
					console.error(error);
				}
				break;

			case 'remove':
				const removedCounter = await CounterModel.findOneAndDelete<Counter>({ counterName: counterName });

				if (!removedCounter) { return chatClient.say(channel, `Counter '${counterName}' does not exist.`);}

				await chatClient.say(channel, `Counter '${counterName}' removed successfully.`);
				break;

			default:
				await chatClient.say(channel, `Invalid subcommand. Usage: ${createCounter.usage}`);
				break;
			}
		} catch (error) {
			await chatClient.say(channel, 'Error performing the counter operation.');
			console.error(error);
		}
	}
};
export default createCounter;
