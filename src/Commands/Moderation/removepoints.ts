import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat';
import { Embed, WebhookClient } from 'guilded.js';
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

		// console.log(`Target User: ${targetUser}, Amount to Remove: ${amountToRemove}`); // Debugging line

		const ChannelEditor = await userApiClient.channels.getChannelEditors(broadcasterInfo?.id as UserIdResolvable);
		const isEditor = ChannelEditor.map(editor => editor.userId === msg.userInfo.userId);
		const isStaff = msg.userInfo.isMod || msg.userInfo.isBroadcaster || isEditor;

		if (!isStaff) { return chatClient.say(channel, `${msg.userInfo.displayName}, You are not authorized to use this command.`); }

		if (!args[0]) return chatClient.say(channel, `${removepoints.usage}`);

		if (isNaN(amountToRemove)) { return chatClient.say(channel, 'Invalid amount. Please provide a valid number.'); }

		const userSearch = await userApiClient.users.getUserByName(args[0].replace('@', ''));
		// console.log(`Is Staff: ${isStaff}, User Search: ${userSearch}`); // Debugging line
		if (userSearch?.id === undefined) return;

		if (targetUser.startsWith('@')) { targetUser = targetUser.substring(1); }

		const existingUser = await UserModel.findOne<User>({ username: targetUser.toLowerCase() });

		// console.log(`Existing User: ${existingUser}`); // Debugging line

		if (existingUser) {

			const currentBalance = existingUser.balance ?? 0;
			const newBalance = currentBalance - amountToRemove;

			// console.log(`Current Balance: ${currentBalance}, New Balance: ${newBalance}`); // Debugging line

			if (newBalance < 0) { return chatClient.say(channel, `Cannot remove more points than the user has. ${targetUser} only has ${currentBalance} points.`); }

			existingUser.balance = newBalance;

			const savedUser = await existingUser.save();

			// console.log(`Saved User: ${savedUser}`); // Debugging line

			const removePointsEmbed = new Embed()
				.setTitle('Twitch Event[Points Removal]')
				.setAuthor(`${userSearch.displayName}`, `${userSearch.profilePictureUrl}`)
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
					),
					{ name: 'Balance', value: `${amountToRemove}`, inline: false },
					{ name: 'New Balance', value: `${savedUser.balance}`, inline: true },
				])
				.setFooter(`${msg.userInfo.displayName} just removed ${amountToRemove} points from ${args[0].replace('@', '')} in ${channel}'s twitch channel`)
				.setTimestamp();

			await chatClient.say(channel, `Removed ${amountToRemove} points from ${targetUser}. New balance: ${savedUser.balance}`);
			await commandUsage.send({ embeds: [removePointsEmbed.toJSON()] });
		} else {
			await chatClient.say(channel, `User ${targetUser} not found.`);
		}
	}
};
export default removepoints;