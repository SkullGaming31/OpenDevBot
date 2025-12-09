import type { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { CommandUsageWebhookTOKEN, broadcasterInfo, commandUsageWebhookID } from '../../util/constants';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import logger from '../../util/logger';

const unvip: Command = {
	name: 'unvip',
	description: 'remove the vip role from someone on twitch',
	usage: '!unvip [@name]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		void user; void text;
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();

		const display = msg.userInfo.displayName;
		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUsageWebhookTOKEN });
		if (!args[0]) return chatClient.say(channel, `${display}, Usage: ${unvip.usage}`);

		try {
			const broadcasterResponse = await userApiClient.channels.getChannelInfoById(broadcasterInfo[0].id as UserIdResolvable);
			if (broadcasterResponse?.id === undefined) return;
			const channelEditor = await userApiClient.channels.getChannelEditors(broadcasterInfo[0].id as UserIdResolvable);
			const isEditor = channelEditor.some(editor => editor.userId === msg.userInfo.userId);
			const isStaff = isEditor || msg.userInfo.isMod || msg.userInfo.isBroadcaster;

			const userSearch = await userApiClient.users.getUserByName(args[0].replace('@', ''));
			if (userSearch?.id === undefined) return;

			const vipLookup = await userApiClient.channels.getVips(broadcasterInfo[0].id as UserIdResolvable, { limit: 20 });
			if (vipLookup.data[1].id === userSearch?.id) return chatClient.say(channel, 'this user is not a vip');

			const stream = await userApiClient.streams.getStreamByUserId(broadcasterInfo[0].id as UserIdResolvable);

			const unVIPEmbed = new EmbedBuilder()
				.setTitle('Twitch Event[VIP Removed]')
				.setAuthor({ name: `${userSearch.displayName}`, iconURL: `${userSearch.profilePictureUrl}` })
				.setColor('Red')
				.addFields([
					{
						name: 'Executer',
						value: `${display}`,
						inline: true
					},
					...(msg.userInfo.isMod
						? [{ name: 'Mod', value: 'Yes', inline: true }]
						: msg.userInfo.isBroadcaster
							? [{ name: 'Broadcaster', value: 'Yes', inline: true }]
							: []
					)
				])
				.setFooter({ text: `${display} just Unviped ${args[0].replace('@', '')} in ${channel}'s twitch channel` })
				.setTimestamp();
			try {
				if (userSearch && stream === null && isStaff) {
					await userApiClient.channels.removeVip(broadcasterInfo[0].id as UserIdResolvable, userSearch?.id);
					await chatClient.say(channel, `@${args[0].replace('@', '')} has been removed from VIP status`);
				} else {
					logger.error('Something happened while searching for user');
				}
				await commandUsage.send({ embeds: [unVIPEmbed] });
			} catch (error: unknown) {
				if (error instanceof Error) {
					logger.error(error.name + ': ' + error.message, error.stack);
					await chatClient.say(channel, `${error.message}`);
				} else {
					logger.error('Unknown error');
					await chatClient.say(channel, 'An unknown error occurred');
				}
			}
		} catch (error: unknown) {
			if (error instanceof Error) {
				logger.error(error.name + ': ' + error.message, error.stack);
				await chatClient.say(channel, `${error.message}`);
			} else {
				logger.error('Unknown error');
				await chatClient.say(channel, 'An unknown error occurred');
			}
		}
	}
};
export default unvip;