import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { CommandUssageWebhookTOKEN, broadcasterInfo, commandUsageWebhookID } from '../../util/constants';

const ban: Command = {
	name: 'ban',
	description: 'Ban a user from your Twitch chat',
	usage: '!ban [@name] (reason)',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const display = msg.userInfo.displayName;
		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });

		try {
			if (!args[1]) return chatClient.say(channel, `${display}, Usage: ${ban.usage}`);

			const reason = args[2] || 'No Reason Provided';
			const username = args[1].replace('@', '');
			const userSearch = await userApiClient.users.getUserByName(username);

			if (!userSearch?.id) return;

			// Check if the user is a mod or broadcaster
			if (!msg.userInfo.isMod || !msg.userInfo.isBroadcaster) return;

			// Ban the user
			await userApiClient.moderation.banUser(broadcasterInfo?.id as UserIdResolvable, { user: userSearch.id, reason });

			// Send chat message about the ban
			await chatClient.say(channel, `@${username} has been banned for Reason: ${reason}`);

			const commandUsageEmbed = new EmbedBuilder()
				.setTitle('CommandUsage[Ban]')
				.setAuthor({ name: msg.userInfo.displayName, iconURL: userSearch.profilePictureUrl })
				.setDescription(reason)
				.setColor('Red')
				.addFields([
					{ name: 'Executer', value: msg.userInfo.displayName, inline: true },
					// Check if the user is a mod or broadcaster, and add the appropriate field
					...(msg.userInfo.isMod
						? [{ name: 'Mod', value: 'Yes', inline: true }]
						: msg.userInfo.isBroadcaster
							? [{ name: 'Broadcaster', value: 'Yes', inline: true }]
							: []
					)
				])
				.setFooter({ text: `${msg.userInfo.displayName} just banned out ${userSearch.displayName} in ${channel}'s twitch channel` })
				.setTimestamp();

			// Send the embed
			await commandUsage.send({ embeds: [commandUsageEmbed] });

		} catch (error) {
			console.error(error);
		}
	}
};
export default ban;