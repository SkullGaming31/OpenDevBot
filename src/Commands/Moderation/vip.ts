import { PrivateMessage } from '@twurple/chat/lib';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { TwitchActivityWebhookID, TwitchActivityWebhookToken, userID } from '../../util/constants';

const vip: Command = {
	name: 'vip',
	description: 'assign someone the vip role on twitch',
	usage: '!vip [name]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const twitchActivity = new WebhookClient({ id: TwitchActivityWebhookID, token: TwitchActivityWebhookToken });

		const display = msg.userInfo.displayName;
		if (!msg.userInfo.isMod || !msg.userInfo.isBroadcaster) return;
		try {
			const broadcasterID = await userApiClient.channels.getChannelInfoById(userID);
			if (broadcasterID?.id === undefined) return;
			const userSearch = await userApiClient.users.getUserByName(args[1].replace('@', ''));
			if (userSearch?.id === undefined) return;
			const modLookup = await userApiClient.moderation.getModerators(channel); // (channel, 'that person is a higer rank then VIP and can not be assigned this role');
			if (modLookup.data[1].userId === userSearch?.id) return chatClient.say(channel, `${args[1]} has a higer rank then VIP and can not be assigned this role`);
			const vipLookup = await userApiClient.channels.getVips(broadcasterID.id, { limit: 10 });
			if (vipLookup.data[1].id === userSearch?.id) return await chatClient.say(channel, 'this user is already a vip');
			if (!args[1]) return await chatClient.say(channel, `${display}, Usage: ${vip.usage}`);
      
			const vipEmbed = new EmbedBuilder()
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
				.setFooter({ text: `${msg.userInfo.displayName} just viped ${args[1].replace('@', '')} in ${channel}'s twitch channel` })
				.setTimestamp();
			await userApiClient.channels.addVip(broadcasterID?.id, userSearch?.id).then(async () => { await chatClient.say(channel, `@${args[1]} has been added as VIP`); });
			await twitchActivity.send({ embeds: [vipEmbed] });
		} catch (error) { console.error(error); }
	}
};
export default vip;