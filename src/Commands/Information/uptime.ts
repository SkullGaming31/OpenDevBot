import { ChatMessage } from '@twurple/chat/lib';
import countdown from 'countdown';
import type { ApiClient, UserIdResolvable } from '@twurple/api';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { broadcasterInfo } from '../../util/constants';
import logger from '../../util/logger';

const uptime: Command = {
	name: 'uptime',
	description: 'Shows the uptime of the streamer',
	usage: '!uptime',
	/**
	 * @description
	 * Executes the uptime command.
	 *
	 * @param {string} channel - The channel that the command was triggered in.
	 * @param {string} user - The user that triggered the command.
	 * @param {string[]} args - The arguments that were passed to the command.
	 * @param {string} text - The full text of the message that triggered the command.
	 * @param {ChatMessage} msg - The message instance that triggered the command.
	 *
	 * @returns {Promise<void>} The result of the command execution.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		try {
			const userApiClient = await getUserApi();
			const broadcasterResponse = await getUserBroadcasterInfo(userApiClient);
			if (!broadcasterResponse) {
				return chatClient.say(channel, 'Unable to retrieve broadcaster information');
			}
			const stream = await getStreamByUserId(userApiClient, broadcasterResponse.id);
			if (!stream) {
				return chatClient.say(channel, 'The stream is currently offline');
			}
			const uptime = countdown(new Date(stream.startDate));
			await chatClient.say(channel, `${msg.userInfo.displayName}, the stream has been live for ${uptime}`);
		} catch (error) {
			logger.error(error);
			await chatClient.say(channel, 'An error occurred while retrieving the stream uptime');
		}
	},
};

/**
 * Retrieves the broadcaster information from the API client.
 *
 * @param {ApiClient} userApiClient - The Twitch API client instance.
 *
 * @returns {Promise<HelixChannel | null>} The broadcaster information if the request is successful, otherwise null.
 */
async function getUserBroadcasterInfo(userApiClient: ApiClient) {
	const broadcasterResponse = await userApiClient.channels.getChannelInfoById(broadcasterInfo[0].id as UserIdResolvable);
	return broadcasterResponse?.id !== undefined ? broadcasterResponse : null;
}

/**
 * Retrieves the stream information for a specified user ID.
 *
 * @param {ApiClient} userApiClient - The Twitch API client instance.
 * @param {UserIdResolvable} userId - The user ID for which to retrieve the stream information.
 *
 * @returns {Promise<HelixStream | null>} The stream information if the user is currently streaming, otherwise null.
 */
async function getStreamByUserId(userApiClient: ApiClient, userId: UserIdResolvable) {
	return await userApiClient.streams.getStreamByUserId(userId) || null;
}

export default uptime;