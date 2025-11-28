import type { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import logger from '../../util/logger';
import { CommandUssageWebhookTOKEN, broadcasterInfo, commandUsageWebhookID } from '../../util/constants';
import { EmbedBuilder, WebhookClient } from 'discord.js';

const unmod: Command = {
	name: 'unmod',
	description: 'remove the moderator role from a user on twitch',
	usage: '!unmmod [@name]',
	/**
	 * Asynchronously removes the moderator role from a user on Twitch.
	 * 
	 * @param channel - The channel where the command is executed.
	 * @param user - The user executing the command.
	 * @param args - Arguments passed along with the command.
	 * @param text - The full text of the command message.
	 * @param msg - The message object containing details about the user and context.
	 * 
	 * @returns {Promise<void>}
	 * 
	 * @description
	 * Checks if the user is a channel editor. If so, removes the moderator role from the specified user
	 * and sends a message confirming the action. Sends an error message if the user lacks the necessary permissions.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const display = msg.userInfo.displayName;

		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });
		if (!args[0]) return chatClient.say(channel, `${display}, Usage: ${unmod.usage}`);

		const channelEditor = await userApiClient.channels.getChannelEditors(broadcasterInfo[0].id as UserIdResolvable);

		const isEditor = channelEditor.some(editor => editor.userId === msg.userInfo.userId);
		try {
			const userSearch = await userApiClient.users.getUserByName(args[0].replace('@', ''));
			if (userSearch?.id === undefined) return;

			const unModeratorEmbed = new EmbedBuilder()
				.setTitle('Command Usage[Unmod]')
				.setAuthor({ name: `${userSearch.displayName}`, iconURL: `${userSearch.profilePictureUrl}` })
				.setColor('Red')
				.addFields([
					{
						name: 'Executer',
						value: `${display}`,
						inline: true
					},
					...(isEditor
						? [{ name: 'Channel Editor', value: 'Yes', inline: true }]
						: msg.userInfo.isBroadcaster
							? [{ name: 'Broadcaster', value: 'Yes', inline: true }]
							: []
					)
				])
				.setFooter({ text: `${display} just unmodded ${args[0].replace('@', '')} in ${channel}'s twitch channel` })
				.setTimestamp();
			try {
				if (isEditor || msg.userInfo.isBroadcaster) {
					await userApiClient.moderation.removeModerator(broadcasterInfo[0].id as UserIdResolvable, userSearch?.id as UserIdResolvable);
					await chatClient.say(channel, `${userSearch.displayName} has had there moderator powers removed by ${display}`);
					await commandUsage.send({ embeds: [unModeratorEmbed] });
				} else {
					await chatClient.say(channel, 'You Must be the Broadcaster or Channel Editor to use this command');
				}
			} catch (error: unknown) {
				if (error instanceof Error) {
					logger.error(error.name + ': ' + error.message, error.stack);
					await chatClient.say(channel, `${error.message}`);
				} else {
					logger.error('Unknown error');
					await chatClient.say(channel, 'An unknown error occurred');
				}
			}
		} catch (error: unknown) {
			if (error instanceof Error) {
				logger.error(error.name + ': ' + error.message, error.stack);
				await chatClient.say(channel, `${error.message}`);
			} else {
				logger.error('Unknown error');
				await chatClient.say(channel, 'An unknown error occurred');
			}
		}
	}
};
export default unmod;