import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { IUser, UserModel } from '../../database/models/userModel';
import { Command } from '../../interfaces/Command';
import { CommandUssageWebhookTOKEN, broadcasterInfo, commandUsageWebhookID } from '../../util/constants';
import { EmbedBuilder, WebhookClient } from 'discord.js';

const removepoints: Command = {
	name: 'removepoints',
	description: 'Remove points from a viewer',
	usage: '!removepoints <user> <amount>',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });

		try {
			console.log('Executing removepoints command...'); // Debugging line

			if (args.length < 2) {
				await chatClient.say(channel, `${msg.userInfo.displayName}, Usage: ${removepoints.usage}`);
				return;
			}

			let targetUser = args[0];
			const amountToRemove = parseInt(args[1]);

			if (isNaN(amountToRemove) || amountToRemove <= 0) {
				await chatClient.say(channel, 'Invalid amount. Please provide a valid number greater than zero.');
				return;
			}

			const ChannelEditors = await userApiClient.channels.getChannelEditors(broadcasterInfo[0].id as UserIdResolvable);
			const isEditor = ChannelEditors.some(editor => editor.userId === msg.userInfo.userId);
			const isStaff = msg.userInfo.isMod || msg.userInfo.isBroadcaster || isEditor;

			if (!isStaff) {
				await chatClient.say(channel, `${msg.userInfo.displayName}, You are not authorized to use this command.`);
				return;
			}

			const userSearch = await userApiClient.users.getUserByName(targetUser.replace('@', ''));
			if (!userSearch?.id) {
				await chatClient.say(channel, `User ${targetUser} not found.`);
				return;
			}

			if (targetUser.startsWith('@')) {
				targetUser = targetUser.substring(1);
			}

			const existingUser = await UserModel.findOneAndUpdate(
				{ username: targetUser.toLowerCase(), channelId: msg.channelId },
				{ $inc: { balance: -amountToRemove } },
				{ new: true }
			);

			if (!existingUser || existingUser.balance === undefined) {
				await chatClient.say(channel, `User ${targetUser} not found.`);
				return;
			}

			if (existingUser.balance < 0) {
				await chatClient.say(channel, `Cannot remove more points than the user has. ${targetUser} only has ${existingUser.balance} points.`);
				return;
			}

			const removePointsEmbed = new EmbedBuilder()
				.setTitle('Twitch Event[Points Removal]')
				.setAuthor({ name: `${userSearch.displayName}`, iconURL: `${userSearch.profilePictureUrl}` })
				.setColor('Red')
				.addFields([
					{
						name: 'Executer',
						value: `${msg.userInfo.displayName}`,
						inline: true
					},
					{
						name: 'Role',
						value: msg.userInfo.isMod ? 'Mod' : 'Broadcaster',
						inline: true
					},
					{ name: 'Amount Removed', value: `${amountToRemove}`, inline: false },
					{ name: 'New Balance', value: `${existingUser.balance}`, inline: true },
				])
				.setFooter({ text: `${msg.userInfo.displayName} just removed ${amountToRemove} points from ${targetUser} in ${channel}'s Twitch channel` })
				.setTimestamp();

			await chatClient.say(channel, `Removed ${amountToRemove} points from ${targetUser}. New balance: ${existingUser.balance}`);
			await commandUsage.send({ embeds: [removePointsEmbed] });
		} catch (error) {
			console.error('Error in removepoints command:', error);
			await chatClient.say(channel, 'An error occurred while processing your request');
		}
	},
};

export default removepoints;