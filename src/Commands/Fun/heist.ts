import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { sleep } from '../../util/util';

type LootValue = {
  [itemName: string]: number;
};
const lootValues: LootValue = {
	gold: 1000,
	silver: 500,
	diamond: 2000,
	artwork: 1500,
	antique: 800,
	electronics: 1200,
	cash: 5000,
	documents: 1000,
};

interface LootResult {
  totalAmount: number;
  items: string[];
}

// Store an array to keep track of participants
let participants: string[] = [];
let isHeistInProgress: boolean = false;

const heist: Command = {
	name: 'heist',
	description: 'start a heist with friends',
	usage: '!heist <amount>',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
		// Extract the amount from the command arguments
		const amount = parseInt(args[0]);

		// Perform validation and checks
		if (isNaN(amount)) {
			await chatClient.say(channel, 'Please provide a valid amount for the heist.');
			return;
		}

		// Check if the amount is within the allowed range
		if (amount < 100 || amount > 5000) {
			await chatClient.say(channel, 'The heist minimum/maximum should be between 100 and 5000.');
			return;
		}

		// Check if there is a heist already in progress
		if (isHeistInProgress) {
			await chatClient.say(channel, 'A heist is already in progress. Please wait for the current heist to finish.');
			return;
		}

		// Set heist in progress
		isHeistInProgress = true;

		// Add user to the participant list
		participants.push(user);

		// Send a heist start message with instructions to join
		await chatClient.say(channel, `A heist has been started by ${user}! Type !join to participate.`);
		await sleep(1000);
		// Send a join confirmation message
		await chatClient.say(channel, `${user} has joined the heist!`);


		// Wait for the heist to start (e.g., 30 seconds)
		const delay = 30000;
		await new Promise((resolve) => setTimeout(resolve, delay));

		// Check if there are enough participants for the heist
		if (participants.length < 2) {
			await chatClient.say(channel, 'The heist requires a minimum of 2 participants. The heist has been canceled.');
			participants = [];
			isHeistInProgress = false;
			return;
		}

		// Calculate success rate
		const successRate = calculateSuccessRate();

		// Determine if the heist is successful
		const isSuccessful = Math.random() < successRate;

		// Determine the potential loot
		let loot: number = 0;
		let stolenItems: string[] = [];

		if (isSuccessful) {
			const lootResult = calculateLoot(amount);
			loot = lootResult.totalAmount;
			stolenItems = lootResult.items;
		}

		// Calculate the number of winners
		const numWinners = Math.floor(Math.random() * participants.length) + 1;

		// Randomly select the winners
		const winners = participants.sort(() => 0.5 - Math.random()).slice(0, numWinners);

		// Construct the result message
		let resultMessage = `Heist initiated by ${user}.`;
		if (isSuccessful) {
			resultMessage += ' The heist was successful!';

			// Check if there are any winners
			if (winners.length > 0) {
				resultMessage += ` Congratulations to the winners: ${winners.join(', ')}.`;
			} else {
				resultMessage += ' Unfortunately, no one won the heist.';
			}

			resultMessage += ` You managed to steal ${loot} units of loot, You stole the following items: ${stolenItems.join(', ')}`;
		} else {
			resultMessage += ' The heist failed. Better luck next time!';
		}

		// // Construct the result message
		// let resultMessage = `Heist initiated by ${user}.`;
		// if (isSuccessful) {
		// 	resultMessage += ` The heist was successful! You managed to steal ${loot} units of loot. You stole the following items: ${stolenItems.join(', ')}.`;
		// } else {
		// 	resultMessage += ' The heist failed. Better luck next time!';
		// }

		// Send the result message to the chat
		await chatClient.say(channel, resultMessage);

		// Empty the participants array after the heist finishes
		participants = [];

		// Set heist in progress to false
		isHeistInProgress = false;
	}
};

function calculateSuccessRate() {
	// Example: Always 50% success rate
	return 0.5;
}

function calculateLoot(amount: number): LootResult {
	const lootItems = Object.keys(lootValues);
	const numItems = Math.floor(Math.random() * 8) + 1;

	let totalLootAmount = 0;
	const chosenItems: string[] = [];

	for (let i = 0; i < numItems; i++) {
		const randomIndex = Math.floor(Math.random() * lootItems.length);
		const lootItem = lootItems[randomIndex];
		const lootWorth = lootValues[lootItem];

		totalLootAmount += lootWorth;
		chosenItems.push(lootItem);
	}

	return {
		totalAmount: totalLootAmount,
		items: chosenItems,
	};
}

// Handle the join command
(async () => {
	const chatClient = await getChatClient();

	chatClient.onMessage(async (channel: string, user: string, message: string, msg: PrivateMessage) => {
		const command = message.trim().toLowerCase();
  
		if (command === '!join' && isHeistInProgress && !participants.includes(user)) {
			participants.push(user);
			await chatClient.say(channel, `${user} has joined the heist!`);
		}
	});
})();

export default heist;
