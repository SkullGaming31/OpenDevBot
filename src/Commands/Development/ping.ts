import { Command } from '../../interfaces/Command';
import logger from '../../util/logger';
import type { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import axios from 'axios';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { TokenModel } from '../../database/models/tokenModel';
import { broadcasterInfo } from '../../util/constants';

axios.defaults;

const ping: Command = {
	name: 'ping',
	description: 'Displays Pong in chat',
	usage: '!ping [gamename]',
	moderator: false,
	devOnly: true,
	cooldown: 30000,
	/**
	 * Executes the ping command.
	 *
	 * @param channel The channel that the command was triggered in.
	 * @param user The user that triggered the command.
	 * @param args The arguments that were passed to the command.
	 * @param text The full text of the message that triggered the command.
	 * @param msg The message instance that triggered the command.
	 *
	 * @returns {Promise<void>} The result of the command execution.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage): Promise<void> => {
		void user; void text;
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
			if (channel !== 'canadiendragon') return;

			if (!isStaff) {
				return chatClient.say(channel, 'You do not have the required permission to use this command: Permission - {Broadcaster or Moderator}');
			}
			const mode = args.length > 0 ? args[0].toLowerCase() : 'noargs';

			switch (mode) {
				case 'status':
					try {
						const [twitchMs, discordMs, mongoMs] = await Promise.all([
							checkTwitchApiPing().catch(() => -1),
							checkDiscordApiPing().catch(() => -1),
							checkMongo().catch(() => -1),
						]);
						const twitchStr = twitchMs >= 0 ? `${twitchMs}ms` : 'UNREACHABLE';
						const discordStr = discordMs >= 0 ? `${discordMs}ms` : 'UNREACHABLE';
						const mongoStr = mongoMs >= 0 ? `${mongoMs}ms` : 'UNREACHABLE';
						await chatClient.say(channel, `Status — Twitch API: ${twitchStr}; Discord: ${discordStr}; MongoDB: ${mongoStr}`);
					} catch (e) {
						logger.error('Error running status checks', e as Error);
						await chatClient.say(channel, 'Error running status checks');
					}
					break;
				case 'game': {
					// treat remaining input as a game name (args[1..])
					const gameName = args.slice(1).join(' ').trim();
					if (!gameName) {
						await chatClient.say(channel, 'Usage: !ping game <gamename>');
						break;
					}
					const game = await userApiClient.games.getGameByName(gameName);

					if (game) {
						await chatClient.say(channel, `${game.name} ID is ${game.id}`);
					} else {
						await chatClient.say(channel, `Game "${gameName}" not found.`);
					}
					break;
				}
				default:
					const pingValue = await checkTwitchApiPing();
					const uptime = getBotUptime();
					await chatClient.say(channel, `I'm online and working correctly. Bot Uptime: ${uptime}. Twitch API Ping: ${pingValue}ms`);
					break;
			}
		} catch (error) {
			logger.error('Error executing ping command', error as Error);
		}
	},
};

async function checkTwitchApiPing(): Promise<number> {
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

		logger.debug('Twitch API ping measured', { ping });
		return ping;
	} catch (error) {
		logger.error('Error checking Twitch API ping', error as Error);
		throw error;
	}
}


async function checkDiscordApiPing(): Promise<number> {
	const start = Date.now();
	try {
		// Simple reachability check to Discord (no auth)
		await axios.get('https://discord.com', { timeout: 5000 });
		const end = Date.now();
		return end - start;
	} catch (error) {
		logger.error('Error checking Discord API reachability', error as Error);
		throw error;
	}
}

async function checkMongo(): Promise<number> {
	const start = Date.now();
	try {
		// perform a lightweight query to ensure DB connectivity
		await TokenModel.findOne({}).lean().exec();
		const end = Date.now();
		return end - start;
	} catch (error) {
		logger.error('Error checking MongoDB connectivity', error as Error);
		throw error;
	}
}


function getBotUptime(): string {
	const uptimeMilliseconds = process.uptime() * 1000;
	const uptimeSeconds = Math.floor(uptimeMilliseconds / 1000);
	const days = Math.floor(uptimeSeconds / (3600 * 24));
	const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
	const minutes = Math.floor((uptimeSeconds % 3600) / 60);
	const seconds = uptimeSeconds % 60;

	const formattedUptime = `${days} days ${hours} hours ${minutes} minutes ${seconds} seconds`;
	return formattedUptime;
}

export default ping;