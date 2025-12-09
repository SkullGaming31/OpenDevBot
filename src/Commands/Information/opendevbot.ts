import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';

const opendevbot: Command = {
	name: 'opendevbot',
	aliases: ['odb'],
	description: 'Information about OpenDevBot',
	usage: '!opendevbot',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		void user; void args; void text; void msg;
		const chatClient = await getChatClient();
		const msgToSend = 'I have developed Open Dev Bot, a personalized Twitch Chatbot utilizing discord.js and the @twurple Library. Twurple is a JavaScript library available at https://twurple.js.org/. OpenDevBot is an open-source project, and you can explore its source code by executing the "!socials github" command.';
		await chatClient.say(channel, msgToSend);
	}
};
export default opendevbot;