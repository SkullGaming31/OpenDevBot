import { PrivateMessage } from '@twurple/chat/lib';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { CommandUssageWebhookTOKEN, commandUsageWebhookID, userID } from '../../util/constants';

const commandname: Command = {
	name: '',
	description: '',
	usage: '',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const userApiClient = await getUserApi();
		const chatClient = await getChatClient();

		const broadcasterID = await userApiClient.channels.getChannelInfoById(userID);
		if (broadcasterID?.id === undefined) return;
		const staff = msg.userInfo.isMod || msg.userInfo.isBroadcaster;
		const display = msg.userInfo.displayName;
		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });

		switch (channel) {
		case '#canadiendragon':
			if (staff) {
				const gamename = await userApiClient.games.getGameByName(args.join(' '));
				const setGame = await userApiClient.channels.updateChannelInfo(broadcasterID?.id!, { gameId: `${gamename?.id}` });
				const helixUser = await userApiClient.users.getUserByName(args[0].replace('@', ''));
				chatClient.say(channel, `${display}, has changed the channel category to ${gamename?.name}`);

				const commandEmbed = new EmbedBuilder()
					.setTitle('Command Used')
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
						}
					])
					.setFooter({ text: `Channel: ${channel.replace('#', '')}` })
					.setTimestamp();

				await commandUsage.send({ embeds: [commandEmbed] });
				// console.log(`${gamename?.name}: ${gamename?.id}`);
			} else {
				chatClient.say(channel, `${display}, you are not a moderator or the broadcaster you do not have access to this command`);
			}
			break;
		}
	}
};
export default commandname;