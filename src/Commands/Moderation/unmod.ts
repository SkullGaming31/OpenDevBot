import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { CommandUssageWebhookTOKEN, broadcasterInfo, commandUsageWebhookID } from '../../util/constants';

const unmod: Command = {
	name: 'unmod',
	description: 'remove the moderator role from a user on twitch',
	usage: '!unmmod [@name]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const display = msg.userInfo.displayName;
		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });
		if (!args[1]) return chatClient.say(channel, `${display}, Usage: ${unmod.usage}`);

		const channelEditor = await userApiClient.channels.getChannelEditors(broadcasterInfo?.id as UserIdResolvable);

		const isEditor = channelEditor.some(editor => editor.userId === msg.userInfo.userId);
		try {
			const userSearch = await userApiClient.users.getUserByName(args[1].replace('@', ''));
			if (userSearch?.id === undefined) return;

			const unModeratorEmbed = new EmbedBuilder()
				.setTitle('Twitch Channel Unmod Event')
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
				.setFooter({ text: `${msg.userInfo.displayName} just unmodded ${args[1].replace('@', '')} in ${channel}'s twitch channel` })
				.setTimestamp();
			try {
				if (isEditor || msg.userInfo.isBroadcaster) {
					await userApiClient.moderation.removeModerator(broadcasterInfo?.id as UserIdResolvable, userSearch?.id);
					await chatClient.say(channel, `${args[1]} has had there moderator powers removed by ${msg.userInfo.displayName}`);
					await commandUsage.send({ embeds: [unModeratorEmbed] });
				} else {
					await chatClient.say(channel, 'You Must be the Broadcaster or Channel Editor to use this command');
				}
			} catch (error) {
				console.error(error);
			}
		} catch (error) {
			console.error(error);
		}
	}
};
export default unmod;