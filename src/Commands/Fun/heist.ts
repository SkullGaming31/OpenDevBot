import { PrivateMessage } from '@twurple/chat/lib';
import { randomInt } from 'crypto';
import { getChatClient } from '../../chat';
import UserModel from '../../database/models/userModel';
import { Command } from '../../interfaces/apiInterfaces';
import { sleep } from '../../util/util';

type LootValue = {
  [itemName: string]: number | Gems | Antique | Artwork | Cash;
};

const lootValues: LootValue = {
	gold: 2000,
	silver: 1500,
	diamond: 2500,
	artwork: {
		Paintings: 5000,
		Sculptures: 4000,
		Prints: 3000,
		Photography: 2000,
		Tapestry: 1500,
		ArtisticInstallations: 1000,
		DecorativeArtObjects: 500,
	},
	antique: {
		RareCoins: 1000,
		Currency: 800,
		Documents: 1200,
		Artifacts: 2500,
		Jewelry: 2000,
		Timepieces: 1500,
		Porcelain: 800,
		Ceramics: 1000,
		Collectibles: 1200,
	},
	gems: {
		ruby: 1000,
		diamond: 2000,
		sapphire: 1500,
		Emerald: 1800,
		Aquamarine: 1200,
		Topaz: 800,
		Opal: 1000,
		Amethyst: 900,
		Garnet: 700,
		Pearl: 600,
	},
	cash: {
		Bill1000: 1000,
		Bill500: 500,
		Bill5000: 5000,
		Bill10000: 10000,
		Bill100000: 100000,
	},
	documents: 500,
};

interface Cash {
	Bill1000: number;
	Bill500: number;
	Bill5000: number;
	Bill10000: number;
	Bill100000: number;
}

interface Artwork {
	Paintings: number;
	Sculptures: number;
	Prints: number;
	Photography: number;
	Tapestry: number;
	ArtisticInstallations: number;
	DecorativeArtObjects: number;
}

interface Antique {
	RareCoins: number;
	Currency: number;
	Documents: number;
	Artifacts: number;
	Jewelry: number;
	Timepieces: number;
	Porcelain: number;
	Ceramics: number;
	Collectibles: number;
}

interface Gems {
	diamond: number;
	ruby: number;
	sapphire: number;
	Emerald: number;
	Aquamarine: number;
	Topaz: number;
	Opal: number;
	Amethyst: number;
	Garnet: number;
	Pearl: number;
}

interface LootResult {
  totalAmount: number;
  items: string[];
}

// Store an array to keep track of participants
let participants: string[] = [];
let isHeistInProgress: boolean = false;

//not removing the balance when starting the heist
let betAmount: number = 0;

const heist: Command = {
	name: 'heist',
	description: 'start a heist with friends',
	usage: '!heist <amount>',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
		// Extract the amount from the command arguments
		const amount = parseInt(args[0]);
		betAmount = amount;

		// Perform validation and checks
		if (isNaN(betAmount)) { return chatClient.say(channel, 'Please provide a valid amount for the heist.'); }

		// Check if the amount is within the allowed range
		if (betAmount < 100 || betAmount > 5000) { return chatClient.say(channel, 'The heist minimum/maximum should be between 100 and 5000.'); }

		// Check if there is a heist already in progress
		if (isHeistInProgress) { return chatClient.say(channel, 'A heist is already in progress. Please wait for the current heist to finish.'); }

		// Set heist in progress
		isHeistInProgress = true;

		// Add user to the participant list
		participants.push(user);

		const userBalance = await UserModel.findOne({ username: msg.userInfo.userName });
		if (!userBalance) {
			throw new Error('User not found');
		}
		if (userBalance.balance === undefined) return;

		const updatedBalance = userBalance.balance - betAmount;
		await UserModel.updateOne({ username: msg.userInfo.userName }, { balance: updatedBalance });

		if (updatedBalance < 0) { return chatClient.say(channel, 'Insufficient balance for the heist.'); }

		// Send a heist start message with instructions to join
		await chatClient.say(channel, `A heist has been started by ${user}! Type !join to participate.`);
		await sleep(1000);
		// Send a join confirmation message
		await chatClient.say(channel, `${user} has joined the heist!`);


		// Wait for the heist to start (e.g., 30 seconds)
		const delay = 30000;
		await new Promise((resolve) => setTimeout(resolve, delay));

		// Check if there are enough participants for the heist
		// if (participants.length < 2) {
		// 	await chatClient.say(channel, 'The heist requires a minimum of 2 participants. The heist has been canceled.');
		// 	participants = [];
		// 	isHeistInProgress = false;
		// 	return;
		// }

		// Calculate success rate
		const successRate = calculateSuccessRate();

		// Determine if the heist is successful
		const isSuccessful = randomInt(1, 101) <= successRate * 100;

		// Determine the potential loot
		let loot: number = 0;
		let stolenItems: string[] = [];

		if (isSuccessful) {
			const lootResult = calculateLoot(amount);
			loot = lootResult.totalAmount;
			stolenItems = lootResult.items;
		}

		//
		const numWinners = randomInt(1, participants.length + 1);
		const winningAmount = Math.floor(loot / numWinners);
		// Randomly select the winners
		const winners = participants.sort(() => 0.5 - Math.random()).slice(0, numWinners);

		// Construct the result message
		let resultMessage = `Heist initiated by ${user}.`;
		if (isSuccessful) {
			resultMessage += ' The heist was successful!';
			for (const winner of winners) {
				const winnerBalance = await UserModel.findOne({ username: winner });
				if (!winnerBalance) {
					throw new Error(`User ${winner} not found`);
				}
				if (winnerBalance.balance === undefined) return;
				// Create a new object with the updated balance
				const updatedBalance = winnerBalance.balance + winningAmount;
				await UserModel.updateOne({ username: winner }, { balance: updatedBalance });
			}

			// Check if there are any winners
			if (winners.length > 0) {
				resultMessage += ` Congratulations to the winners: ${winners.join(', ')}.`;
			} else {
				resultMessage += ' Unfortunately, no one won the heist.';
			}

			resultMessage += ` You managed to steal ${loot} units of loot. You stole the following items: ${stolenItems.join(', ')}`;
		} else {
			resultMessage += ' The heist failed. Better luck next time!';
		}

		// Send the result message to the chat
		await chatClient.say(channel, resultMessage);

		// Empty the participants array after the heist finishes
		participants = [];

		// Set heist in progress to false
		isHeistInProgress = false;
	}
};

function calculateSuccessRate() {
	const maxSuccessRate = 0.9; // Maximum success rate (90%)
	const maxParticipants = 10; // Maximum number of participants that influence the success rate
	const participantFactor = participants.length / maxParticipants; // Calculate the factor based on the number of participants
  
	// Calculate the rate of increase per participant
	const rateOfIncrease = maxSuccessRate / maxParticipants;
  
	// Calculate the adjusted success rate based on the factor and rate of increase
	const adjustedRate = participantFactor * rateOfIncrease;
  
	// Limit the success rate to the maximum
	const successRate = Math.min(adjustedRate, maxSuccessRate);
  
	return successRate;
}
function calculateLoot(amount: number): LootResult {
	const lootItems = Object.keys(lootValues);
	const numItems = randomInt(1, 9);
	let totalLootAmount = 0;
	const chosenItems: string[] = [];

	for (let i = 0; i < numItems; i++) {
		const randomIndex = randomInt(0, lootItems.length);
		const lootItem = lootItems[randomIndex];
		const lootWorth = getValue(lootValues[lootItem]);

		totalLootAmount += lootWorth;
		chosenItems.push(lootItem);
	}

	return {
		totalAmount: totalLootAmount,
		items: chosenItems,
	};
}

function getValue(item: number | Gems | Antique | Artwork | Cash): number {
	if (typeof item === 'number') {
		return item;
	} else if (typeof item === 'object') {
		const gemValues = Object.values(item) as number[];
		return gemValues.reduce((sum, value) => sum + value, 0);
	} else {
		throw new Error('Invalid loot item type.');
	}
}

// Handle the join command
(async () => {
	const chatClient = await getChatClient();
	chatClient.onMessage(async (channel: string, user: string, message: string, msg: PrivateMessage) => {
		const command = message.trim().toLowerCase();

		if (command === '!join' && isHeistInProgress && !participants.includes(user)) {
			const userBalance = await UserModel.findOne({ username: msg.userInfo.userName });
		
			if (!userBalance) {
				throw new Error('User not found');
			}
			if (userBalance.balance === undefined) return;
			if (userBalance.balance < betAmount) {
				await chatClient.say(channel, 'Insufficient balance to join the heist.');
				return;
			}
		
			userBalance.balance -= betAmount;
			await userBalance.save();
		
			participants.push(user);
			await chatClient.say(channel, `${user} has joined the heist!`);
		}
	});
})();

export default heist;