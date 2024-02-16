import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';

const accountage: Command = {
	name: 'accountage',
	description: 'Show how long ago you created your twitch account',
	usage: '!accountage',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const userApiClient = await getUserApi();
		const chatClient = await getChatClient();

		const account = await userApiClient.users.getUserByName(args[0].replace('@', '') || msg.userInfo.userName);
		if (account) {
			await chatClient.say(channel, `${account.creationDate}`);
		} else {
			await chatClient.say(channel, `${user}, that name could not be found`);
		}
	}
};
export default accountage;