import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { userID } from '../../util/constants';

const category: Command = {
	name: 'category',
	description: 'Displays The category the streamer is streaming in',
	usage: '!category',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const display = msg.userInfo.displayName;
		const userApiClient = await getUserApi();
		const broadcasterID = await userApiClient.channels.getChannelInfoById(userID);
		if (broadcasterID?.id === undefined) return;
		console.log(` categoryID: ${broadcasterID?.gameId}`);
		const chatClient = await getChatClient();

		await chatClient.say(channel, `${display}, ${broadcasterID?.displayName} is currently streaming in ${broadcasterID?.gameName}`);
	},
};

export default category;