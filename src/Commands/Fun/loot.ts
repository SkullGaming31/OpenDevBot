import { ChatMessage } from '@twurple/chat/lib';
import { randomInt } from 'node:crypto';
import { getChatClient } from '../../chat';
import { IUser, UserModel } from '../../database/models/userModel';
import balanceAdapter from '../../services/balanceAdapter';
import { Command } from '../../interfaces/Command';
import logger from '../../util/logger';

const houseItems: {
	tv: number;
	console: number;
	computer: number;
	laptop: number;
	cash: number;
	jewelry: number; // Added jewelry
	art: number; // Added art
	silverware: number; // Added silverware
	[key: string]: number; // Index signature allowing string keys
} = {
	tv: 1000,
	console: 800,
	computer: 1200,
	laptop: 1500,
	cash: 2000,
	jewelry: 2500, // Added value for jewelry
	art: 3000, // Added value for art
	silverware: 500, // Added value for silverware
};

const personItems: {
	watch: number;
	jewelry: number;
	cash: number;
} = {
	watch: 500,
	jewelry: 1500,
	cash: 1000,
};

const cashRegisterMin = 200;
const cashRegisterMax = 2000;

interface StoreItems {
	[key: string]: number;
}

const storeItems: StoreItems = {
	cashRegister: randomInt(cashRegisterMin, cashRegisterMax),
	food: 200,
	drink: 150,
	personalBelongings: 1000,
};

const successOdds: { [item: string]: number } = {
	lockpick: 0.3,         // 30% success rate
	disguise: 0.2,         // 20% success rate
	getawayCar: 0.5,    // 50% success rate
	flashlight: 0.1,       // 10% success rate
	hackingDevice: 0.4,    // 40% success rate
};

const robber: Command = {
	name: 'loot',
	description: 'Rob a house, person, or store for quick cash',
	usage: '!loot <house|person|store> [item1] [item2] [item3]',
	/**
	 * Executes the !loot command.
	 * @param {string} channel The channel that the command was triggered in.
	 * @param {string} user The user that triggered the command.
	 * @param {string[]} args The arguments that were passed to the command.
	 * @param {string} text The full text of the message that triggered the command.
	 * @param {ChatMessage} msg The message instance that triggered the command.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const robberyTarget = args[0];
		const chosenItems = args.slice(1, 4);

		// Check if a robbery target is specified
		if (!robberyTarget) {
			return chatClient.say(channel, `Please specify a robbery target. Usage: ${robber.usage}`);
		}

		// Perform the robbery based on the target
		// const hasValidtarget = false;
		let robberyAmount = 0;
		let stolenItems: string[] = [];

		switch (robberyTarget) {
			case 'house':
				// Calculate the total value of items in the house
				const houseValue = Object.values(houseItems).reduce((total, value) => total + value, 0);

				// Randomly select 1-4 items without introducing new variables
				stolenItems = Object.keys(houseItems)
					.sort(() => Math.random() - 0.5) // Randomize order
					.slice(0, Math.floor(Math.random() * 4) + 1); // Select up to 4 items

				// Check if any items were stolen
				if (stolenItems.length === 0) {
					await chatClient.say(channel, 'You couldn\'t find anything valuable to steal.');
					break;
				}

				// Calculate total value of stolen items
				const totalStolenValue = stolenItems.reduce((total, item) => total + houseItems[item], 0);
				// Update user's balance with stolen value (assuming you have a User model and user ID)
				// Credit the looter's wallet via adapter
				try {
					await balanceAdapter.creditWallet(msg.userInfo.userId ?? msg.userInfo.userName, totalStolenValue, msg.userInfo.userName, msg.channelId);
				} catch (err) {
					logger.error('Error crediting looter balance:', err);
				}

				// Announce stolen items and their value
				const formattedItems = stolenItems.map(item => `${item} (${houseItems[item]} coins)`);
				await chatClient.say(channel, `You stole ${formattedItems.join(', ')} from the house, totaling ${totalStolenValue} coins!`);

				robberyAmount = totalStolenValue;
				break;
			case 'person':
				// Retrieve all user models with the Bot role
				const botUsers: IUser[] = await UserModel.find({ roles: 'Bot' });

				// If there are no bots in the DB, inform the user
				if (!botUsers || botUsers.length === 0) {
					return chatClient.say(channel, 'There are currently no bot users available to rob.');
				}

				// Select a random bot user from the list (safe index)
				const randomIndex = Math.floor(Math.random() * botUsers.length);
				const randomBotUser = botUsers[randomIndex];

				// Get the username or identifier of the random bot user
				const botUserName = randomBotUser.username; // Replace with the actual property name

				// Calculate the percentage to take from the bot user (random number from 1 to 15)
				const percentageToTake = randomInt(1, 15);

				// Calculate the robbery amount, ensuring it doesn't exceed 15% of the bot's balance
				const botUserBalance = randomBotUser.balance || 0;
				const maxRobberyAmount = Math.floor(botUserBalance * 0.15); // 15% of the balance
				robberyAmount = Math.min(randomInt(1, 15), maxRobberyAmount); // Take a random percentage between 1-15%

				if (robberyAmount === 0) {
					// If the chosen bot has no funds, inform the looter specifically
					return chatClient.say(channel, `You chose to rob ${botUserName}, but they have $0 in their wallet right now.`);
				}

				// Always deduct from the legacy wallet for a person-target robbery (you can't take from their bank)
				// Try to debit by numeric id first, then by username
				const targetKey = randomBotUser.id ?? randomBotUser.username;
				const debitedFromWallet = await balanceAdapter.debitWallet(targetKey, robberyAmount as number, randomBotUser.username, msg.channelId);
				if (!debitedFromWallet) {
					return chatClient.say(channel, 'Failed to rob the target — insufficient funds or error.');
				}

				// **Calculate success odds based on stolen items**
				let successOddsMultiplier = 1;
				for (const item of stolenItems) {
					if (successOdds[item]) {
						successOddsMultiplier *= (1 + successOdds[item]);
					}
				}

				// **Apply the success odds multiplier to the robbery success rate**
				const startingSuccessRate = 0.05; // Starting success rate
				const maxSuccessRate = 0.9; // Maximum success rate

				let finalSuccessRate;

				if (stolenItems.length === 0) {
					// Use random range if no items are stolen
					finalSuccessRate = Math.random() * (maxSuccessRate - startingSuccessRate) + startingSuccessRate;
				} else {
					// Apply success odds multiplier and limit the final rate
					finalSuccessRate = Math.min(startingSuccessRate * successOddsMultiplier, maxSuccessRate);
				}
				const formattedSuccessRate = (finalSuccessRate * 100).toFixed(2) + '%';
				logger.debug('Robbery Success Rate:', formattedSuccessRate);

				// **Limit the final success rate to the maximum success rate**
				finalSuccessRate = Math.min(finalSuccessRate, maxSuccessRate);

				// **Determine if the robbery is successful based on the final success rate**
				const isSuccessful = randomInt(1, 100) <= Math.floor(finalSuccessRate * 100);

				if (isSuccessful) {
					// Add the robbery amount to the user's balance
					// You can use your existing user model and balance logic here
					// For demonstration purposes, let's just print the amount and stolen items
					// Credit looter via adapter
					await balanceAdapter.creditWallet(msg.userInfo.userId ?? msg.userInfo.userName, robberyAmount, msg.userInfo.userName, msg.channelId);
					await chatClient.say(channel, `You successfully robbed ${botUserName} and gained ${robberyAmount} coins.`);
					logger.debug('Robbery: success', { botUserName, robberyAmount });
				} else {
					// Define an array of funny failure messages
					const failedRobberyMessages = [
						`Yikes! @${user} tripped over your own shoelaces and alerted the bot guards.`,
						`The bot saw you coming from a mile away @${user}. Time to sharpen your stealing skills!`,
						`@${user} Looks like the bot has upgraded its security systems. Back to the drawing board!`,
						`The bot declined your request @${user} and politely offered you a lollipop instead.`,
						'Seems like the bot is feeling generous today. Try robbing someone else!',
					];

					const randomIndex = Math.floor(Math.random() * failedRobberyMessages.length);
					const randomMessage = failedRobberyMessages[randomIndex];
					await chatClient.say(channel, randomMessage);
					logger.debug('Robbery: failure', { user, target: botUserName });
				}

				// Moved the line assigning stolenItems**
				stolenItems = Object.keys(personItems);
				logger.debug('successOddsMultiplier', successOddsMultiplier);
				logger.debug('isSuccessful', isSuccessful);
				break;

			case 'store':
				try {
					// Select random items from the store if no specific items are chosen
					const userId = msg.userInfo.userId;
					const user = await UserModel.findOne({ id: userId, channelId: msg.channelId });
					if (chosenItems.length === 0) {
						const itemsToSteal = Object.keys(storeItems); // Get all item names

						// Guaranteed number of items to steal (between 1 and 3)
						const numItemsToSteal = Math.min(3, itemsToSteal.length);

						stolenItems = [];

						// Loop for guaranteed 1 item selection
						for (let i = 0; i < Math.min(1, numItemsToSteal); i++) {
							const randomItemIndex = randomInt(0, itemsToSteal.length - 1);
							const randomItem = itemsToSteal.splice(randomItemIndex, 1)[0]; // Remove selected item from the array
							stolenItems.push(randomItem);
						}

						// Optional loop for additional random items (up to 2)
						for (let i = 1; i < numItemsToSteal; i++) {
							const randomItemIndex = randomInt(0, itemsToSteal.length - 1);
							const randomItem = itemsToSteal.splice(randomItemIndex, 1)[0]; // Remove selected item from the array
							stolenItems.push(randomItem);
						}
					} else {
						stolenItems = chosenItems.filter(item => storeItems[item]); // Filter out invalid items
					}

					// Check if stolen items exist
					if (stolenItems.length === 0) {
						return chatClient.say(channel, 'You were unable to steal any valid items.');
					}

					// Calculate the total value of stolen items
					const stolenValue = stolenItems.reduce((total, item) => total + (storeItems[item] || 0), 0);

					// Only send message if items were stolen
					if (stolenValue > 0) {
						const stolenItemsList = stolenItems.join(', ');
						// Credit the looter via adapter rather than mutating the UserModel directly
						await balanceAdapter.creditWallet(msg.userInfo.userId ?? msg.userInfo.userName, stolenValue, msg.userInfo.userName, msg.channelId);
						await chatClient.say(channel, `You stole ${stolenItemsList} totaling ${stolenValue} coins!`);
					}
				} catch (error) {
					logger.error(error);
				}
				break;
			default:
				return chatClient.say(channel, `Invalid robbery target. ${robber.usage}`);
		}
	},
};

export default robber;