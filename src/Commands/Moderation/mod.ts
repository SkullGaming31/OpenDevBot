import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { CommandUssageWebhookTOKEN, broadcasterInfo, commandUsageWebhookID } from '../../util/constants';
import { EmbedBuilder, WebhookClient } from 'discord.js';

const mod: Command = {
	name: 'mod',
	description: 'Mod a user in your twitch chat',
	usage: '!mod [@name]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });
		const display = msg.userInfo.displayName;
		try {
			if (!args[0]) return chatClient.say(channel, `${display}, Usage: ${mod.usage}`);
			const userSearch = await userApiClient.users.getUserByName(args[0].replace('@', ''));
			if (userSearch?.id === undefined) return;
			// Get the array of channel editors
			const channelEditor = await userApiClient.channels.getChannelEditors(broadcasterInfo?.id as UserIdResolvable);

			// Check if the user invoking the command is a channel editor
			const isChannelEditor = channelEditor.some(editor => editor.userId === msg.userInfo.userId);

			const moderatorEmbed = new EmbedBuilder()
				.setTitle('Twitch Event[Channel Mod Added]')
				.setAuthor({ name: `${userSearch.displayName}`, iconURL: `${userSearch.profilePictureUrl}`})
				.setColor('Blue')
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
				.setFooter({ text: `${display} just modded ${args[0].replace('@', '')} in ${channel}'s twitch channel`})
				.setTimestamp();

			try {
				if (isChannelEditor) {
					await userApiClient.moderation.addModerator(broadcasterInfo?.id as UserIdResolvable, userSearch?.id).then(async () => {
						await chatClient.say(channel, `${args[0]} has been givin the Moderator Powers by ${display}`);
					});
				} else if (msg.userInfo.isBroadcaster) {
					await chatClient.say(channel, 'use /mod <username>');
				} else {
					await chatClient.say(channel, 'You must be a channel editor to use this command');
				}
				await commandUsage.send({ embeds: [moderatorEmbed] });
			} catch (error) {
				console.error(error);
			}
		} catch (error) { console.error(error); }
	}
};
export default mod;