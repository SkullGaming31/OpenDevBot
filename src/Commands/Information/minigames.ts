import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import logger from '../../util/logger';

const minigames: Command = {
	name: 'minigame',
	description: 'Show a list of all the minigames included in the bot',
	usage: '!minigame',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		void text;
		try {
			const chatClient = await getChatClient();

			const targetUsername = args[0]?.replace('@', '') || msg.userInfo.userName;

			if (!targetUsername) {
				return chatClient.say(channel, `Usage: ${minigames.usage}`);
			}
			await chatClient.say(channel, `${targetUsername} all minigames for this channel are: !roulette, !beg, !dig, !duel, !gamble, !heist(2+ players), !loot, have any other suggestions use the !feature command`);
		} catch (error) {
			const chatClient = await getChatClient();
			logger.error('Error showing minigames:', error);
			await chatClient.say(channel, `${user}, there was an error Showing all the minigames for the channel`);
		}
	}
};

export default minigames;