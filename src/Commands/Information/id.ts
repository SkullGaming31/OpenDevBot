import { PrivateMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';

const id: Command = {
	name: 'id',
	description: 'lookup your channel id',
	usage: '!id (name)',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const userApiClient = await getUserApi();
		const chatClient = await getChatClient();
    
		const display = msg.userInfo.displayName;
		const userToLookup = args[0] ? args[0].replace('@', '') : msg.userInfo.userId;
		const userLookup = await userApiClient.users.getUserByName(userToLookup);
		try {
			if (userLookup) {
				chatClient.say(channel, `${display} your TwitchId is ${userLookup.id}`);
			} else {
				chatClient.say(channel, `${display} could not find user ${userToLookup}`);
			}
		} catch (err: any) {
			console.error(err.message);
		}
	}
};
export default id;