import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { CommandUssageWebhookTOKEN, commandUsageWebhookID, userID } from '../../util/constants';

const setcategory: Command = {
	name: 'setcategory',
	aliases: ['setgame'],
	description: 'set the channel category for the broadcaster',
	usage: '!setcategory [gamename]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const userApiClient = await getUserApi();
		const chatClient = await getChatClient();

		const broadcasterInfo = await userApiClient.channels.getChannelInfoById(userID);
		if (!broadcasterInfo?.id) return;

		const moderatorsResponse = await userApiClient.moderation.getModerators(broadcasterInfo.id as UserIdResolvable);
		const moderatorsData = moderatorsResponse.data; // Access the moderator data

		const isModerator = moderatorsData.some(moderator => moderator.userId === msg.userInfo.userId);
		const isBroadcaster = broadcasterInfo.id === msg.userInfo.userId;
		const isStaff = isModerator || isBroadcaster;
		const commandUsageWebhook = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });
		const category = args.join(' ');
		const channelInfo = await userApiClient.channels.getChannelInfoById(userID);
		

		if (!args[0]) {
			return chatClient.say(channel, `Usage: ${setcategory.usage}`);
		}

		if (isStaff) {
			const newGame = await userApiClient.games.getGameByName(category);
			await userApiClient.channels.updateChannelInfo(broadcasterInfo.id, { gameId: `${newGame?.id}` });
			const helixUser = await userApiClient.users.getUserByName(msg.userInfo.userName);

			const commandEmbed = new EmbedBuilder()
				.setTitle('Command Used [setcategory]')
				.setAuthor({ name: `${helixUser?.displayName}`, iconURL: helixUser?.profilePictureUrl })
				.setColor('Red')
				.addFields([
					{
						name: 'Command Executer:',
						value: `\`${msg.userInfo.displayName}\``,
						inline: true
					},
					{
						name: 'New Category:',
						value: `\`Gamename: ${newGame?.name}\`, \n||\`GameID: ${newGame?.id}\`||`,
						inline: true
					},
					{
						name: 'Old Category:',
						value: `\`Gamename: ${channelInfo?.gameName}\`, \n||\`GameID: ${channelInfo?.gameId}\`||`,
						inline: true
					}
				])
				.setFooter({ text: `Channel: ${channel}` })
				.setTimestamp();

			try {
				await chatClient.say(channel, `${msg.userInfo.displayName}, has changed the channel category to ${newGame?.name}`);
				await commandUsageWebhook.send({ embeds: [commandEmbed] });
			} catch (error) {
				console.error(error);
			}
		} else {
			await chatClient.say(channel, `${msg.userInfo.displayName}, you are not a moderator or the broadcaster, you do not have access to this command`);
		}

	}
};
export default setcategory;