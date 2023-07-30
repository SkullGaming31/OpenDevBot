import { ChatMessage } from '@twurple/chat/lib';
import countdown from 'countdown';

import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';

const followage: Command = {
	name: 'followage',
	description: 'shows how long you have been following the streamer',
	usage: '!followage',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const display = msg.userInfo.displayName;
		const broadcasterId = msg.channelId!;
		const { data: [follow] } = await userApiClient.channels.getChannelFollowers(broadcasterId, msg.userInfo.userId);
		if (follow) {
			const followStartTimestamp = follow.followDate.getTime();
			chatClient.say(channel, `@${display} You have been following for ${countdown(new Date(followStartTimestamp))}!`);
		}
		else {
			chatClient.say(channel, `@${display} You are not following!`);
		}
	}
};
export default followage;