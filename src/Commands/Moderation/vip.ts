import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { TwitchActivityWebhookID, TwitchActivityWebhookToken, broadcasterInfo, userID } from '../../util/constants';

const vip: Command = {
	name: 'vip',
	description: 'assign someone the vip role on twitch',
	usage: '!vip [name]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const twitchActivity = new WebhookClient({ id: TwitchActivityWebhookID, token: TwitchActivityWebhookToken });

		const channelEditor = await userApiClient.channels.getChannelEditors(broadcasterInfo?.id as UserIdResolvable);

		const isEditor = channelEditor.map(editor => editor.userId === msg.userInfo.userId);
		const isStaff = msg.userInfo.isMod || msg.userInfo.isBroadcaster || isEditor;
		if (!isStaff) return chatClient.say(channel, 'You must be the Broadcaster, Moderator or Channel Editor to use this command');
		try {
			const broadcasterResponse = await userApiClient.channels.getChannelInfoById(userID);
			if (broadcasterResponse?.id === undefined) return;
			const userSearch = await userApiClient.users.getUserByName(args[1].replace('@', ''));
			if (userSearch?.id === undefined) return;
			const modLookup = await userApiClient.moderation.getModerators(channel); // (channel, 'that person is a higer rank then VIP and can not be assigned this role');
			if (modLookup.data[1].userId === userSearch?.id) return chatClient.say(channel, `${args[1]} has a higer rank then VIP and can not be assigned this role`);
			const vipLookup = await userApiClient.channels.getVips(broadcasterInfo?.id as UserIdResolvable, { limit: 10 });
			if (vipLookup.data[1].id === userSearch?.id) return await chatClient.say(channel, 'this user is already a vip');
			if (!args[1]) return await chatClient.say(channel, `${msg.userInfo.displayName}, Usage: ${vip.usage}`);

			const vipEmbed = new EmbedBuilder()
				.setTitle('Twitch Channel Purge Event')
				.setAuthor({ name: `${userSearch.displayName}`, iconURL: `${userSearch.profilePictureUrl}` })
				.setColor('Green')
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
			try {
				await userApiClient.channels.addVip(broadcasterInfo?.id as UserIdResolvable, userSearch?.id);
				await chatClient.say(channel, `@${args[1]} has been added as VIP by ${msg.userInfo.displayName}`);
				await twitchActivity.send({ embeds: [vipEmbed] });
			} catch (error) {
				console.error(error);
			}
		} catch (error) { console.error(error); }
	}
};
export default vip;