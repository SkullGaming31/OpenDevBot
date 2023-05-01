import { PrivateMessage } from '@twurple/chat/lib';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { TwitchActivityWebhookID, TwitchActivityWebhookToken, userID } from '../../util/constants';

const unvip: Command = {
	name: 'unvip',
	description: 'remove the vip role from someone on twitch',
	usage: '!unvip [@name]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();

		const display = msg.userInfo.displayName;
		const twitchActivity = new WebhookClient({ id: TwitchActivityWebhookID, token: TwitchActivityWebhookToken });
		try {
			const broadcasterID = await userApiClient.channels.getChannelInfoById(userID);
			if (broadcasterID?.id === undefined) return;
			const userSearch = await userApiClient.users.getUserByName(args[1].replace('@', ''));
			if (userSearch?.id === undefined) return;
			if (!args[1]) return chatClient.say(channel, `${display}, Usage: ${unvip.usage}`);
			// const vipLookup = await userApiClient.channels.getVips(broadcasterID.id, { limit: 20 });
			// if (vipLookup.data[1].id === userSearch?.id) return await chatClient.say(channel, 'this user is already a vip');
			if (userSearch) {
				await userApiClient.channels.removeVip(broadcasterID.id, userSearch?.id).then(async () => { await chatClient.say(channel, `@${args[1].replace('@', '')} has been removed from VIP status`); });
			} else {
				console.error('Something happened while searching for user');
			}

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
			await twitchActivity.send({ embeds: [unVIPEmbed] });
		} catch (error) { console.error(error); }
	}
};
export default unvip;