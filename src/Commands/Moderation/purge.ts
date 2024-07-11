import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { CommandUssageWebhookTOKEN, broadcasterInfo, commandUsageWebhookID } from '../../util/constants';
import { EmbedBuilder, WebhookClient } from 'discord.js';

const purge: Command = {
	name: 'purge',
	description: 'Purge the messages from someone in the twitch chat',
	usage: '!purge [name] [duration[seconds]] (reason)',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const display = msg.userInfo.displayName;

		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();

		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });

		if (!args[0]) return chatClient.say(channel, `${display}, Usage: ${purge.usage}`);
		if (!args[1]) return chatClient.say(channel, `${display}, please specify a duration in seconds to purge texts`);
		if (!args[2]) args[2] = 'No Reason Provided';
		if (!msg.userInfo.isMod || !msg.userInfo.isBroadcaster) return;
		try {
			const userSearch = await userApiClient.users.getUserByName(args[0].replace('@', ''));
			if (userSearch?.id === undefined || null) return;
			if (userSearch.id === broadcasterInfo[0].id as UserIdResolvable) return chatClient.say(channel, 'You can\'t ban/purge this user');
			await userApiClient.moderation.banUser(broadcasterInfo[0].id as UserIdResolvable, {
				user: userSearch.id,
				duration: Number(args[1]),
				reason: args[2],
			});
			const purgeEmbed = new EmbedBuilder()
				.setTitle('Twitch Event[Channel Purge(user)]')
				.setAuthor({ name: `${userSearch.displayName}`, iconURL: `${userSearch.profilePictureUrl}`})
				.setColor('Red')
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
				.setFooter({ text: `${msg.userInfo.displayName} just purged ${args[0].replace('@', '')} in ${channel}'s twitch channel`})
				.setTimestamp();
			try {

				await commandUsage.send({ embeds: [purgeEmbed] });
			} catch (error) {
				console.error(error);
			}
		} catch (error) {
			console.error(error);
		}
	}
};
export default purge;