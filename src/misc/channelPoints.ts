import { UserIdResolvable } from '@twurple/api';
import { getUserApi } from '../api/userApiClient';
import { broadcasterInfo } from '../util/constants';

/**
 * tip- 1- click for a link to my Tipping Page
 * YouTube- 1- click for a link to my youtube channel
 * Discord- 1- click for a link to my discord server
 * SnapChat- 1- click for a link to my Snapchat
 * Instagram- 1- Click for a link to my Instagram profile
 * Facebook- 1- click for a link to my facebook page
 * Twitter- 1- Click for a link to my twitter profile
 * Merch- 1- click for a link to my Merch Shop: disabled
 * Hydrate- 250- Make me take a sip of whatever im drinking!
 * DropController- 1000- put down the controller for 15 seconds!
 * Ban an in-game action- 1500- Ban an In-Game Action while playing a game only!: text required true
 * IRLVoiceBan- 1500- I can't say anything for the next 3 minutes!
 * IRLWordBan- 1500- What Word can i not say for 5 minutes!: text Required true
 * MUTEHeadset- 2000- Mute Headset Sounds for 5 minutes!
 * 
 */

export async function createChannelPointsRewards(registerNewRewards: boolean = true): Promise<void> { // creating the channel points rewards
	if (!registerNewRewards) return;
	const userApiClient = await getUserApi();

	const broadcasterID = await userApiClient.channels.getChannelInfoById(broadcasterInfo[0].id);
	if (broadcasterID?.id === undefined) return;
	console.log('registering Channel Points Rewards');
	try {
		if (broadcasterID.id === '31124455') {
		// const Discord = await userApiClient.channelPoints.createCustomReward(broadcasterID?.id, {
		// 	title: 'Discord',
		// 	cost: 1,
		// 	autoFulfill: true,
		// 	backgroundColor: '#32CD32',
		// 	globalCooldown: 600,
		// 	isEnabled: true,
		// 	maxRedemptionsPerUserPerStream: null,
		// 	maxRedemptionsPerStream: null,
		// 	prompt: 'Get a link to my discord server',
		// 	userInputRequired: false
		// });
		}
	} catch (error) { console.error(error); }
}

export async function DeleteChannelPointsRewards(DeleteReward: boolean = false): Promise<void> {
	if (!DeleteReward) return;
	const userApiClient = await getUserApi();

	const broadcasterID = await userApiClient.channels.getChannelInfoById('204831754');
	if (broadcasterID?.id === undefined) return;
	console.log('Deleting Channel Points Rewards');
	try {
		if (broadcasterID.id === '') {
			const TBD = await userApiClient.channelPoints.deleteCustomReward('204831754', '27716a8a-496d-4b94-b727-33be94b81611');
		}
	} catch (error) {
		console.error(error);
	}
}