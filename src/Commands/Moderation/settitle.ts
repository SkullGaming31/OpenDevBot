import { PrivateMessage } from '@twurple/chat/lib';
import { EmbedBuilder } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { userID } from '../../util/constants';

const settitle: Command = {
	name: 'settitle',
	description: 'Set the Channels title',
	usage: '!settitle [title]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const userApiClient = await getUserApi();
		const chatClient = await getChatClient();

		const staff = msg.userInfo.isMod || msg.userInfo.isBroadcaster;
		const display = msg.userInfo.displayName;
		const canadiendragon = await userApiClient.channels.getChannelInfoById(userID);

		switch (channel) {
		case '#canadiendragon':
			try {
				if (staff) {
					const setTitle = await userApiClient.channels.updateChannelInfo(canadiendragon?.id!, { 'title': `${args.join(' ')}` }); // Channel ID:'31124455'
					chatClient.say(channel, `${msg.userInfo.displayName}, has updated the channel title to ${canadiendragon?.title}`);
					const helixUser = await userApiClient.users.getUserByName(args[0].replace('@', ''));
					const commandEmbed = new EmbedBuilder()
						.setTitle('Command Used[settitle]')
						.setAuthor({ name: msg.userInfo.displayName, iconURL: helixUser?.profilePictureUrl })
						.setColor('Red')
						.addFields([
							{
								name: 'Command Executer: ',
								value: `\`${msg.userInfo.displayName}\``,
								inline: true
							},
							{
								name: 'New Title: ',
								value: `\`${canadiendragon?.title}\``,
								inline: true
							}
						])
						.setFooter({ text: `Channel: ${channel.replace('#', '')}, TwitchID: ${msg.userInfo.userId}` })
						.setTimestamp();
				} else {
					chatClient.say(channel, `${display}, you are not a moderator or the broadcaster you do not have access to these commands, please run /help to find out what commands you can use.`);
				}
			} catch (error: any) {
				console.error(error.message);
			}
			break;
		}
	}
};
export default settitle;