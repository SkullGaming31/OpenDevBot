import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { CommandUssageWebhookTOKEN, broadcasterInfo, commandUsageWebhookID } from '../../util/constants';

const vip: Command = {
	name: 'vip',
	description: 'Assign someone the VIP role on Twitch',
	usage: '!vip [name]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		try {
			const chatClient = await getChatClient();
			const userApiClient = await getUserApi();
			const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });

			// Check user privileges
			const channelEditor = await userApiClient.channels.getChannelEditors(broadcasterInfo?.id as UserIdResolvable);
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
			const modLookup = await userApiClient.moderation.getModerators(broadcasterInfo?.id as UserIdResolvable, { userId: userSearch?.id });
			const moderators = modLookup.data;
			const isModerator = moderators.some(moderator => moderator.userId === userSearch.id);
			if (isModerator) {
				return chatClient.say(channel, `${args[0]} has a higher rank than VIP and cannot be assigned this role`);
			}

			// Check if user is already a VIP
			const vipLookup = await userApiClient.channels.getVips(broadcasterInfo?.id as UserIdResolvable, { limit: 10 });
			if (vipLookup.data.some(vipUser => vipUser.id === userSearch.id)) {
				return await chatClient.say(channel, 'This user is already a VIP');
			}

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

			// Add user as VIP
			await userApiClient.channels.addVip(broadcasterInfo?.id as UserIdResolvable, userSearch.id as UserIdResolvable);
			await chatClient.say(channel, `@${args[0]} has been added as VIP by ${msg.userInfo.displayName}`);
			await commandUsage.send({ embeds: [vipEmbed] });
		} catch (error) {
			console.error(error);
		}
	}
};
export default vip;