import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import axios from 'axios';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { TokenModel } from '../../database/models/tokenModel';
import { Command } from '../../interfaces/Command';
import { broadcasterInfo } from '../../util/constants';

axios.defaults;

const ping: Command = {
	name: 'ping',
	description: 'Displays Pong in chat',
	usage: '!ping [gamename]',
	moderator: true,
	devOnly: true,
	cooldown: 30000,
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();

		const broadcasterID = await userApiClient.channels.getChannelInfoById(broadcasterInfo[0].id);
		if (!broadcasterID?.id) return;


		const moderatorsResponse = await userApiClient.moderation.getModerators(broadcasterID?.id as UserIdResolvable);
		const moderatorsData = moderatorsResponse.data; // Access the moderator data

		const isModerator = moderatorsData.some(moderator => moderator.userId === msg.userInfo.userId);
		const isBroadcaster = broadcasterID.id === msg.userInfo.userId;
		const isStaff = isModerator || isBroadcaster;

		try {
			if (!args[0]) return chatClient.say(channel, 'Please Provide a Game to search the GameID for');
			const gameName = args.join(' '); // Join the args array into a string with a space separator
			const game = await userApiClient.games.getGameByName(gameName);
	
			await chatClient.say(channel, `${game?.name} Id is ${game?.id}`);
			console.log(`${game?.name} Id is ${game?.id}`);
			if (!isStaff) return chatClient.say(channel, 'You do not have the required permission to use this command: Permission - {Broadcaster or Moderator}');
			const pingValue = await checkTwitchApiPing();
			const uptime = getBotUptime(); // Get the bot uptime
			await chatClient.say(channel, `Im online and working correctly. Bot Uptime: ${uptime}. Twitch API Ping: ${pingValue}ms`);
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

function getBotUptime() {
	const uptimeMilliseconds = process.uptime() * 1000;
	const uptimeSeconds = Math.floor(uptimeMilliseconds / 1000);
	const days = Math.floor(uptimeSeconds / (3600 * 24));
	const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
	const minutes = Math.floor((uptimeSeconds % 3600) / 60);
	const seconds = uptimeSeconds % 60;

	const formattedUptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;
	return formattedUptime;
}

export default ping;