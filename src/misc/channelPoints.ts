import { UserIdResolvable } from '@twurple/api';
import { getUserApi } from '../api/userApiClient';

/**
 * Creates the channel points rewards, given a boolean of whether to register new rewards or not
 * @param {boolean} registerNewRewards - Whether to register new rewards or not
 * @returns {Promise<void>} - The promise of registering the channel points rewards
 */
export async function createChannelPointsRewards(registerNewRewards: boolean = true): Promise<void> { // creating the channel points rewards
	if (!registerNewRewards) return;
	const userApiClient = await getUserApi();

	const broadcasterID = await userApiClient.channels.getChannelInfoById('1155035316');

	if (broadcasterID?.id === undefined) return;

	// Define the rewards we want to ensure exist
	const desiredRewards = [
		{
			title: 'TFD UserWeapon',
			cost: 1,
			autoFulfill: true,
			backgroundColor: '#FFD700',
			globalCooldown: 30,
			isEnabled: true,
			maxRedemptionsPerUserPerStream: null,
			maxRedemptionsPerStream: null,
			prompt: 'Nexon Account Name (ex GamingDragon688#7080)',
			userInputRequired: true
		},
		{
			title: 'TFD UserReactor',
			cost: 1,
			autoFulfill: true,
			backgroundColor: '#FFD700',
			globalCooldown: 30,
			isEnabled: true,
			maxRedemptionsPerUserPerStream: null,
			maxRedemptionsPerStream: null,
			prompt: 'Nexon Account Name (ex GamingDragon688#7080)',
			userInputRequired: true
		},
		{
			title: 'TFD UserEC',
			cost: 1,
			autoFulfill: true,
			backgroundColor: '#FFD700',
			globalCooldown: 30,
			isEnabled: true,
			maxRedemptionsPerUserPerStream: null,
			maxRedemptionsPerStream: null,
			prompt: 'Nexon Account Name (ex GamingDragon688#7080)',
			userInputRequired: true
		}
	];

	console.log('registering Channel Points Rewards (if available)');
	try {
		// Probe for channel points availability by attempting to list existing rewards
		let existingRewards: any[] = [];
		try {
			existingRewards = (await userApiClient.channelPoints.getCustomRewards(broadcasterID.id)) || [];
		} catch (probeErr) {
			console.info(`Channel Points not available or API returned an error for broadcaster ${broadcasterID.id}:`, String(probeErr));
			return; // Bail out gracefully if channel points are not enabled for this channel
		}

		// Create any desired rewards that do not already exist (by title)
		for (const desired of desiredRewards) {
			const exists = existingRewards.some(r => String(r.title).toLowerCase() === String(desired.title).toLowerCase());
			if (!exists) {
				try {
					await userApiClient.channelPoints.createCustomReward(broadcasterID.id, desired);
					console.log(`Created reward: ${desired.title}`);
				} catch (createErr) {
					console.error(`Failed to create reward ${desired.title}:`, createErr);
				}
			} else {
				console.log(`Reward already exists: ${desired.title}`);
			}
		}
	} catch (error) {
		console.error('Unexpected error while managing channel points rewards:', error);
	}
}

/**
 * Deletes the channel points rewards, given a boolean of whether to delete the rewards or not
 * @param {boolean} DeleteReward - Whether to delete the rewards or not
 * @returns {Promise<void>} - The promise of deleting the channel points rewards
 */
export async function DeleteChannelPointsRewards(DeleteReward: boolean = false): Promise<void> {
	if (!DeleteReward) return;
	const userApiClient = await getUserApi();

	const broadcasterID = await userApiClient.channels.getChannelInfoById('1155035316');
	if (broadcasterID?.id === undefined) return;

	console.log('Deleting Channel Points Rewards (if present)');
	try {
		// Probe for existing rewards and only attempt deletes if the reward exists
		let existingRewards: any[] = [];
		try {
			existingRewards = (await userApiClient.channelPoints.getCustomRewards(broadcasterID.id)) || [];
		} catch (probeErr) {
			console.info(`Channel Points not available or API returned an error for broadcaster ${broadcasterID.id}:`, String(probeErr));
			return; // Nothing to delete if channel points are not available
		}

		// Example: delete by known id(s) if present
		const targetId = '5c18b145-5824-4c8c-9419-4c0b4f52f489';
		if (existingRewards.some(r => r.id === targetId)) {
			await userApiClient.channelPoints.deleteCustomReward(broadcasterID.id, targetId);
			console.log(`Deleted reward id ${targetId}`);
		} else {
			console.log(`Reward id ${targetId} not found; nothing to delete.`);
		}
	} catch (error) {
		console.error('Unexpected error while deleting channel points rewards:', error);
	}
}