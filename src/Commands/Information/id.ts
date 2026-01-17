import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import logger from '../../util/logger';

const id: Command = {
	name: 'id',
	description: 'lookup your channel id',
	devOnly: false,
	usage: '!id (name)',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		void user; void text;
		const userApiClient = await getUserApi();
		const chatClient = await getChatClient();

		const userToLookup = args[0] ? args[0].replace('@', '') : msg.userInfo.userId;
		const userLookup = await userApiClient.users.getUserByName(userToLookup);
		try {
			if (userLookup) {
				await chatClient.say(channel, `${msg.userInfo.displayName}, the Twitch ID for ${userLookup.displayName} is ${userLookup.id}`);
			} else {
				if (args[0]) {
					chatClient.say(channel, `${msg.userInfo.displayName}, could not find user ${args[0]}`);
				} else {
					chatClient.say(channel, `${msg.userInfo.displayName}, your Twitch ID is ${userToLookup}`);
				}
			}
		} catch (err: unknown) {
			if (err instanceof Error) logger.error(err.message);
			else logger.error(String(err));
		}
	}
};
export default id;