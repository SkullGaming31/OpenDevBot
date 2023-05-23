import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import CounterModel, { Counter } from '../../database/models/counterModel';
import { Command } from '../../interfaces/apiInterfaces';

const counter: Command = {
	name: 'counter',
	description: 'Set a counter to be displayed in twitch chat!',
	usage: '!counter [set|inc] <counterName> <amount>, !counter reset <counterName>',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();

		// Check the subcommand and counter name
		const [subcommand, counterName, amountStr] = args;
		const amount = parseInt(amountStr);

		// Find the counter in the database
		let selectedCounter: Counter | null;

		try {
			selectedCounter = await CounterModel.findOne<Counter>({ counterName: counterName });
		} catch (error) {
			chatClient.say(channel, 'Error finding the counter.');
			console.error(error);
			return;
		}

		if (!selectedCounter) { return chatClient.say(channel, `Counter '${counterName}' not found.`); }

		switch (subcommand) {
		case 'set':
			if (isNaN(amount)) { return chatClient.say(channel, `Invalid amount. Usage: ${counter.usage}`); }

			try {
				// Set the counter to a specific value in the database
				selectedCounter.value = amount;
				await selectedCounter.save();
				chatClient.say(channel, `${selectedCounter.counterName} counter set to ${selectedCounter.value}`);
			} catch (error) {
				await chatClient.say(channel, 'Error setting the counter.');
				console.error(error);
			}
			break;

		case 'inc':
			if (isNaN(amount)) {
				chatClient.say(channel, `Invalid amount. Usage: ${counter.usage}`);
				return;
			}

			try {
				// Increment the counter by a specific amount in the database
				selectedCounter.value += amount;
				await selectedCounter.save();
				chatClient.say(
					channel,
					`${selectedCounter.counterName} counter incremented by ${amount} to ${selectedCounter.value}`
				);
			} catch (error) {
				chatClient.say(channel, 'Error incrementing the counter.');
				console.error(error);
			}
			break;

		case 'reset':
			try {
				// Reset the counter to 0 in the database
				selectedCounter.value = 0;
				await selectedCounter.save();
				chatClient.say(channel, `${selectedCounter.counterName} counter reset to 0`);
			} catch (error) {
				chatClient.say(channel, 'Error resetting the counter.');
				console.error(error);
			}
			break;

		default:
			chatClient.say(channel, `Invalid subcommand. Usage: ${counter.usage}`);
			break;
		}
	},
};
export default counter;