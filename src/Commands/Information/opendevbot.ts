import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';

const opendevbot: Command = {
	name: 'opendevbot',
	description: 'Information about OpenDevBot',
	usage: '!opendevbot',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
		chatClient.say(channel, 'Open dev bot is a custom Twitch Chatbot created by me using Discord.js and @twurple Library, Twurple: https://twurple.js.org/ OpenDevBot is opensource check it out with the !socials github command for its source code.');
	}
};
export default opendevbot;