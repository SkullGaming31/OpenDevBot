import { ChatMessage } from '@twurple/chat/lib';
import countdown from 'countdown';

import { UserIdResolvable } from '@twurple/api';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { broadcasterInfo } from '../../util/constants';

const uptime: Command = {
	name: 'uptime',
	description: 'Shows the uptime of the streamer',
	usage: '!uptime',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const userApiClient = await getUserApi();
		const chatClient = await getChatClient();

		const broadcasterResponse = await userApiClient.channels.getChannelInfoById(broadcasterInfo?.id as UserIdResolvable);
		if (broadcasterResponse?.id === undefined) return;
		const stream = await userApiClient.streams.getStreamByUserId(broadcasterInfo?.id as UserIdResolvable);
		switch (channel) {
			case 'canadiendragon':
				if (stream !== null) {
					const uptime = countdown(new Date(stream.startDate));
					await chatClient.say(channel, `${msg.userInfo.displayName}, the stream has been live for ${uptime}`);
				}
				else {
					return chatClient.say(channel, 'the Stream is currently Offline');
				}
				break;
		}
	}
};
export default uptime;