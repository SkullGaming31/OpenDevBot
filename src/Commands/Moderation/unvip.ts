import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { TwitchActivityWebhookID, TwitchActivityWebhookToken, broadcasterInfo } from '../../util/constants';

const unvip: Command = {
	name: 'unvip',
	description: 'remove the vip role from someone on twitch',
	usage: '!unvip [@name]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();

		const display = msg.userInfo.displayName;
		const twitchActivity = new WebhookClient({ id: TwitchActivityWebhookID, token: TwitchActivityWebhookToken });
		if (!args[1]) return chatClient.say(channel, `${display}, Usage: ${unvip.usage}`);

		try {
			const broadcasterResponse = await userApiClient.channels.getChannelInfoById(broadcasterInfo?.id as UserIdResolvable);
			if (broadcasterResponse?.id === undefined) return;
			const userSearch = await userApiClient.users.getUserByName(args[1].replace('@', ''));
			if (userSearch?.id === undefined) return;
			const vipLookup = await userApiClient.channels.getVips(broadcasterInfo?.id as UserIdResolvable, { limit: 20 });
			if (vipLookup.data[1].id === userSearch?.id) return chatClient.say(channel, 'this user is already a vip');

			const unVIPEmbed = new EmbedBuilder()
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
				.setFooter({ text: `${msg.userInfo.displayName} just Unviped ${args[1].replace('@', '')} in ${channel}'s twitch channel` })
				.setTimestamp();
			try {
				if (userSearch) {
					await userApiClient.channels.removeVip(broadcasterInfo?.id as UserIdResolvable, userSearch?.id);
					await chatClient.say(channel, `@${args[1].replace('@', '')} has been removed from VIP status`);
				} else {
					console.error('Something happened while searching for user');
				}
				await twitchActivity.send({ embeds: [unVIPEmbed] });
			} catch (error) {
				console.error(error);
			}
		} catch (error) { console.error(error); }
	}
};
export default unvip;