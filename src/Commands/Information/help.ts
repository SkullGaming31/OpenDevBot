import { PrivateMessage } from '@twurple/chat/lib';
import { commands, getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';

const help: Command = {
	name: 'help',
	description: 'displays a list of commands in the chat',
	usage: '!help',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
		const commandsList = Array.from(commands.values()).join(', ');
		chatClient.say(channel, `The available commands are: ${commandsList}`);
	}
};

export default help;
