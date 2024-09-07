import { UserIdResolvable } from '@twurple/api';
import { getUserApi } from '../api/userApiClient';

export async function createChannelPointsRewards(registerNewRewards: boolean = true): Promise<void> { // creating the channel points rewards
	if (!registerNewRewards) return;
	const userApiClient = await getUserApi();

	const broadcasterID = await userApiClient.channels.getChannelInfoById('31124455');
	if (broadcasterID?.id === undefined) return;
	console.log('registering Channel Points Rewards');
	try {
		switch (broadcasterID.id) {
			case '31124455':
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

export async function DeleteChannelPointsRewards(DeleteReward: boolean = false): Promise<void> {
	if (!DeleteReward) return;
	const userApiClient = await getUserApi();

	const broadcasterID = await userApiClient.channels.getChannelInfoById('31124455');
	if (broadcasterID?.id === undefined) return;
	console.log('Deleting Channel Points Rewards');
	try {
		if (broadcasterID.id === '31124455') {
			const TBD = await userApiClient.channelPoints.deleteCustomReward('31124455', '5c18b145-5824-4c8c-9419-4c0b4f52f489');
		}
	} catch (error) {
		console.error(error);
	}
}