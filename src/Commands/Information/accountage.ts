import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import logger from '../../util/logger';

const accountage: Command = {
	name: 'accountage',
	description: 'Show how long ago you created your twitch account',
	usage: '!accountage',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		try {
			const userApiClient = await getUserApi();
			const chatClient = await getChatClient();

			const targetUsername = args[0]?.replace('@', '') || msg.userInfo.userName;

			if (!targetUsername) {
				return chatClient.say(channel, `Usage: ${accountage.usage}`);
			}

			const account = await userApiClient.users.getUserByName(targetUsername);
			if (account) {
				await chatClient.say(channel, `${account.creationDate}`);
			} else {
				await chatClient.say(channel, `${user}, that name could not be found`);
			}
		} catch (error) {
			const chatClient = await getChatClient();
			logger.error('Error fetching account age', error as Error);
			await chatClient.say(channel, `${user}, there was an error retrieving account information.`);
		}
	}
};
export default accountage;