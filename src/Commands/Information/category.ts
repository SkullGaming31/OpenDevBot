import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { broadcasterInfo } from '../../util/constants';

const category: Command = {
	name: 'category',
	description: 'Shows the streamer\'s current streaming category',
	usage: '!category',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const userApiClient = await getUserApi();
		const chatClient = await getChatClient();

		const broadcasterResponse = await userApiClient.channels.getChannelInfoById(broadcasterInfo[0].id as UserIdResolvable);
		// logger.debug(broadcasterResponse);

		if (broadcasterResponse?.id === undefined) return;

		await chatClient.say(channel, `${msg.userInfo.displayName}, ${broadcasterResponse?.displayName} is currently streaming in ${broadcasterResponse?.gameName} Category`);
	},
};

export default category;