import { ChatMessage } from '@twurple/chat/lib';
import { randomInt } from 'crypto';
import fs from 'fs';
import { getChatClient } from '../../chat';
import { UserModel } from '../../database/models/userModel';
import { Command } from '../../interfaces/Command';
import { sleep } from '../../util/util';

type LootValue = {
	[itemName: string]: number | Gems | Antique | Artwork | Cash;
};

const lootValues: LootValue = {// maybe let AI determine its value and we just give it a rareity value for it to calculate the value from.
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
	message: string;
}

interface Injury {
	severity: string; // e.g., "minor", "moderate", "severe"
	duration: number; // Duration in seconds for recovery
	description: string; // description of the injury
}
interface Zone {
	name: string;
	difficulty: string;
}

// Store an array to keep track of participants
let participants: string[] = [];
let isHeistInProgress: boolean = false;

//not removing the balance when starting the heist
let betAmount: number = 0;

const heist: Command = {
	name: 'heist',
	description: 'start a heist with friends',
	usage: '!heist <amount> <zone>',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		// Extract the amount from the command arguments
		const amount = parseInt(args[0]);
		betAmount = amount;

		function loadInjuryDataFromFile(filePath: string): { [participantName: string]: { injuries: Injury[] } } {
			try {
				const data = fs.readFileSync(filePath, 'utf-8');
				return JSON.parse(data);
			} catch (error) {
				console.error('Error loading injury data:', error);
				return {}; // Return an empty object if there's an error
			}
		}
		const injuryData = loadInjuryDataFromFile('./src/injury_data.json');// need to test for injury loading
		// Check if the user has an injury
		if (injuryData[user] && injuryData[user].injuries.length > 0) {
			const injury = injuryData[user].injuries[0]; // Get the first injury
			const remainingInjuryDuration = Math.ceil((injury.duration - (Date.now() - injury.duration * 1000)) / (60 * 1000));
			console.log('getting hit');
			console.log('Injury Duration: ', remainingInjuryDuration);
			if (remainingInjuryDuration > 0) {
				console.log('getting hit even though my duration is greater than 0');
				await chatClient.say(channel, `${user} has an injury and needs to wait ${remainingInjuryDuration} minutes to recover.`);
				return; // Exit the command if the user has an injury
			}
		}

		// Check if the user has an injury
		// if (participantData[user] && participantData[user].injuries.length > 0) {
		// 	const injury = participantData[user].injuries[0]; // Get the first injury
		// 	// const remainingInjuryDuration = Math.floor((Date.now() - injury.duration * 1000) / (1000 * 60));
		// 	const remainingInjuryDuration = Math.ceil((injury.duration - (Date.now() - injury.duration * 1000)) / (60 * 1000));
		// 	console.log('getting hit');
		// 	console.log('Injury Duration: ', remainingInjuryDuration);
		// 	if (remainingInjuryDuration > 0) {
		// 		console.log('getting hit even though my duration is greater than 0');
		// 		await chatClient.say(channel, `${user} has an injury and needs to wait ${remainingInjuryDuration} minutes to recover.`);
		// 		return; // Exit the command if the user has an injury
		// 	}
		// }
		// Check if the user has an injury
		// if (participantData[user] && participantData[user].injuries.length > 0) {
		// 	const injury = participantData[user].injuries[0]; // Get the first injury
		// 	// const remainingInjuryDuration = Math.floor((Date.now() - injury.duration * 1000) / (1000 * 60));
		// 	const remainingInjuryDuration = Math.ceil((injury.duration - (Date.now() - injury.duration * 1000)) / (60 * 1000));
		// 	console.log('getting hit');
		// 	console.log('Injury Duration: ', remainingInjuryDuration);
		// 	if (remainingInjuryDuration > 0) {
		// 		console.log('getting hit even though my duration is greater than 0');
		// 		await chatClient.say(channel, `${user} has an injury and needs to wait ${remainingInjuryDuration} minutes to recover.`);
		// 		return; // Exit the command if the user has an injury
		// 	}
		// }

		const zones: Record<string, Zone> = {
			'abandoned_military_outpost': {
				name: 'Abandoned Military Outpost',
				difficulty: 'high',
				// Add additional properties here, like loot pool, challenges, etc.
			},
			'crumbling_industrial_complex': {
				name: 'Crumbling Industrial Complex',
				difficulty: 'moderate',
			},
			'overgrown amusement park': {
				name: 'Overgrown Amusement Park',
				difficulty: 'low'
			},
			'flooded supermarket': {
				name: 'Flooded Supermarket',
				difficulty: 'moderate'
			},
			'luxury casino': {
				name: 'Luxury Casino',
				difficulty: 'high'
			},
			'abandoned hospital': {
				name: 'Abandoned Hospital',
				difficulty: 'low'
			}
		};

		// Perform validation and checks
		if (isNaN(betAmount)) { return chatClient.say(channel, 'Please provide a valid amount for the heist.'); }

		// Check if the amount is within the allowed range
		if (betAmount < 100 || betAmount > 5000) { return chatClient.say(channel, 'The heist minimum/maximum should be between 100 and 5000.'); }

		const zoneNames = Object.values(zones).map(zone => zone.name).join(', ');
		if (args.length < 2) return chatClient.say(channel, `You must choose a zone to start the heist: ${zoneNames}`);

		// Check if there is a heist already in progress
		if (isHeistInProgress) { return chatClient.say(channel, 'A heist is already in progress. Please wait for the current heist to finish.'); }

		// Set heist in progress
		isHeistInProgress = true;
		const zoneName = args.slice(1).join(' ').toLowerCase();
		// console.log('Zone Name: ', zoneName);
		if (!(zoneName in zones)) {
			console.error('Specified zone does not exist');
			return; // or handle the error appropriately
		}

		const zoneDifficulty = zones[zoneName].difficulty;

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
		await chatClient.say(channel, `A heist has been started by ${user}! Type !join to participate, you have 60 seconds to join!`);
		await sleep(1000);
		// Send a join confirmation message
		await chatClient.say(channel, `${user} has joined the heist!`);


		// Wait for the heist to start (e.g., 60 seconds)
		const delay = 10000;
		await new Promise((resolve) => setTimeout(resolve, delay));

		// Check if there are enough participants for the heist
		if (participants.length < 1) {
			await chatClient.say(channel, 'The heist requires a minimum of 1 participants. The heist has been canceled.');
			participants = [];
			isHeistInProgress = false;
			return;
		}

		// Calculate success rate
		let successRate = calculateSuccessRate(zoneDifficulty, participants);
		switch (zoneDifficulty) {
			case 'high':
				successRate += 0.2; // Increase success rate for high difficulty zones
				break;
			case 'moderate':
				successRate += 0.1; // Increase success rate for moderate difficulty zones
				break;
			case 'low':
				successRate -= 0.1; // Decrease success rate for low difficulty zones
				break;
			default:
				break;
		}

		// Determine if the heist is successful
		const isSuccessful = randomInt(1, 101) <= successRate * 100;

		// Determine the potential loot
		let loot: number = 0;
		let stolenItems: string[] = [];

		if (isSuccessful) {
			const lootResult = calculateLoot(amount, zoneDifficulty);
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
			// Loop through each participant
			for (const participant of participants) {
				// Check for 50/50 chance of injury
				if (Math.random() <= 0.5) {
					const injurySeverity = determineInjurySeverity();

					const injury = assignInjury(participant, injurySeverity);
					resultMessage += ` ${participant} received a ${injury.severity} injury and needs to recover for ${Math.floor(injury.duration / 60)} minutes. ${injury.description}`;
				}
			}
		}

		// Send the result message to the chat
		await chatClient.say(channel, resultMessage);

		// Empty the participants array after the heist finishes
		participants = [];

		// Set heist in progress to false
		isHeistInProgress = false;
	}
};

const minorInjuryDescriptions = [
	'twisted an ankle while jumping over a fence',
	'bumped their head on a low-hanging pipe',
	'got a nasty scratch from a stray cat during the escape',
	'Clipped their shoe on a loose brick, causing a slight ankle sprain.',
	'Accidentally triggered a hidden paint grenade, leaving them covered in colorful paint but unharmed.',
	'Improvised a solution using a bobby pin and managed to escape, but strained a finger in the process.',
	'Spotted a hidden security camera at the last moment, causing them to trip and bump their head.',
	'Narrowly avoided a laser grid activation, but brushed against it, causing a minor electric shock.'
];

const moderateInjuryDescriptions = [
	'strained a muscle during the getaway',
	'received a minor burn from a faulty security system',
	'was grazed by a bullet during a close call',
	'Miscalculated a code sequence and triggered a minor explosion, receiving burns from the hot fumes.',
	'Engaged in a struggle with a security guard, resulting in a pulled muscle and a few bruises.',
	'Took a risky jump to avoid capture, spraining an ankle on the landing.',
	'Used a smoke bomb to create a diversion, but inhaled some of the smoke and developed a cough.',
	'Escaped through a narrow passage, but scraped their arm on exposed pipes.'
];

const severeInjuryDescriptions = [
	'broke an arm trying to escape through a window',
	'sustained a concussion from a fall during the heist',
	'was shot in the leg during a shootout with security',
	'Attempted a daring escape from a moving vehicle, resulting in a broken leg from a fall.',
	'Sacrificed themselves to protect their team, taking a bullet in the shoulder during a shootout.',
	'Triggered a hidden trapdoor, falling through and sustaining serious injuries.',
	'Cornered by security forces, engaged in a hand - to - hand fight and received a severe concussion.',
	'Witnessed a teammate get captured, causing them to act recklessly and get seriously injured.'
];

// Define a JSON object to store the injury data
const injuryData: { [participantName: string]: Injury[] } = {};

// Function to assign injuries to a participant
const participantData: { [participantName: string]: { injuries: Injury[] } } = {};
// function assignInjury(participant: string, severity: string): Injury {
// 	const injury = {
// 		severity: severity,
// 		duration: getInjuryDuration(severity), // Get duration based on severity
// 		description: getRandomDescription(severity), // Get random description based on severity
// 	};

// 	// Check if participant data exists, if not, create an empty object
// 	if (!participantData[participant]) {
// 		participantData[participant] = { injuries: [] };
// 	}

// 	participantData[participant].injuries.push(injury);
// 	// Log the details of the injury for the participant
// 	console.log(`Assigned injury to participant ${participant}:`, injury);
// 	return injury;
// }
// Function to assign injuries to a participant
function assignInjury(participant: string, severity: string): Injury {
	const injury = {
		severity: severity,
		duration: getInjuryDuration(severity),
		description: getRandomDescription(severity)
	};

	// Check if participant data exists, if not, create an empty array
	if (!injuryData[participant]) {
		injuryData[participant] = [];
	}

	// Add the injury to the participant's array in the JSON object
	injuryData[participant].push(injury);

	// Save the injury data to a JSON file
	saveInjuryDataToFile(injuryData, './src/injury_data.json');

	// Log the details of the injury for the participant
	console.log(`Assigned injury to participant ${participant}:`, injury);

	return injury;
}

// Function to save the injury data to a JSON file
function saveInjuryDataToFile(data: any, filePath: string) {
	// Serialize the data to JSON format
	const jsonData = JSON.stringify(data, null, 2); // Use 2 spaces for indentation

	// Write the JSON data to the file
	fs.writeFileSync(filePath, jsonData, 'utf-8');

	console.log('Injury data saved to file:', filePath);
}

function getInjuryDuration(severity: string): number {
	switch (severity) {
		case 'minor':
			return 60; // 1 minute
		case 'moderate':
			return 300; // 5 minutes
		case 'severe':
			return 900; // 15 minutes
		default:
			// Handle unknown severity cases
			return 0;
	}
}

let descriptions: string[];
function getRandomDescription(severity: string): string {
	// Choose the appropriate description array based on severity
	switch (severity) {
		case 'minor':
			descriptions = minorInjuryDescriptions;
			break;
		case 'moderate':
			descriptions = moderateInjuryDescriptions;
			break;
		case 'severe':
			descriptions = severeInjuryDescriptions;
			break;
		default:
			// Handle unknown severity cases (optional: return empty string, default description, etc.)
			descriptions = []; // Example: returning an empty array for unknown severity
			break;
	}

	// If descriptions are available, choose a random one
	if (descriptions.length > 0) {
		const randomIndex = Math.floor(Math.random() * descriptions.length);
		return descriptions[randomIndex];
	} else {
		// Handle cases where no descriptions are available (optional: return default message)
		return 'An unexpected injury occurred.'; // Example: default message for unknown severity
	}
}
function getInjuryProbability(severity: string, /* difficulty: number */): number {
	// Set base probabilities based on severity (example)
	const baseProbabilities: {
		minor: number;
		moderate: number;
		severe: number;
		[key: string]: number; // Add index signature to allow for any string keys
	} = {
		minor: 0.7,
		moderate: 0.2,
		severe: 0.1,
	};

	// Adjust probabilities based on difficulty (example)
	// const difficultyModifier = difficulty / 10; // Increase chance of higher severity with higher difficulty

	return baseProbabilities[severity] /* + difficultyModifier */;
}
function determineInjurySeverity(/* difficulty: number */): string {
	const randomValue = Math.random();

	// Calculate cumulative probabilities for each severity
	let cumulativeProbability = 0;
	const severityProbabilities: Record<string, number> = {}; // Define its structure
	for (const severity of ['minor', 'moderate', 'severe']) {
		const probability = getInjuryProbability(severity, /* difficulty */);
		cumulativeProbability += probability;
		severityProbabilities[severity] = cumulativeProbability;
	}

	// Choose severity based on random value and cumulative probabilities
	for (const [severity, probability] of Object.entries(severityProbabilities)) {
		if (randomValue <= probability) {
			return severity;
		}
	}

	// Handle unexpected cases (optional: return default severity)
	return 'minor'; // Example: return "minor" in case of unexpected behavior
}

function calculateSuccessRate(zoneDifficulty: string, participants: string[]) {
	const maxSuccessRate = 0.9; // Maximum success rate (90%)
	const maxParticipants = 10; // Maximum number of participants that influence the success rate
	const participantFactor = participants.length / maxParticipants; // Calculate the factor based on the number of participants

	// Calculate the rate of increase per participant
	const rateOfIncrease = maxSuccessRate / maxParticipants;

	// Calculate the adjusted success rate based on the factor and rate of increase
	let adjustedRate = participantFactor * rateOfIncrease;

	// Adjust for difficulty
	switch (zoneDifficulty) {
		case 'high':
			adjustedRate += 0.2; // Increase success rate for high difficulty zones
			break;
		case 'moderate':
			adjustedRate += 0.1; // Increase success rate for moderate difficulty zones
			break;
		case 'low':
			adjustedRate -= 0.1; // Decrease success rate for low difficulty zones
			break;
		default:
			break;
	}

	// Limit the success rate to the maximum
	adjustedRate = Math.min(adjustedRate, maxSuccessRate);

	return adjustedRate;
}
// function calculateLoot(amount: number, zoneDifficulty: string): LootResult {
// 	const lootItems = Object.keys(lootValues);
// 	const numItems = randomInt(1, 9);
// 	let totalLootAmount = 0;
// 	const chosenItems: string[] = [];

// 	// Define the bonus multiplier based on difficulty
// 	let bonusMultiplier = 1;
// 	switch (zoneDifficulty) {
// 		case 'high':
// 			bonusMultiplier = 1.5; // High difficulty grants a 50% bonus
// 			break;
// 		case 'moderate':
// 			bonusMultiplier = 1.2; // Moderate difficulty grants a 20% bonus
// 			break;
// 			// Low difficulty has no bonus multiplier
// 		default:
// 			break;
// 	}

// 	for (let i = 0; i < numItems; i++) {
// 		const randomIndex = randomInt(0, lootItems.length);
// 		const lootItem = lootItems[randomIndex];
// 		const lootWorth = getValue(lootValues[lootItem]);

// 		// Apply the bonus multiplier to the loot worth
// 		const adjustedLootWorth = lootWorth * bonusMultiplier;

// 		totalLootAmount += adjustedLootWorth;
// 		chosenItems.push(lootItem);
// 	}

// 	return {
// 		totalAmount: totalLootAmount,
// 		items: chosenItems,
// 	};
// }
function calculateLoot(amount: number, zoneDifficulty: string, playerInjury?: Injury): LootResult {
	const lootItems = Object.keys(lootValues);
	const numItems = randomInt(1, 9);
	let totalLootAmount = 0;
	const chosenItems: string[] = [];

	// Define the bonus multiplier based on difficulty
	let bonusMultiplier = 1;
	switch (zoneDifficulty) {
		case 'high':
			bonusMultiplier = 1.5; // High difficulty grants a 50% bonus
			break;
		case 'moderate':
			bonusMultiplier = 1.2; // Moderate difficulty grants a 20% bonus
			break;
			// Low difficulty has no bonus multiplier
		default:
			break;
	}

	if (playerInjury) {
		// Calculate the reduction in loot based on the severity of the injury
		let injuryPenalty = 0;
		switch (playerInjury.severity) {
			case 'minor':
				injuryPenalty = 500; // Example: reduce loot by a fixed amount for a minor injury
				break;
			case 'moderate':
				injuryPenalty = 1000; // Example: reduce loot by a larger amount for a moderate injury
				break;
			case 'severe':
				injuryPenalty = 2000; // Example: reduce loot by an even larger amount for a severe injury
				break;
			default:
				break;
		}
		// Apply the injury penalty to the total loot amount
		totalLootAmount = Math.max(0, totalLootAmount - injuryPenalty);
	}

	for (let i = 0; i < numItems; i++) {
		const randomIndex = randomInt(0, lootItems.length);
		const lootItem = lootItems[randomIndex];
		const lootWorth = getValue(lootValues[lootItem]);

		// Apply the bonus multiplier to the loot worth
		const adjustedLootWorth = lootWorth * bonusMultiplier;

		// Ensure the player cannot go into negative loot
		if (totalLootAmount + adjustedLootWorth < 0) {
			totalLootAmount = 0;
			break; // Stop looting if the player would go into negative loot
		} else {
			totalLootAmount += adjustedLootWorth;
			chosenItems.push(lootItem);
		}
	}

	let resultMessage = '';
	if (totalLootAmount === 0 && playerInjury) {
		resultMessage = `The heist was successful, but you sustained a ${playerInjury.severity} injury and couldn't gather any loot.`;
	}

	return {
		totalAmount: totalLootAmount,
		items: chosenItems,
		message: resultMessage,
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
	chatClient.onMessage(async (channel: string, user: string, message: string, msg: ChatMessage) => {
		const command = message.trim().toLowerCase();

		if (command === '!join' && isHeistInProgress && !participants.includes(user)) {
			// Check for user's injury
			if (participantData[user] && participantData[user].injuries.length > 0) {
				const injury = participantData[user].injuries[0]; // Get the first injury
				const remainingInjuryDuration = Math.floor((injury.duration - Date.now()) / 60000);
				if (remainingInjuryDuration > 0) {
					await chatClient.say(channel, `${user} has an injury and needs to wait ${remainingInjuryDuration} minutes to recover.`);
					return;
				}
			}
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