import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { User, UserModel } from '../../database/models/userModel';
import { Command } from '../../interfaces/Command';
import { CommandUssageWebhookTOKEN, broadcasterInfo, commandUsageWebhookID } from '../../util/constants';

const removepoints: Command = {
	name: 'removepoints',
	description: 'remove points from a viewer',
	usage: '!removepoints <user> <amount>',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		console.log('Executing removepoints command...'); // Debugging line

		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });

		let targetUser = args[0];
		const amountToRemove = parseInt(args[1]);

		console.log(`Target User: ${targetUser}, Amount to Remove: ${amountToRemove}`); // Debugging line

		const ChannelEditor = await userApiClient.channels.getChannelEditors(broadcasterInfo?.id as UserIdResolvable);
		const isEditor = ChannelEditor.map(editor => editor.userId === msg.userInfo.userId);
		const isStaff = msg.userInfo.isMod || msg.userInfo.isBroadcaster || isEditor;
		const userSearch = await userApiClient.users.getUserByName(args[1].replace('@', ''));

		console.log(`Is Staff: ${isStaff}, User Search: ${userSearch}`); // Debugging line

		if (userSearch?.id === undefined) return;

		if (isNaN(amountToRemove)) { return chatClient.say(channel, 'Invalid amount. Please provide a valid number.'); }

		if (!isStaff) { return chatClient.say(channel, `${msg.userInfo.displayName}, You are not authorized to use this command.`); }

		if (targetUser.startsWith('@')) { targetUser = targetUser.substring(1); }

		const existingUser = await UserModel.findOne<User>({ username: targetUser });

		console.log(`Existing User: ${existingUser}`); // Debugging line

		if (existingUser) {
			const removePointsEmbed = new EmbedBuilder()
				.setTitle('Twitch points removal Event')
				.setAuthor({ name: `${userSearch.displayName}`, iconURL: `${userSearch.profilePictureUrl}` })
				.setColor('Red')
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
				.setFooter({ text: `${msg.userInfo.displayName} just unmodded ${args[1].replace('@', '')} in ${channel}'s twitch channel` })
				.setTimestamp();

			const currentBalance = existingUser.balance ?? 0;
			const newBalance = currentBalance - amountToRemove;

			console.log(`Current Balance: ${currentBalance}, New Balance: ${newBalance}`); // Debugging line

			if (newBalance < 0) { return chatClient.say(channel, `Cannot remove more points than the user has. ${targetUser} only has ${currentBalance} points.`); }

			existingUser.balance = newBalance;

			const savedUser = await existingUser.save();

			console.log(`Saved User: ${savedUser}`); // Debugging line

			await chatClient.say(channel, `Removed ${amountToRemove} points from ${targetUser}. New balance: ${savedUser.balance}`);
			await commandUsage.send({ embeds: [removePointsEmbed] });
		} else {
			await chatClient.say(channel, `User ${targetUser} not found.`);
		}
	}
};
export default removepoints;