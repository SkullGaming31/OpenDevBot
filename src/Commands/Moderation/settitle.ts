import type { UserIdResolvable, UserNameResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import logger from '../../util/logger';
import { CommandUsageWebhookTOKEN, commandUsageWebhookID } from '../../util/constants';
import { EmbedBuilder, WebhookClient } from 'discord.js';

const settitle: Command = {
	name: 'settitle',
	description: 'Set the Channels title',
	usage: '!settitle [title]',
	/**
	 * Updates the channel's title if the user has appropriate permissions.
	 * 
	 * @param channel - The channel where the command is executed.
	 * @param user - The user executing the command.
	 * @param args - Arguments passed along with the command; expected to contain the new title.
	 * @param text - The full text of the command message.
	 * @param msg - The message object containing details about the user and context.
	 * 
	 * @returns {Promise<void>}
	 * 
	 * @throws Will log an error if updating the channel title fails.
	 * 
	 * Checks if the user is a moderator, broadcaster, or channel editor. If so, updates the channel's title
	 * and sends a confirmation message. Sends a usage message if no arguments are provided or an access
	 * denied message if the user lacks the necessary permissions.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const userApiClient = await getUserApi();
		void user; void text;
		const chatClient = await getChatClient();
		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUsageWebhookTOKEN });

		if (!args[0]) return chatClient.say(channel, `Usage: ${settitle.usage}`);

		const title = args.join(' ');
		const broadcaster = await userApiClient.users.getUserByName(channel as UserNameResolvable);

		if (!broadcaster) {
			return chatClient.say(channel, `Could not find broadcaster information for channel: ${channel}`);
		}

		const broadcasterResponse = await userApiClient.channels.getChannelInfoById(broadcaster.id as UserIdResolvable);
		const channelEditor = await userApiClient.channels.getChannelEditors(broadcaster.id as UserIdResolvable);

		const isEditor = channelEditor.some(editor => editor.userId === msg.userInfo.userId);
		const isStaff = msg.userInfo.isMod || msg.userInfo.isBroadcaster || isEditor;
		const helixUser = await userApiClient.users.getUserByName(msg.userInfo.userName);

		try {
			if (isStaff) {
				const commandEmbed = new EmbedBuilder()
					.setTitle('Command Used [settitle]')
					.setAuthor({ name: msg.userInfo.displayName, iconURL: helixUser?.profilePictureUrl })
					.setColor('Green')
					.addFields([
						{
							name: 'Command Executer: ',
							value: `\`${msg.userInfo.displayName}\``,
							inline: true
						},
						{
							name: 'New Title: ',
							value: `\`${title}\``,
							inline: true
						},
						{
							name: 'Old Title',
							value: `\`${broadcasterResponse?.title}\``,
							inline: true
						},
						...(msg.userInfo.isMod
							? [{ name: 'Mod', value: 'Yes', inline: true }]
							: msg.userInfo.isBroadcaster
								? [{ name: 'Broadcaster', value: 'Yes', inline: true }]
								: []
						)
					])
					.setFooter({ text: `Channel: ${channel}, user_id: ${msg.userInfo.userId}` })
					.setTimestamp();

				try {
					await userApiClient.channels.updateChannelInfo(broadcasterResponse?.id as UserIdResolvable, { 'title': title });
					// logger.debug('Broadcaster ID: ', broadcasterResponse?.id);
					await chatClient.say(channel, `${msg.userInfo.displayName} has updated the channel title to ${title}`);
					await commandUsage.send({ embeds: [commandEmbed] });
				} catch (error) {
					logger.error('settitle: error updating channel title', { error, channel, user: msg.userInfo.userId });
				}
			} else {
				chatClient.say(channel, `${msg.userInfo.displayName}, Access denied. This command can only be used by broadcasters, moderators, and channel editors.`);
			}
		} catch (error: unknown) {
			if (error instanceof Error) {
				logger.error(error.name + ': ' + error.message + error.stack);
			} else {
				logger.error('Unknown error');
			}
		}
	}
};
export default settitle;