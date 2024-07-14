import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { CommandUssageWebhookTOKEN, broadcasterInfo, commandUsageWebhookID } from '../../util/constants';
import { EmbedBuilder, WebhookClient } from 'discord.js';

const purge: Command = {
	name: 'purge',
	description: 'Purge messages from a user in the Twitch chat',
	usage: '!purge [name] [duration[seconds]] (reason)',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const display = msg.userInfo.displayName;

		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });

		try {
			// Argument validation
			if (!args[0] || !args[1]) {
				await chatClient.say(channel, `${display}, Usage: ${purge.usage}`);
				return;
			}

			const username = args[0].replace('@', '');
			const durationSeconds = Number(args[1]);
			const reason = args[2] || 'No Reason Provided';

			// Check moderator or broadcaster status
			if (!msg.userInfo.isMod && !msg.userInfo.isBroadcaster) {
				await chatClient.say(channel, 'You do not have permission to use this command');
				return;
			}

			// Retrieve user information
			const userSearch = await userApiClient.users.getUserByName(username);

			if (!userSearch?.id) {
				await chatClient.say(channel, `User ${username} not found`);
				return;
			}

			// Prevent purging/banning the broadcaster
			if (userSearch.id === broadcasterInfo[0].id as UserIdResolvable) {
				await chatClient.say(channel, 'You cannot purge/ban the broadcaster');
				return;
			}

			// Purge the user
			await userApiClient.moderation.banUser(broadcasterInfo[0].id as UserIdResolvable, {
				user: userSearch.id,
				duration: durationSeconds,
				reason: reason,
			});

			// Send purge event to command usage webhook
			const purgeEmbed = new EmbedBuilder()
				.setTitle('Twitch Event[Channel Purge(user)]')
				.setAuthor({ name: `${userSearch.displayName}`, iconURL: `${userSearch.profilePictureUrl}` })
				.setColor('Red')
				.addFields([
					{
						name: 'Executer',
						value: `${msg.userInfo.displayName}`,
						inline: true,
					},
					{
						name: 'Role',
						value: msg.userInfo.isMod ? 'Mod' : 'Broadcaster',
						inline: true,
					},
				])
				.setFooter({ text: `${msg.userInfo.displayName} just purged ${username} in ${channel}'s Twitch channel` })
				.setTimestamp();

			await commandUsage.send({ embeds: [purgeEmbed] });
			await chatClient.say(channel, `User ${username} has been purged for ${durationSeconds} seconds. Reason: ${reason}`);
		} catch (error) {
			console.error('Error in purge command:', error);
			await chatClient.say(channel, 'An error occurred while processing your request');
		}
	},
};

export default purge;