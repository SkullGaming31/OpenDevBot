import { PrivateMessage } from '@twurple/chat/lib';
import countdown from 'countdown';

import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { userID } from '../../util/constants';

const uptime: Command = {
	name: 'uptime',
	description: 'Shows the uptime of the streamer',
	usage: '!uptime',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const userApiClient = await getUserApi();
		const chatClient = await getChatClient();

		const display = msg.userInfo.displayName;
		const broadcasterID = await userApiClient.channels.getChannelInfoById(userID);
		if (broadcasterID?.id === undefined) return;
		const stream = await userApiClient.streams.getStreamByUserId(broadcasterID?.id!);
		switch (channel) {
		case '#canadiendragon':
			if (stream) {
				const uptime = countdown(new Date(stream.startDate));
				chatClient.say(channel, `${display}, the stream has been live for ${uptime}`);
			}
			else {
				return chatClient.say(channel, 'the Stream is currently Offline');
			}
			break;
		}
	}
};
export default uptime;