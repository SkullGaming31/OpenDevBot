import { getUserApi } from '../api/userApiClient';
import { userID } from '../util/constants';

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

export async function createChannelPointsRewards(): Promise<void> { // creating the channel points rewards
	const userApiClient = await getUserApi();
	
	const broadcasterID = await userApiClient.channels.getChannelInfoById(userID);
	if (broadcasterID?.id === undefined) return;
	console.log('registering Channel Points Rewards');
	try {
		const tip = await userApiClient.channelPoints.createCustomReward(broadcasterID?.id, {
			title: 'Tip',
			cost: 1,
			autoFulfill: true,
			backgroundColor: '#392e5c',
			globalCooldown: 600,
			isEnabled: true,
			maxRedemptionsPerUserPerStream: null,
			maxRedemptionsPerStream: null,
			prompt: 'click for a link to my Tipping Page',
			userInputRequired: false
		});
	} catch (error) { console.error(error); }
}