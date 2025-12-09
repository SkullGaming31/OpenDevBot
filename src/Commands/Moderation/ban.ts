import type { UserIdResolvable, UserNameResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { CommandUsageWebhookTOKEN, broadcasterInfo, commandUsageWebhookID } from '../../util/constants';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import logger from '../../util/logger';

const ban: Command = {
	name: 'ban',
	description: 'Ban a user from your Twitch chat',
	usage: '!ban [@name] (reason)',
	/**
	 * Ban a user from your Twitch chat
	 * @param channel - The channel to ban the user from
	 * @param user - The user to ban
	 * @param args - The reason for the ban
	 * @param text - The text of the command
	 * @param msg - The message that triggered the command
	 * @returns {Promise<void>}
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		void user; void text;
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUsageWebhookTOKEN });

		const display = msg.userInfo.displayName;
		const channelEditor = await userApiClient.channels.getChannelEditors(broadcasterInfo[0].id as UserIdResolvable);
		const isEditor = channelEditor.some(editor => editor.userId === msg.userInfo.userId);

		try {
			if (!args[0]) {
				chatClient.say(channel, `${display}, Usage: ${ban.usage}`);
				return;
			}

			const reason = args.slice(1).join(' ') || 'No Reason Provided';
			const username = args[0].replace('@', '');
			const userSearch = await userApiClient.users.getUserByName(username);

			if (!userSearch?.id) {
				return chatClient.say(channel, `${display}, User not found.`);
			}

			// Check if the user is a mod or broadcaster
			if (!msg.userInfo.isBroadcaster && !isEditor && !msg.userInfo.isMod) {
				return chatClient.say(channel, `${display}, You don't have permission to use this command. Permission[Broadcaster, Moderator, ChannelEditor]`);
			}

			// Retrieve broadcaster information
			const broadcaster = await userApiClient.users.getUserByName(channel as UserNameResolvable);
			if (!broadcaster) {
				return chatClient.say(channel, `Could not find broadcaster information for channel: ${channel}`);
			}

			const commandUsageEmbed = new EmbedBuilder()
				.setTitle('CommandUsage[Ban]')
				.setAuthor({ name: msg.userInfo.displayName, iconURL: userSearch.profilePictureUrl })
				.setDescription(reason)
				.setColor('Red')
				.addFields([
					{ name: 'Executer', value: msg.userInfo.displayName, inline: true },
					...(msg.userInfo.isMod
						? [{ name: 'Mod', value: 'Yes', inline: true }]
						: msg.userInfo.isBroadcaster
							? [{ name: 'Broadcaster', value: 'Yes', inline: true }]
							: []
					)
				])
				.setFooter({ text: `${msg.userInfo.displayName} just banned ${userSearch.displayName} in ${channel}'s twitch channel` })
				.setTimestamp();

			// Ban the user
			await userApiClient.moderation.banUser(broadcaster.id as UserIdResolvable, { user: userSearch.id, reason });
			// Send chat message about the ban
			await chatClient.say(channel, `${username} has been banned for Reason: ${reason}`);
			// Send the embed
			await commandUsage.send({ embeds: [commandUsageEmbed] });
		} catch (error) {
			logger.error('Error executing ban command:', error);
		}
	}
};
export default ban;