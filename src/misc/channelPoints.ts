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
	console.log('registering Channel Points Rewards');
	try {
		switch (broadcasterID.id) {
			case '1155035316':
				await userApiClient.channelPoints.createCustomReward(broadcasterID?.id, {
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
				});
				await userApiClient.channelPoints.createCustomReward(broadcasterID?.id, {
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
				});
				await userApiClient.channelPoints.createCustomReward(broadcasterID?.id, {
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
				});
				break;
			default:
				console.log('test', broadcasterID.id);
				break;
		}
	} catch (error) { console.error(error); }
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
	console.log('Deleting Channel Points Rewards');
	try {
		if (broadcasterID.id === '1155035316') {
			const TBD = await userApiClient.channelPoints.deleteCustomReward('1155035316', '5c18b145-5824-4c8c-9419-4c0b4f52f489');
		}
	} catch (error) {
		console.error(error);
	}
}