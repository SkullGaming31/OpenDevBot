import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { CounterModel } from '../../database/models/counterModel';
import { Command } from '../../interfaces/apiInterfaces';

const counter: Command = {
	name: 'counter',
	description: 'test',
	usage: '!counter <set|inc|reset> <counterName> <value>',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();

		if (args.length < 2 || !['set', 'inc', 'reset'].includes(args[0])) {
			await chatClient.say(channel, `Usage: ${counter.usage}`);
			return;
		}

		const option = args[0];
		const counterName = args[1];
		let value;

		switch (option) {
		case 'set':
			// Set the counter to the specified value
			if (args.length < 3) {
				await chatClient.say(channel, 'Invalid value. Usage: !counter set <counterName> <value>');
				return;
			}
			value = parseInt(args[2], 10);
			if (isNaN(value)) {
				await chatClient.say(channel, 'Invalid value. Usage: !counter set <counterName> <value>');
				return;
			}
			await setCounterValue(counterName, value);
			await chatClient.say(channel, `Counter "${counterName}" set to ${value}.`);
			break;
		case 'inc':
			// Increment the counter by the specified value
			if (args.length < 3) {
				await chatClient.say(channel, 'Invalid value. Usage: !counter inc <counterName> <value>');
				return;
			}
			value = parseInt(args[2], 10);
			if (isNaN(value)) {
				await chatClient.say(channel, 'Invalid value. Usage: !counter inc <counterName> <value>');
				return;
			}
			await incrementCounterValue(counterName, value);
			const updatedValue = await getCounterValue(counterName);
			await chatClient.say(channel, `Counter "${counterName}" incremented by ${value}. New value: ${updatedValue}.`);
			break;
		case 'reset':
			// Reset the counter to 0
			await resetCounterValue(counterName);
			await chatClient.say(channel, `Counter "${counterName}" reset to 0.`);
			break;
		default:
			await chatClient.say(channel, `Invalid command option: ${option}`);
			break;
		}
	}
};
export default counter;

async function setCounterValue(counterName: string, value: number): Promise<void> {
	await CounterModel.updateOne({ counterName }, { value });
}
async function incrementCounterValue(counterName: string, incrementBy: number): Promise<void> {
	await CounterModel.findOneAndUpdate({ counterName }, { $inc: { value: incrementBy } });
}

async function getCounterValue(counterName: string): Promise<number> {
	const counter = await CounterModel.findOne({ counterName });
	return counter?.value || 0;
}

async function resetCounterValue(counterName: string): Promise<void> {
	await CounterModel.updateOne({ counterName }, { value: 0 });
}
