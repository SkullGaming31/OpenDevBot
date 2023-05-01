import { PrivateMessage } from '@twurple/chat/lib';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { TwitchActivityWebhookID, TwitchActivityWebhookToken, userID } from '../../util/constants';

const mod: Command = {
	name: 'mod',
	description: 'Mod a user in your twitch chat',
	usage: '!mod [@name]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const twitchActivity = new WebhookClient({ id: TwitchActivityWebhookID, token: TwitchActivityWebhookToken });
		const display = msg.userInfo.displayName;
		try {
			if (!args[1]) return chatClient.say(channel, `${display}, Usage: ${mod.usage}`);
			const userSearch = await userApiClient.users.getUserByName(args[1].replace('@', ''));
			if (userSearch?.id === undefined) return;
			await userApiClient.moderation.addModerator(userID, userSearch?.id).then(async () => { await chatClient.say(channel, `${args[1]} has been givin the Moderator Powers`); });

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
			await twitchActivity.send({ embeds: [moderatorEmbed] });
		} catch (error) { console.error(error); }
	}
};
export default mod;