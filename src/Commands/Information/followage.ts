import { ChatMessage } from '@twurple/chat/lib';
import countdown from 'countdown';

import { UserIdResolvable } from '@twurple/api';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { broadcasterInfo } from '../../util/constants';

const followage: Command = {
	name: 'followage',
	description: 'shows how long you have been following the streamer',
	usage: '!followage',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();

		const { data: [follow] } = await userApiClient.channels.getChannelFollowers(broadcasterInfo[0].id as UserIdResolvable, msg.userInfo.userId);
		if (follow) {
			const followStartTimestamp = follow.followDate.getTime();
			await chatClient.say(channel, `@${msg.userInfo.displayName} You have been following for ${countdown(new Date(followStartTimestamp))}!`);
		} else if (msg.userInfo.isBroadcaster) {
			await chatClient.say(channel, 'You cant follow your own channel');
		}
		else {
			await chatClient.say(channel, `@${msg.userInfo.displayName} You are not following!`);
		}
	}
};
export default followage;