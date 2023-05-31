import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { User, UserModel } from '../../database/models/userModel';
import { Command } from '../../interfaces/apiInterfaces';

const addpoints: Command = {
	name: 'addpoints',
	description: 'give points to a viewer',
	usage: '!addpoints <user> <amount>',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
		const display = msg.userInfo.displayName;
  
		// Extract the target user and amount from the command arguments
		let targetUser = args[0];
		const amountToAdd = parseInt(args[1]);
		// Check if the user is a mod or broadcaster
		const isMod = msg.userInfo.isMod || msg.userInfo.isBroadcaster;
  
		// Check if the amount is a valid number
		if (isNaN(amountToAdd)) { return chatClient.say(channel, 'Invalid amount. Please provide a valid number.'); }

		if (!isMod) { return chatClient.say(channel, `${display}, You are not authorized to use this command.`); }

		// Remove '@' symbol from the target user's name
		if (targetUser.startsWith('@')) { targetUser = targetUser.substring(1); }
  
		// Find the target user in the database
		const existingUser = await UserModel.findOne<User>({ username: targetUser });
  
		if (existingUser) {
			// Calculate the new balance
			const currentBalance = existingUser.balance ?? 0; // Use 0 if balance is undefined
			const newBalance = currentBalance + amountToAdd;
		
			// Update the balance of the existing user
			existingUser.balance = newBalance;
		
			// Save the updated user document to the database
			const savedUser = await existingUser.save();
		
			// Send a message to the chat confirming the points added
			chatClient.say(channel, `Added ${amountToAdd} points to ${targetUser}. New balance: ${savedUser.balance}`);
		} else {
			// User not found in the database
			chatClient.say(channel, `User ${targetUser} not found.`);
		}
	}  
};
export default addpoints;