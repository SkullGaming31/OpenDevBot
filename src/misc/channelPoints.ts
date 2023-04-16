import { getUserApi } from '../api/userApiClient';
import { userID } from '../util/constants';

export async function createChannelPointsRewards(): Promise<void> { // creating the channel points rewards
	const userApiClient = await getUserApi();
	
	// const userID = '31124455';// my id
	const broadcasterID = await userApiClient.channels.getChannelInfoById(userID);
	if (broadcasterID?.id === undefined) return;
	console.log('registering Channel Points Rewards');
	try {
		// const Shoutout = await userApiClient.channelPoints.createCustomReward(broadcasterID?.id, {
		// 	title: 'ShoutOut',
		// 	cost: 2000,
		// 	autoFulfill: true,
		// 	backgroundColor: '#392e5c',
		// 	globalCooldown: 600,
		// 	isEnabled: true,
		// 	maxRedemptionsPerUserPerStream: 1,
		// 	maxRedemptionsPerStream: null,
		// 	prompt: 'You can only redeem this reward during a stream.',
		// 	userInputRequired: false
		// });
	} catch (error) { console.error(error); }
}