import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { User, UserModel } from '../../database/models/userModel';
import { Command } from '../../interfaces/apiInterfaces';
import { CommandUssageWebhookTOKEN, broadcasterInfo, commandUsageWebhookID } from '../../util/constants';

const addpoints: Command = {
	name: 'addpoints',
	description: 'give points to a viewer',
	usage: '!addpoints <user> <amount>',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });

		// Extract the target user and amount from the command arguments
		let targetUser = args[0];
		const amountToAdd = parseInt(args[1]);
		// Check if the user is a mod, broadcaster or ChannelEditor
		const ChannelEditor = await userApiClient.channels.getChannelEditors(broadcasterInfo?.id as UserIdResolvable);
		const isEditor = ChannelEditor.map(editor => editor.userId === msg.userInfo.userId);
		const isStaff = msg.userInfo.isMod || msg.userInfo.isBroadcaster || isEditor;
		const userSearch = await userApiClient.users.getUserByName(args[1].replace('@', ''));
		if (userSearch?.id === undefined) return;

		// Check if the amount is a valid number
		if (isNaN(amountToAdd)) { return chatClient.say(channel, 'Invalid amount. Please provide a valid number.'); }

		if (!isStaff) { return chatClient.say(channel, `${msg.userInfo.displayName}, You are not authorized to use this command.`); }

		// Remove '@' symbol from the target user's name
		if (targetUser.startsWith('@')) { targetUser = targetUser.substring(1); }

		// Find the target user in the database
		const existingUser = await UserModel.findOne<User>({ username: targetUser });

		if (existingUser) {
			const addPointsEmbed = new EmbedBuilder()
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
			// Calculate the new balance
			const currentBalance = existingUser.balance ?? 0; // Use 0 if balance is undefined
			const newBalance = currentBalance + amountToAdd;

			// Update the balance of the existing user
			existingUser.balance = newBalance;

			// Save the updated user document to the database
			const savedUser = await existingUser.save();

			// Send a message to the chat confirming the points added
			await chatClient.say(channel, `Added ${amountToAdd} points to ${targetUser}. New balance: ${savedUser.balance}`);
			commandUsage.send({ embeds: [addPointsEmbed] });
		} else {
			// User not found in the database
			await chatClient.say(channel, `User ${targetUser} not found.`);
		}
	}
};
export default addpoints;