import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat';
import logger from '../../util/logger';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { withdraw } from '../../services/economyService';
import { Command } from '../../interfaces/Command';
import { CommandUssageWebhookTOKEN, broadcasterInfo, commandUsageWebhookID } from '../../util/constants';
import { EmbedBuilder, WebhookClient } from 'discord.js';

const removepoints: Command = {
	name: 'removepoints',
	description: 'Remove points from a viewer',
	usage: '!removepoints <user> <amount>',
	/**
	 * Execute the removepoints command to subtract points from a user's balance.
	 * 
	 * This function checks if the user is authorized to use the command and extracts the target user and amount 
	 * from the command arguments. It then subtracts the specified amount from the user's balance in the database and 
	 * sends a message to the chat confirming the points removed.
	 * 
	 * @param channel - The channel where the command was issued.
	 * @param user - The user who issued the command.
	 * @param args - The command arguments, including the target user and the amount of points to remove.
	 * @param text - The full text of the chat message.
	 * @param msg - The chat message object containing metadata and user information.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });

		try {
			logger.debug('Executing removepoints command...', { channel, user, argsLength: args.length }); // Debugging line

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

			try {
				const acct = await withdraw(userSearch.id, amountToRemove, undefined, { admin: { id: msg.userInfo.userId, name: msg.userInfo.displayName }, channel });
				// acct is returned when successful
				const newBalance = acct.balance;

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
						{ name: 'New Balance', value: `${newBalance}`, inline: true },
					])
					.setFooter({ text: `${msg.userInfo.displayName} just removed ${amountToRemove} points from ${targetUser} in ${channel}'s Twitch channel` })
					.setTimestamp();

				await chatClient.say(channel, `Removed ${amountToRemove} points from ${targetUser}. New balance: ${newBalance}`);
				await commandUsage.send({ embeds: [removePointsEmbed] });
			} catch (err: any) {
				if (err && err.message && err.message.includes('Insufficient')) {
					await chatClient.say(channel, 'Cannot remove more points than the user has.');
				} else {
					logger.error('Error removing points:', err);
					await chatClient.say(channel, 'An error occurred while processing your request');
				}
			}

			// Completed above: response already sent when withdraw succeeded or failed
		} catch (error) {
			logger.error('Error in removepoints command:', error);
			await chatClient.say(channel, 'An error occurred while processing your request');
		}
	},
};

export default removepoints;