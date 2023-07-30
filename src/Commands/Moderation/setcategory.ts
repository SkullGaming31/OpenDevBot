import { ChatMessage } from '@twurple/chat/lib';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { CommandUssageWebhookTOKEN, commandUsageWebhookID, userID } from '../../util/constants';

const setcategory: Command = {
	name: 'setcategory',
	description: 'set the channel category for the broadcaster',
	usage: '!setgame [gamename]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const userApiClient = await getUserApi();
		const chatClient = await getChatClient();

		const broadcasterID = await userApiClient.channels.getChannelInfoById(userID);
		if (broadcasterID?.id === undefined) return;
		const staff = msg.userInfo.isMod || msg.userInfo.isBroadcaster;
		const display = msg.userInfo.displayName;
		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });
		const category = args.join(' ');
		const canadiendragon = await userApiClient.channels.getChannelInfoById(userID);
		if (!args[0]) return chatClient.say(channel, `Usage: ${setcategory.usage}`);

		if (staff) {
			const gamename = await userApiClient.games.getGameByName(category);
			await userApiClient.channels.updateChannelInfo(broadcasterID?.id!, { gameId: `${gamename?.id}` });
			const helixUser = await userApiClient.users.getUserByName(msg.userInfo.userName);
			await chatClient.say(channel, `${display}, has changed the channel category to ${gamename?.name}`);

			const commandEmbed = new EmbedBuilder()
				.setTitle('Command Used[setgame]')
				.setAuthor({ name: msg.userInfo.displayName, iconURL: helixUser?.profilePictureUrl })
				.setColor('Red')
				.addFields([
					{
						name: 'Command Executer: ',
						value: `\`${msg.userInfo.displayName}\``,
						inline: true
					},
					{
						name: 'New Category:',
						value: `\`Gamename: ${gamename?.name}\`, \n||\`GameID: ${gamename?.id}\`||`,
						inline: true
					},
					{
						name: 'Old Category:',
						value: `\`Gamename: ${canadiendragon?.gameName}\`, \n||\`GameID: ${canadiendragon?.gameId}\`||`,
						inline: true
					}
				])
				.setFooter({ text: `Channel: ${channel}` })
				.setTimestamp();

			await commandUsage.send({ embeds: [commandEmbed] });
		} else {
			chatClient.say(channel, `${display}, you are not a moderator or the broadcaster, you do not have access to this command`);
		}
	}
};
export default setcategory;