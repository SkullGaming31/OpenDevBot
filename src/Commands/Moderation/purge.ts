import { PrivateMessage } from '@twurple/chat/lib';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { TwitchActivityWebhookID, TwitchActivityWebhookToken, userID } from '../../util/constants';

const purge: Command = {
	name: 'purge',
	description: 'Purge the messages from someone in the twitch chat',
	usage: '!purge [name] [duration[seconds]] (reason)',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const display = msg.userInfo.displayName;

		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const twitchActivity = new WebhookClient({ id: TwitchActivityWebhookID, token: TwitchActivityWebhookToken });
		const broadcasterID = await userApiClient.channels.getChannelInfoById(userID);
		if (broadcasterID?.id === undefined) return;

		if (!args[1]) return chatClient.say(channel, `${display}, Usage: ${purge.usage}`);
		if (!args[2]) return chatClient.say(channel, `${display}, please specify a duration in seconds to purge texts`);
		if (!args[3]) args[3] = 'No Reason Provided';
		if (!msg.userInfo.isMod) return;
		try {
			const userSearch = await userApiClient.users.getUserByName(args[1].replace('@', ''));
			if (userSearch?.id === undefined || null) return;
			if (userSearch.id === broadcasterID.id) return chatClient.say(channel, 'You can\'t ban/purge this user');
			await userApiClient.moderation.banUser(broadcasterID.id, broadcasterID.id, {
				user: userSearch.id,
				duration: Number(args[2]),
				reason: args[3],
			});
			const purgeEmbed = new EmbedBuilder()
				.setTitle('Twitch Channel Purge Event')
				.setAuthor({ name: `${userSearch.displayName}`, iconURL: `${userSearch.profilePictureUrl}` })
				.setColor('Red')
				.addFields([
					{
						name: 'Executer',
						value: `${msg.userInfo.displayName}`,
						inline: true
					},
					{
						name: 'Mod',
						value: `${msg.userInfo.isMod}`,
						inline: true
					},
					{
						name: 'broadcaster',
						value: `${msg.userInfo.isBroadcaster}`,
						inline: true
					}
				])
				.setFooter({ text: `${msg.userInfo.displayName} just purged ${args[1].replace('@', '')} in ${channel}'s twitch channel` })
				.setTimestamp();
			await twitchActivity.send({ embeds: [purgeEmbed] });
		} catch (error) {
			console.error(error);
		}
	}
};
export default purge;