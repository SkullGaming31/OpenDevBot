import type { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { CommandUsageWebhookTOKEN, broadcasterInfo, commandUsageWebhookID } from '../../util/constants';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { sleep } from '../../util/util';
import logger from '../../util/logger';

const mod: Command = {
	name: 'mod',
	description: 'Mod a user in your Twitch chat',
	usage: '!mod [@name]',
	/**
	 * Mod a user in your Twitch chat
	 * @param channel The channel to mod the user in
	 * @param user The user to mod
	 * @param args The user to mod
	 * @param text The text of the command
	 * @param msg The message that triggered the command
	 * @returns {Promise<void>}
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUsageWebhookTOKEN });

		const display = msg.userInfo.displayName;

		try {
			if (!args[0]) {
				await chatClient.say(channel, `${display}, Usage: ${mod.usage}`);
				return;
			}

			const username = args[0].replace('@', '');
			const userSearch = await userApiClient.users.getUserByName(username);

			if (!userSearch?.id) {
				await chatClient.say(channel, `User ${username} not found`);
				return;
			}

			const channelEditors = await userApiClient.channels.getChannelEditors(broadcasterInfo[0].id as UserIdResolvable);
			const isChannelEditor = channelEditors.some(editor => editor.userId === msg.userInfo.userId);

			const moderatorEmbed = new EmbedBuilder()
				.setTitle('Twitch Event[Channel Mod Added]')
				.setAuthor({ name: `${userSearch.displayName}`, iconURL: `${userSearch.profilePictureUrl}` })
				.setColor('Blue')
				.addFields([
					{
						name: 'Executer',
						value: `${msg.userInfo.displayName}`,
						inline: true
					},
					{
						name: 'Role',
						value: msg.userInfo.isMod ? 'Mod' : msg.userInfo.isBroadcaster ? 'Broadcaster' : 'Viewer',
						inline: true
					}
				])
				.setFooter({ text: `${display} just modded ${username} in ${channel}'s Twitch channel` })
				.setTimestamp();

			if (isChannelEditor || msg.userInfo.isBroadcaster) {
				await userApiClient.channels.removeVip(broadcasterInfo[0].id, userSearch.id);
				sleep(3000);
				await userApiClient.moderation.addModerator(broadcasterInfo[0].id as UserIdResolvable, userSearch.id);
				await chatClient.say(channel, `${username} has been given moderator powers by ${display}`);
			} else {
				await chatClient.say(channel, 'You must be a channel editor to use this command');
			}

			await commandUsage.send({ embeds: [moderatorEmbed] });
		} catch (error) {
			logger.error('Error in mod command:', error);
			await chatClient.say(channel, 'An error occurred while processing your request');
		}
	}
};

export default mod;