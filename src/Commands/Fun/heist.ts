import { ChatClient, ChatMessage } from '@twurple/chat/lib';
import { randomInt } from 'crypto';
import fs from 'fs';
import { getChatClient } from '../../chat';
import balanceAdapter from '../../services/balanceAdapter';
import * as economyService from '../../services/economyService';
import mongoose from 'mongoose';
import BankAccount from '../../database/models/bankAccount';
import { Command } from '../../interfaces/Command';
import { sleep } from '../../util/util';
import { ParticipantModel } from '../../database/models/Participant';
import { InjuryModel } from '../../database/models/injury';

import ENVIRONMENT from '../../util/env';

type LootValue = {
	[itemName: string]: number | Gems | Antique | Artwork | Cash;
};

const lootValues: LootValue = {
	gold: 2000,
	silver: 1500,
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
export interface Injury {
	severity: string;
	duration: number;
	description: string;
	timestamp: number;
}

interface InjuryData {
	[participantName: string]: Injury[];
}
interface Zone {
	name: string;
	difficulty: string;
}

// Store an array to keep track of participants
let participants: string[] = [];
let isHeistInProgress: boolean = false;
let betAmount: number = 0;

// Per-channel cooldown map for bank heists (channelId -> timestamp when allowed again)
const heistCooldowns: Map<string, number> = new Map();
const HEIST_COOLDOWN_MS = 60 * 1000; // 1 minute cooldown per channel (tunable)
const MIN_PARTICIPANTS = 1; // per your request, allow 1 for testing

const participantData: { [participantName: string]: { injuries: Injury[] } } = {};
// Define a JSON object to store the injury data
const injuryData: { [participantName: string]: Injury[] } = {};

const heist: Command = {
	name: 'heist',
	description: 'start a heist with friends',
	usage: '!heist <amount> <zone>',
	/**
	 * Handles the !heist command. Allows users to start a heist.
	 * @param {string} channel The channel the command was sent in.
	 * @param {string} user The user who sent the command.
	 * @param {string[]} args The arguments provided with the command.
	 * @param {string} text The text of the command.
	 * @param {ChatMessage} msg The message object.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		// Extract the amount from the command arguments
		const amount = parseInt(args[0]);
		betAmount = amount;
		const channelId = msg.channelId;

		// Function to load injury data from MongoDB
		async function loadInjuryDataFromMongoDB(): Promise<InjuryData> {
			try {
				// Retrieve all injury data from MongoDB
				const injuryData = await InjuryModel.find().lean().exec();

				// Convert the retrieved data to the desired format
				const formattedData: InjuryData = {};
				injuryData.forEach((entry) => {
					const participantName = entry.participantName;
					const injuries = entry.injuries.map((injury: Injury) => ({
						severity: injury.severity,
						duration: injury.duration,
						description: injury.description,
						timestamp: injury.timestamp
					}));
					formattedData[participantName] = injuries;
				});

				return formattedData;
			} catch (error) {
				console.error('Error loading injury data from MongoDB:', error);
				return {};
			}
		}
		const existingInjuryData = await loadInjuryDataFromMongoDB();

		// Check if the user has any active injuries before executing the !heist command
		if (participantData[user] && participantData[user].injuries.length > 0) {
			const injury = participantData[user].injuries[0]; // Since a user can only have one injury
			const injuryEndTime = injury.timestamp + injury.duration * 1000; // Convert duration to milliseconds
			const remainingInjuryDurationSeconds = Math.ceil((injuryEndTime - Date.now()) / 1000); // Calculate remaining duration in seconds
			const remainingInjuryDurationMinutes = Math.ceil(remainingInjuryDurationSeconds / 60); // Convert seconds to minutes

			if (remainingInjuryDurationMinutes > 0) {
				const timeString = remainingInjuryDurationMinutes === 1 ? 'minute' : 'minutes';
				await chatClient.say(channel, `${user} has an active injury and needs to wait ${remainingInjuryDurationMinutes} ${timeString} to recover.`);
				return; // Exit the command if the user has an active injury
			} else {
				await deleteEntryFromDatabase(user);
			}
		} else {
			// No injuries for the user
		}

		// Check if there are injuries in the database for the user attempting the command
		if (existingInjuryData[user] && existingInjuryData[user].length > 0) {
			// console.log('User has injuries in the database:', existingInjuryData[user]);
			// Additional logic here if needed
		} else {
			console.log('User does not have any injuries in the database.');
		}


		// Perform validation and checks
		if (isNaN(betAmount)) { return chatClient.say(channel, 'Please provide a valid amount for the heist.'); }

		// Check if the amount is within the allowed range
		if (betAmount < 100 || betAmount > 5000) { return chatClient.say(channel, 'The heist minimum/maximum should be between 100 and 5000.'); }

		const zonesFilePath = './src/zones.json';
		const zonesJSON = fs.readFileSync(zonesFilePath, 'utf-8');
		const zones: Record<string, Zone> = JSON.parse(zonesJSON);

		const zoneNames = Object.values(zones).map(zone => zone.name).join(', ');
		if (args.length < 2) return chatClient.say(channel, `You must choose a zone to start the heist: ${zoneNames}`);

		// Check if there is a heist already in progress
		if (isHeistInProgress) { return chatClient.say(channel, 'A heist is already in progress. Please wait for the current heist to finish.'); }

		// Create a new object with lowercase keys
		const zonesLowercase: Record<string, Zone> = {};
		Object.keys(zones).forEach(key => {
			const zoneNameLowercase = key.split('_').join(' ').toLowerCase(); // Convert underscores to spaces
			zonesLowercase[zoneNameLowercase] = zones[key];
		});

		const zoneName = args.slice(1).join(' ').trim().toLowerCase();
		// Check if the lowercase zoneName exists in the zonesLowercase object
		if (!(zoneName in zonesLowercase)) {
			console.error('Specified zone does not exist');
			// console.log('zoneName:', zoneName);
			// console.log('zones:', zonesLowercase);
			await chatClient.say(channel, `The specified zone "${zoneName}" does not exist. Available zones are: ${Object.values(zones).map(zone => zone.name).join(', ')}`);
			return; // or handle the error appropriately
		}

		// Set heist in progress
		// Check cooldown if bank zone is requested
		if (zoneName === 'bank') {
			const now = Date.now();
			const cd = heistCooldowns.get(channelId ?? channel) ?? 0;
			if (now < cd) {
				const remaining = Math.ceil((cd - now) / 1000);
				return chatClient.say(channel, `Bank heist is on cooldown for this channel. Try again in ${remaining}s.`);
			}
		}

		isHeistInProgress = true;

		const zoneDifficulty = zonesLowercase[zoneName].difficulty;

		// Add user to the participant list
		participants.push(user);

		// Add the user who started the heist to the participantData object
		if (!participantData[user]) {
			participantData[user] = { injuries: [] };
		}

		// console.log('Participant Data:', participantData);
		if (participantData[user]) {
			// console.log('Participant Data for User:', participantData[user]);
			console.log('Injuries:', participantData[user]?.injuries);
		} else {
			// console.log('Participant Data for User:', participantData[user]);
		}

		// Debit the initiating user's wallet for the bet amount (legacy wallet). If insufficient, abort.
		const initiatorId = msg.userInfo.userId ?? msg.userInfo.userName;
		const debited = await balanceAdapter.debitWallet(initiatorId, betAmount, msg.userInfo.userName, channelId);
		if (!debited) return chatClient.say(channel, 'Insufficient balance for the heist.');

		// Send a heist start message with instructions to join
		await chatClient.say(channel, `A heist has been started by ${user}! Type !join to participate, you have 60 seconds to join!`);
		await sleep(1000);
		// Send a join confirmation message
		await chatClient.say(channel, `${user} has joined the heist!`);


		// Wait for the heist to start (e.g., 60 seconds)
		const ENVIROMENT = ENVIRONMENT as string;
		let delay = 0;
		if (ENVIROMENT !== 'dev' && ENVIROMENT !== 'debug') {
			delay = 60000;
		} else {
			delay = 10000;
		}
		await new Promise((resolve) => setTimeout(resolve, delay));

		// Check if there are enough participants for the heist
		if (participants.length < MIN_PARTICIPANTS) {
			participants = [];
			isHeistInProgress = false;
			await chatClient.say(channel, `The heist requires a minimum of ${MIN_PARTICIPANTS} participants. The heist has been canceled.`);
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
		let donorDetails: Array<{ userId: string; amount: number }> = [];

		if (isSuccessful) {
			// If the chosen zone is the special 'bank' zone, perform a conservative bank heist:
			// - sample a small number of user BankAccounts
			// - take up to donorMaxPercent or donorMaxAbsolute from each (capped)
			// - attempt to perform all debits in a transaction when possible
			// - distribute collected pool to winners' wallets
			if (zoneName === 'bank') {
				// Conservative defaults
				const donorSampleSize = 5;
				const donorMinBalance = 1000;
				const donorMaxPercent = 0.1; // 10%
				const donorMaxAbsolute = 500; // absolute cap per donor
				const needed = amount;

				// Fetch candidate donors (limit to a few times sample size to randomize)
				const candidates = await BankAccount.find({ balance: { $gte: donorMinBalance } }).limit(donorSampleSize * 5).lean();
				if (!candidates || candidates.length === 0) {
					// No eligible donors — heist fails
					loot = 0;
					stolenItems = [];
				} else {
					// shuffle candidates
					for (let i = candidates.length - 1; i > 0; i--) {
						const j = Math.floor(Math.random() * (i + 1));
						[candidates[i], candidates[j]] = [candidates[j], candidates[i]];
					}
					const donors = candidates.slice(0, donorSampleSize);

					let collected = 0;
					donorDetails = [];
					// Try transactional path first
					let usedTransaction = false;
					try {
						const session = await mongoose.startSession();
						session.startTransaction();
						for (const donor of donors) {
							if (collected >= needed) break;
							const maxFromDonor = Math.min(Math.floor((donor.balance || 0) * donorMaxPercent), donorMaxAbsolute);
							const take = Math.min(maxFromDonor, needed - collected);
							if (take <= 0) continue;
							await economyService.withdraw(donor.userId, take, session);
							collected += take;
							donorDetails.push({ userId: donor.userId, amount: take });
						}
						if (collected > 0) {
							await session.commitTransaction();
							console.debug('Heist: transaction committed', { collected, donorDetails });
							usedTransaction = true;
						} else {
							await session.abortTransaction();
							console.debug('Heist: transaction aborted, collected=0');
						}
						session.endSession();
					} catch (err) {
						// Transaction path unavailable or failed — fall back to non-transactional per-donor withdraws
						console.warn('Bank heist transaction path failed, falling back to per-donor withdraws', err);
					}

					if (!usedTransaction) {
						// Non-transactional fallback: attempt to withdraw from each donor individually
						for (const donor of donors) {
							if (collected >= needed) break;
							const maxFromDonor = Math.min(Math.floor((donor.balance || 0) * donorMaxPercent), donorMaxAbsolute);
							const take = Math.min(maxFromDonor, needed - collected);
							if (take <= 0) continue;
							try {
								await economyService.withdraw(donor.userId, take);
								collected += take;
								donorDetails.push({ userId: donor.userId, amount: take });
							} catch (err) {
								// skip donors that couldn't be debited
								console.warn('Failed to withdraw from donor in fallback path', donor.userId, err);
							}
						}
						console.debug('Heist: fallback collected', { collected, donorDetails });
					}

					loot = collected;
					stolenItems = [];
				}
			} else {
				const lootResult = calculateLoot(amount, zoneDifficulty);
				loot = lootResult.totalAmount;
				stolenItems = lootResult.items;
			}
		}
		// console.log('Stolen Items:', stolenItems);

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
				// Credit each winner's wallet via adapter.creditWallet
				try {
					console.debug('Heist: crediting winner', { winner, winningAmount, channelId });
					if (zoneName === 'bank') {
						// For bank heists, credit the BankAccount directly so deposits are recorded
						console.debug('Heist: depositing to bank account for winner', { winner, winningAmount });
						await economyService.deposit(winner, winningAmount);
					} else {
						await balanceAdapter.creditWallet(winner, winningAmount, winner, channelId);
					}
				} catch (err) {
					console.warn('Failed to credit winner in heist', err);
				}
			}

			// Check if there are any winners
			if (winners.length > 0) {
				resultMessage += ` Congratulations to the winners: ${winners.join(', ')}.`;
			} else {
				resultMessage += ' Unfortunately, no one won the heist.';
			}

			resultMessage += ` You managed to steal ${loot} units of loot. You stole the following items: ${stolenItems.join(', ')}`;
			// Save updated injury data to MongoDB
			await saveInjuryDataToMongoDB(convertToInjuryData(participantData));

			// If bank heist, append masked donor summary and set cooldown
			if (zoneName === 'bank') {
				// Build a masked summary of donors: show first 3 chars then ****
				const masked = (donorDetails || []).map(d => {
					const id = String(d.userId || '');
					const label = id.length > 3 ? `${id.slice(0, 3)}****` : `${id}****`;
					return `${label} (${d.amount})`;
				});
				if (masked.length > 0) {
					resultMessage += ` Donors hit: ${masked.join(', ')}.`;
				}
				// Set channel cooldown
				heistCooldowns.set(channelId ?? channel, Date.now() + HEIST_COOLDOWN_MS);
			}
		} else {
			resultMessage += ' The heist failed. Better luck next time!';
			// Loop through each participant
			for (const participant of participants) {
				// Check for 50/50 chance of injury
				if (Math.random() <= 0.9) {
					const injurySeverity = determineInjurySeverity();

					// Assign the injury and get the injury details
					const injury = assignInjury(participant, injurySeverity);

					// Update participantData with the new injury
					if (participantData[participant]) {
						participantData[participant].injuries.push(injury);
					} else {
						participantData[participant] = { injuries: [injury] };
					}

					// Save updated injury data to MongoDB
					await saveInjuryDataToMongoDB(convertToInjuryData(participantData));

					// Log the updated participantData
					// console.log('Updated ParticipantData:', participantData);

					// Construct the result message with injury details
					resultMessage += ` ${participant} received a ${injury.severity} injury and needs to recover for ${Math.floor(injury.duration / 60)} minutes. ${injury.description}`;
				}
			}
		}

		// Helper function to convert participantData to InjuryData
		function convertToInjuryData(participantData: { [participantName: string]: { injuries: Injury[] } }): InjuryData {
			const injuryData: InjuryData = {};
			for (const participantName in participantData) {
				injuryData[participantName] = participantData[participantName].injuries;
			}
			return injuryData;
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

// Function to assign injuries to a participant
function assignInjury(participant: string, severity: string): Injury {
	const injury = {
		severity: severity,
		duration: getInjuryDuration(severity),
		description: getRandomDescription(severity),
		timestamp: Date.now() // Add current timestamp
	};

	// Check if participant data exists, if not, create an empty array
	if (!injuryData[participant]) {
		injuryData[participant] = [];
	}

	// Add the injury to the participant's array in the JSON object
	injuryData[participant].push(injury);

	// Log the details of the injury for the participant
	console.log(`Assigned injury to participant ${participant}:`, injury);

	return injury;
}

// Function to save injury data to MongoDB
async function saveInjuryDataToMongoDB(data: InjuryData): Promise<void> {
	try {
		// Iterate through each participant's injury data and update it in MongoDB
		for (const participantName in data) {
			const injuries = data[participantName];
			if (injuries.length > 0) {
				// If there are injuries for the participant, update the existing injury
				const injury = injuries[0]; // Assuming there's only one injury per user
				await InjuryModel.findOneAndUpdate(
					{ participantName },
					{ injuries: [injury] }, // Update with the new injury
					{ new: true, upsert: true }
				);
			}
		}
		// console.log('Injury data saved to MongoDB');
	} catch (error) {
		console.error('Error saving injury data to MongoDB:', error);
	}
}

/**
 * Returns the duration of an injury in seconds, given its severity.
 * @param severity The severity of the injury, one of 'minor', 'moderate', or 'severe'.
 * @returns The duration of the injury in seconds.
 */
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
/**
 * Returns a random injury description based on the given severity.
 * @param severity The severity of the injury, one of 'minor', 'moderate', or 'severe'.
 * @returns A random injury description as a string.
 * @description
 * If the severity is unknown, the function will return an empty string.
 * If there are no descriptions available for the given severity,
 * the function will return a default message.
 */
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
/**
 * Calculates the probability of a given severity of injury occurring.
 * @param severity The severity of the injury to calculate the probability for.
 * @returns The probability of the given severity of injury occurring.
 * @description
 * The probability is based on the severity of the injury and adjusted by the
 * difficulty of the heist. The higher the difficulty, the higher the probability
 * of a higher severity injury occurring.
 */
function getInjuryProbability(severity: string, /* difficulty: number */): number {
	// Set base probabilities based on severity (example)
	const baseProbabilities: {
		minor: number;
		moderate: number;
		severe: number;
		[key: string]: number;
	} = {
		minor: 0.4,   // Adjusted probabilities
		moderate: 0.2,
		severe: 0.9,
	};

	// Adjust probabilities based on difficulty (example)
	// const difficultyModifier = difficulty / 10; // Increase chance of higher severity with higher difficulty

	return baseProbabilities[severity] /* + difficultyModifier */;
}

/**
 * Determines the severity of an injury based on cumulative probabilities for each severity.
 * 
 * @param difficulty The difficulty level affecting the injury severity calculation.
 * @returns The determined severity of the injury ('minor', 'moderate', or 'severe').
 */
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

/**
 * Calculates the success rate for a heist based on the number of participants and the difficulty of the zone.
 * 
 * The success rate is calculated as follows:
 * 1. A factor is calculated based on the number of participants, with a maximum of 10 participants.
 * 2. The rate of increase per participant is calculated.
 * 3. The adjusted success rate is calculated by multiplying the factor by the rate of increase.
 * 4. The adjusted success rate is then adjusted based on the difficulty of the zone.
 * 5. The success rate is limited to a maximum of 90%.
 * 
 * @param zoneDifficulty The difficulty level of the zone ('low', 'moderate', or 'high').
 * @param participants The number of participants in the heist.
 * @returns The calculated success rate for the heist.
 */
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

/**
 * Calculates the loot obtained from a successful heist.
 * 
 * @param amount The amount of loot available to be stolen.
 * @param zoneDifficulty The difficulty level of the zone ('low', 'moderate', or 'high').
 * @param playerInjury Optional. The injury sustained by the player while performing the heist.
 * @returns An object containing the total loot amount, the items obtained, and a message to be displayed to the player.
 */
function calculateLoot(amount: number, zoneDifficulty: string, playerInjury?: Injury): LootResult {
	const lootItems = Object.entries(lootValues);
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
		const [itemName, itemValue] = lootItems[randomInt(0, lootItems.length - 1)];
		const lootWorth = getValue(itemValue);

		// Apply the bonus multiplier to the loot worth
		const adjustedLootWorth = lootWorth * bonusMultiplier;

		// Ensure the player cannot go into negative loot
		if (totalLootAmount + adjustedLootWorth < 0) {
			totalLootAmount = 0;
			break; // Stop looting if the player would go into negative loot
		} else {
			totalLootAmount += adjustedLootWorth;
			chosenItems.push(itemName);
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

/**
 * Gets the total value of a loot item.
 *
 * If the item is a number, it's returned directly.
 * If the item is an array, its elements are summed up.
 * If the item is an object, its property values are summed up.
 *
 * @throws {Error} If the item is not one of the above types.
 *
 * @param {number | Gems | Antique | Artwork | Cash} item
 * @returns {number}
 */
function getValue(item: number | Gems | Antique | Artwork | Cash): number {
	if (typeof item === 'number') {
		return item;
	} else if (typeof item === 'object') {
		if (Array.isArray(item)) {
			// If it's an array, sum up its elements
			return item.reduce((sum, value) => sum + value, 0);
		} else {
			// If it's an object, sum up the values of its properties
			const values = Object.values(item);
			return values.reduce((sum, value) => sum + value, 0);
		}
	} else {
		throw new Error('Invalid loot item type.');
	}
}
/**
 * Deletes the entry for a given user from the injuries collection in the database.
 *
 * @param {string} user The user to delete the entry for.
 * @returns {Promise<void>}
 * @throws {Error} If there is an error deleting the entry from the database.
 */
async function deleteEntryFromDatabase(user: string): Promise<void> {
	try {
		// Find and delete the entry corresponding to the user from the database
		await InjuryModel.deleteOne({ participant: user });
		console.log(`Entry for ${user} deleted from the database.`);
	} catch (error) {
		console.error(`Error deleting entry for ${user} from the database:`, error);
		throw error;
	}
}

// Handle the join command
(async () => {
	const chatClient: ChatClient = await getChatClient();
	chatClient.onMessage(async (channel: string, user: string, message: string, msg) => {
		const command = message.trim().toLowerCase();
		const channelId = msg.channelId;

		if (command === '!join' && isHeistInProgress && !participants.includes(user)) {
			// Check if the user has any recorded injuries
			if (participantData[user] && participantData[user].injuries.length > 0) {
				const injury = participantData[user].injuries[0];
				const injuryEndTime = injury.timestamp + injury.duration * 1000;
				const remainingInjuryDuration = Math.ceil((injuryEndTime - Date.now()) / 1000);

				if (remainingInjuryDuration > 0) {
					await chatClient.say(channel, `${user} has an injury and needs to wait ${remainingInjuryDuration} seconds to recover.`);
					return;
				} else {
					// console.log(`No active injuries for ${user}.`);
					await deleteEntryFromDatabase(user);
				}
			}

			// Continue with the join process using balanceAdapter to debit the user's wallet
			const joinerId = msg.userInfo.userId ?? msg.userInfo.userName;
			const debited = await balanceAdapter.debitWallet(joinerId, betAmount, msg.userInfo.userName, channelId);
			if (!debited) {
				await chatClient.say(channel, 'Insufficient balance to join the heist.');
				return;
			}

			participants.push(user);

			// Add the user to the participantData object if not already present
			if (!participantData[user]) {
				participantData[user] = { injuries: [] };
			}
			await chatClient.say(channel, `${user} has joined the heist!`);
		}
	});
})();
export default heist;
