"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChannelPointsRewards = void 0;
async function createChannelPointsRewards() {
    console.log('registering Channel Points Rewards');
    try {
        // const tipping = await userApiClient.channelPoints.createCustomReward(broadcasterID, {
        // 	title: 'Tip',
        // 	cost: 1,
        // 	autoFulfill: true,
        // 	backgroundColor: '#d0080a',
        // 	globalCooldown: null,
        // 	isEnabled: true,
        // 	maxRedemptionsPerUserPerStream: null,
        // 	maxRedemptionsPerStream: null,
        // 	prompt: 'click for a link to my Tipping Page',
        // 	userInputRequired: false
        // });
    }
    catch (error) {
        console.error(error);
    }
}
exports.createChannelPointsRewards = createChannelPointsRewards;
