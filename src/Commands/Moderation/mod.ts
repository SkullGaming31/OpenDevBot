import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { TwitchActivityWebhookID, TwitchActivityWebhookToken, broadcasterInfo } from '../../util/constants';

const mod: Command = {
	name: 'mod',
	description: 'Mod a user in your twitch chat',
	usage: '!mod [@name]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const twitchActivity = new WebhookClient({ id: TwitchActivityWebhookID, token: TwitchActivityWebhookToken });
		const display = msg.userInfo.displayName;
		try {
			if (!args[1]) return chatClient.say(channel, `${display}, Usage: ${mod.usage}`);
			const userSearch = await userApiClient.users.getUserByName(args[1].replace('@', ''));
			if (userSearch?.id === undefined) return;
			// Get the array of channel editors
			const channelEditor = await userApiClient.channels.getChannelEditors(broadcasterInfo?.id as UserIdResolvable);

			// Check if the user invoking the command is a channel editor
			const isChannelEditor = channelEditor.some(editor => editor.userId === msg.userInfo.userId);

			const moderatorEmbed = new EmbedBuilder()
				.setTitle('Twitch Channel MOD Event')
				.setAuthor({ name: `${userSearch.displayName}`, iconURL: `${userSearch.profilePictureUrl}` })
				.setColor('Blue')
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
				.setFooter({ text: `${msg.userInfo.displayName} just modded ${args[1].replace('@', '')} in ${channel}'s twitch channel` })
				.setTimestamp();

			try {
				if (isChannelEditor) {
					await userApiClient.moderation.addModerator(broadcasterInfo?.id as UserIdResolvable, userSearch?.id).then(async () => {
						await chatClient.say(channel, `${args[1]} has been givin the Moderator Powers by ${msg.userInfo.displayName}`);
					});
				} else if (msg.userInfo.isBroadcaster) {
					await chatClient.say(channel, 'use /mod <username>');
				} else {
					await chatClient.say(channel, 'You must be a channel editor to use this command');
				}
				await twitchActivity.send({ embeds: [moderatorEmbed] });
			} catch (error) {
				console.error(error);
			}
		} catch (error) { console.error(error); }
	}
};
export default mod;