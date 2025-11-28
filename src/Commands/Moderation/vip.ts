import type { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { CommandUssageWebhookTOKEN, broadcasterInfo, commandUsageWebhookID } from '../../util/constants';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import logger from '../../util/logger';

const vip: Command = {
	name: 'vip',
	description: 'Assign someone the VIP role on Twitch',
	usage: '!vip [name]',
	/**
	 * 
	 * @param channel - The channel to assign the VIP role in
	 * @param user - The user assigning the VIP role
	 * @param args - The arguments passed to the command
	 * @param text - The full text of the command
	 * @param msg - The message that triggered the command
	 * 
	 * @description
	 * Assigns the VIP role to the targeted user.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });
		try {

			// Check user privileges
			const channelEditor = await userApiClient.channels.getChannelEditors(broadcasterInfo[0].id as UserIdResolvable);
			const isEditor = channelEditor.map(editor => editor.userId === msg.userInfo.userId);
			const isStaff = msg.userInfo.isMod || msg.userInfo.isBroadcaster || isEditor;

			if (!isStaff) {
				return chatClient.say(channel, 'You must be the Broadcaster, Moderator, or Channel Editor to use this command');
			}

			// Validate command arguments
			if (!args[0]) {
				return chatClient.say(channel, `${msg.userInfo.displayName}, Usage: ${vip.usage}`);
			}

			// Retrieve user information
			const userSearch = await userApiClient.users.getUserByName(args[0].replace('@', ''));
			if (!userSearch?.id) {
				return;
			}

			// Check if the user is a moderator
			const modLookup = await userApiClient.moderation.getModerators(broadcasterInfo[0].id as UserIdResolvable, { userId: userSearch?.id });
			const moderators = modLookup.data;
			const isModerator = moderators.some(moderator => moderator.userId === userSearch.id);
			if (isModerator) {
				return chatClient.say(channel, `${args[0]} has a higher rank than VIP and cannot be assigned this role`);
			}

			// Check if user is already a VIP
			const vipLookup = await userApiClient.channels.getVips(broadcasterInfo[0].id as UserIdResolvable, { limit: 10 });
			if (vipLookup.data.some(vipUser => vipUser.id === userSearch.id)) {
				return await chatClient.say(channel, 'This user is already a VIP');
			}

			const stream = await userApiClient.streams.getStreamByUserId(broadcasterInfo[0].id as UserIdResolvable);

			// Construct VIP embed message
			const vipEmbed = new EmbedBuilder()
				.setTitle('Command Usage[VIP]')
				.setAuthor({ name: `${userSearch.displayName}`, iconURL: `${userSearch.profilePictureUrl}` })
				.setColor('Green')
				.addFields([
					{
						name: 'Executer',
						value: `${msg.userInfo.displayName}`,
						inline: true
					},
					...(msg.userInfo.isMod
						? [{ name: 'Mod', value: 'Yes', inline: true }]
						: msg.userInfo.isBroadcaster
							? [{ name: 'Broadcaster', value: 'Yes', inline: true }]
							: []
					)
				])
				.setFooter({ text: `${msg.userInfo.displayName} just viped ${args[0].replace('@', '')} in ${channel}'s Twitch channel` })
				.setTimestamp();

			if (stream !== null) {
				await userApiClient.channels.addVip(broadcasterInfo[0].id as UserIdResolvable, userSearch.id as UserIdResolvable);
				await chatClient.say(channel, `${args[0]} has been added as VIP by ${msg.userInfo.displayName}`);
				await commandUsage.send({ embeds: [vipEmbed] });
			} else {
				await chatClient.say(channel, 'Stream must be live to use this command');
			}
		} catch (error: unknown) {
			if (error instanceof Error) {
				logger.error(error.name + ': ' + error.message, error.stack);
				await chatClient.say(channel, 'An error occurred while assigning the VIP role');
			}
		}
	}
};
export default vip;