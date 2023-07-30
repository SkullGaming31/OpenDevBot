import { UserIdResolvable } from '@twurple/api/lib';
import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { broadcasterInfo } from '../../util/constants';

const clipCommand: Command = {
	name: 'clip',
	description: 'Create a clip in the stream',
	usage: '!clip',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();

		if (broadcasterInfo) {
			const stream = await userApiClient.streams.getStreamByUserId(broadcasterInfo.id as UserIdResolvable);

			if (stream !== null) {
				if (msg.userInfo.isBroadcaster || msg.userInfo.isMod || msg.userInfo.isSubscriber || msg.userInfo.isVip) {
					const clipId = await userApiClient.clips.createClip({ channel: broadcasterInfo.id as UserIdResolvable, createAfterDelay: false });
					const clipUrl = `https://clips.twitch.tv/${clipId}`;
					chatClient.say(channel, `Clip Created: ${clipUrl}`);
					// Code for using the clip URL
				} else {
					chatClient.say(channel, 'You must be the broadcaster, mod, sub, or a VIP to use this command.');
				}
			} else {
				chatClient.say(channel, 'The stream must be live to use this command.');
			}
		} else {
			console.error('Broadcaster info is undefined.');
		}
	}
};
export default clipCommand;