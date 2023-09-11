import { HelixModerator, UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import axios from 'axios';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { TokenModel } from '../../database/models/tokenModel';
import { Command } from '../../interfaces/apiInterfaces';
import { userID } from '../../util/constants';

axios.defaults;

const ping: Command = {
	name: 'ping',
	description: 'Displays Pong in chat',
	usage: '!ping',
	moderator: true,
	devOnly: true,
	cooldown: 30000,
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();

		const broadcasterInfo = await userApiClient.channels.getChannelInfoById(userID);
		if (!broadcasterInfo?.id) return;


		const moderatorsResponse = await userApiClient.moderation.getModerators(broadcasterInfo.id as UserIdResolvable);
		const moderatorsData = moderatorsResponse.data; // Access the moderator data

		const isModerator = moderatorsData.some(moderator => moderator.userId === msg.userInfo.userId);
		const isBroadcaster = broadcasterInfo.id === msg.userInfo.userId;
		const isStaff = isModerator || isBroadcaster;

		// Accessing and logging specific properties of each moderator
		moderatorsData.forEach((moderator: HelixModerator) => {
			console.log(
				'Moderator ID:', moderator.userId,
				'Moderator Display Name:', moderator.userDisplayName,
				'Moderator User Login:', moderator.userName);
		});

		try {
			if (!isStaff) return chatClient.say(channel, 'You do not have the required permission to use this command: Channel {Broadcaster or Moderator}');
			const pingValue = await checkTwitchApiPing();
			await chatClient.say(channel, `Im online and working correctly, Twitch API Ping: ${pingValue}ms`);
		} catch (error) {
			console.error(error);
		}
	},
};

async function checkTwitchApiPing() {
	const apiEndpoint = 'https://api.twitch.tv/helix/streams';
	const start = Date.now();

	try {
		const tbd = await TokenModel.findOne({ user_id: '31124455' });
		await axios.get(apiEndpoint, {
			headers: {
				Authorization: `Bearer ${tbd?.access_token}`,
				'Client-ID': process.env.TWITCH_CLIENT_ID as string
			}
		});
		const end = Date.now();
		const ping = end - start;

		console.log(`Twitch API Ping: ${ping} ms`);
		return ping;
	} catch (error) {
		console.error('Error:', error);
		throw error; // Rethrow the error to be caught in the calling function
	}
}

export default ping;
