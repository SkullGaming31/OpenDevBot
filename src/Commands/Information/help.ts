import { ChatMessage } from '@twurple/chat/lib';
import { commands, getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';

const command: Command = {
	name: 'help',
	description: 'displays a list of commands in the chat',
	usage: '!help',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const commandsList = Array.from(commands.values()).join(', ');

		// Check if the commands list exceeds 500 characters
		if (commandsList.length > 500) {
			const messages = splitIntoMessages(commandsList, 500);
			for (const message of messages) {
				await chatClient.say(channel, message);
			}
		} else {
			await chatClient.say(channel, `The available commands are: ${commandsList}`);
		}
	}
};
export default command;

function splitIntoMessages(text: string, maxLength: number): string[] {
	const messages: string[] = [];
	let currentMessage = '';
	const words = text.split(' ');

	for (const word of words) {
		if (currentMessage.length + word.length + 1 <= maxLength) {
			currentMessage += word + ' ';
		} else {
			messages.push(currentMessage.trim());
			currentMessage = word + ' ';
		}
	}

	if (currentMessage.trim() !== '') {
		messages.push(currentMessage.trim());
	}

	return messages;
}