import { ChatMessage } from '@twurple/chat/lib';
import { randomInt } from 'node:crypto';
import { getChatClient } from '../../chat';
import { User, UserModel } from '../../database/models/userModel';
import { Command } from '../../interfaces/apiInterfaces';

const houseItems = {
	tv: 1000,
	console: 800,
	computer: 1200,
	laptop: 1500,
	cash: 2000,
};

const personItems = {
	watch: 500,
	jewelry: 1500,
	cash: 1000,
};

const cashRegisterMin = 200;
const cashRegisterMax = 5000;

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
	name: 'robber',
	description: 'Rob a house, person, or store for quick cash',
	usage: '!robber <house|person|store> [item1] [item2] [item3]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const robberyTarget = args[0];
		const chosenItems = args.slice(1, 4);

		// Check if a robbery target is specified
		if (!robberyTarget) {
			return chatClient.say(channel, `Please specify a robbery target. Usage: ${robber.usage}`);
		}

		// Perform the robbery based on the target
		let robberySuccessful = false;
		let robberyAmount = 0;
		let stolenItems: string[] = [];

		switch (robberyTarget) {
		case 'house':
			// Calculate the total value of items in the house
			const houseValue = Object.values(houseItems).reduce((total, value) => total + value, 0);
			robberyAmount = houseValue;
			robberySuccessful = true;
			stolenItems = Object.keys(houseItems);
			break;
		case 'person':
			// Retrieve all user models with the Bot role
			const botUsers: User[] = await UserModel.find({ roles: 'Bot' });
		
			// Select a random bot user from the list
			const randomBotUser = botUsers[randomInt(0, botUsers.length - 1)];
		
			if (!randomBotUser) {
				return chatClient.say(channel, 'An error occurred while attempting to rob a bot user.');
			}
		
			// Get the username or identifier of the random bot user
			const botUserName = randomBotUser.username; // Replace 'username' with the actual property name of the username or identifier in your user model
		
			// Calculate the percentage to take from the random bot user (random number from 1 to 15)
			const percentageToTake = randomInt(1, 15);
		
			// Calculate the robbery amount based on the percentage to take
			const botUserBalance = randomBotUser.balance || 0;
			robberyAmount = Math.floor((botUserBalance * percentageToTake) / 100);
		
			if (robberyAmount === 0) {
				return chatClient.say(channel, 'There are no eligible bot users to rob at the moment.');
			}
		
			// Update the bot user's balance by deducting the robbery amount
			randomBotUser.balance = botUserBalance - robberyAmount;
			await randomBotUser.save();
		
			robberySuccessful = true;
			stolenItems = Object.keys(personItems);
		
			// Send the message with the bot user and stolen items information
			chatClient.say(channel, `You successfully robbed ${botUserName} and gained ${robberyAmount} coins. You stole the following items: ${stolenItems.join(', ')}`);
			break;
		case 'store':
			// Select random items from the store if no specific items are chosen
			if (chosenItems.length === 0) {
				const itemsToSteal = Object.keys(storeItems);
				const numItemsToSteal = randomInt(1, Math.min(3, itemsToSteal.length)); // Random number of items to steal, up to a maximum of 3
				stolenItems = [];

				for (let i = 0; i < numItemsToSteal; i++) {
					const randomItemIndex = randomInt(0, itemsToSteal.length - 1);
					const randomItem = itemsToSteal.splice(randomItemIndex, 1)[0]; // Remove the selected item from the array
					stolenItems.push(randomItem);
				}
			} else {
				stolenItems = chosenItems.filter(item => storeItems[item]); // Filter out invalid items
			}

			// Check if chosen items exist in the inventory
			const missingItems = chosenItems.filter(item => !storeItems[item]);
			if (missingItems.length > 0) {
				return chatClient.say(channel, `You don't have the following items in your inventory: ${missingItems.join(', ')}`);
			}

			// Calculate the total value of stolen items
			const stolenValue = stolenItems.reduce((total, item) => total + (storeItems[item] || 0), 0);
			if (stolenValue === 0) {
				return chatClient.say(channel, 'You were unable to steal any valid items.');
			}
			robberySuccessful = true;
			robberyAmount = stolenValue;

			// Check if cash register is among the stolen items
			if (stolenItems.includes('cashRegister')) {
				const cashRegisterAmount = storeItems['cashRegister'];
				stolenItems = stolenItems.filter(item => item !== 'cashRegister'); // Remove 'cashRegister' from the stolen items list
				stolenItems.push(`cashRegister (${cashRegisterAmount} coins)`); // Add 'cashRegister' with amount to the stolen items list
			}

			break;
		default:
			return chatClient.say(channel, `Invalid robbery target. ${robber.usage}`);
		}

		if (robberySuccessful) {
			// Increase the success odds based on the stolen items
			let successOddsMultiplier = 1;
			for (const item of stolenItems) {
				if (successOdds[item]) {
					successOddsMultiplier *= (1 + successOdds[item]);
				}
			}

			// Apply the success odds multiplier to the robbery success rate
			const startingSuccessRate = 0.05; // Starting success rate
			const maxSuccessRate = 0.9; // Maximum success rate

			let finalSuccessRate = startingSuccessRate * successOddsMultiplier;

			// Limit the final success rate to the maximum success rate
			finalSuccessRate = Math.min(finalSuccessRate, maxSuccessRate);

			// Determine if the robbery is successful based on the final success rate
			const isSuccessful = randomInt(1, 100) <= Math.floor(finalSuccessRate * 100);

			if (isSuccessful) {
				// Add the robbery amount to the user's balance
				// You can use your existing user model and balance logic here
				// For demonstration purposes, let's just print the amount and stolen items
				chatClient.say(channel, `You successfully robbed the ${robberyTarget} and gained ${robberyAmount} coins. You stole the following items: ${stolenItems.join(', ')}`);
			} else {
				chatClient.say(channel, 'Robbery failed. Better luck next time!');
			}
		} else {
			chatClient.say(channel, 'Robbery failed. Better luck next time!');
		}
	},
};

export default robber;