const express = require('express');
const countdown = require('countdown');
const fs = require('fs/promises');
const axios = require('axios').default;
const { RefreshingAuthProvider, ClientCredentialsAuthProvider } = require('@twurple/auth');
const { ApiClient } = require('@twurple/api');
const { ChatClient } = require('@twurple/chat');
const { PubSubClient } = require('@twurple/pubsub');
const { EventSubListener } = require('@twurple/eventsub');
const { NgrokAdapter } = require('@twurple/eventsub-ngrok');
const { WebhookClient, MessageEmbed } = require('discord.js');

const { rwClient } = require('./tweet');
const config = require('../config');


async function main() {
	const clientId = config.TWITCH_CLIENT_ID;
	const clientSecret = config.TWITCH_CLIENT_SECRET;
	const eventSubSecret = config.TWITCH_EVENTSUB_SECRET;

	const tokenData = JSON.parse(await fs.readFile('./tokens.json', 'UTF-8'));
	const authProvider = new RefreshingAuthProvider({
		clientId,
		clientSecret,
		onRefresh: async (newTokenData) => await fs.writeFile('./tokens.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')
	}, tokenData);
	
	const userTokenData = JSON.parse(await fs.readFile('./src/auth/tokens/users.json', 'UTF-8'));
	const userAuthProvider = new RefreshingAuthProvider({
		clientId,
		clientSecret,
		onRefresh: async (newTokenData) => await fs.writeFile('./src/auth/tokens/users.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')
	}, userTokenData);

	const modvlogTokenData = JSON.parse(await fs.readFile('./src/auth/tokens/modvlog.json', 'UTF-8'));
	const modvlogAuthProvider = new RefreshingAuthProvider({
		clientId,
		clientSecret,
		onRefresh: async (newTokenData) => await fs.writeFile('./src/auth/tokens/modvlog.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')
	}, modvlogTokenData);

	const chatClient = new ChatClient({ authProvider, channels: ['skullgaming31', 'modvlog'], logger: { minLevel: 'error' } });
	await chatClient.connect().then(() => console.log('connected to Twitch Chat') ).catch((err) => { console.error(err); });
	const appAuthProvider = new ClientCredentialsAuthProvider(clientId, clientSecret);
	const apiClient = new ApiClient({ authProvider: appAuthProvider, logger: { minLevel: 'critical' } });
	const userApiClient = new ApiClient({ authProvider: userAuthProvider, logger: { minLevel: 'error' } });
	const modvlogApiClient = new ApiClient({ authProvider: modvlogAuthProvider, logger: { minLevel: 'error' }});
	await apiClient.eventSub.deleteAllSubscriptions();
	

	async function createChannelPointsRewards() { // creating the channel points rewards
		console.log('registering Channel Points Rewards');
		try {
			console.log('nothing running yet');
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
		// 	const weaponLoadout = await userApiClient.channelPoints.createCustomReward(broadcasterID, {
		// 		title: 'Weapon Loadout',
		// 		cost: 300,
		// 		autoFulfill: false,
		// 		backgroundColor: '#9146FF',
		// 		globalCooldown: null,
		// 		isEnabled: true,
		// 		maxRedemptionsPerUserPerStream: null,
		// 		maxRedemptionsPerStream: null,
		// 		prompt: 'Choose my Primary Weapon when playing Vigor',
		// 		userInputRequired: true
		// 	});	
		} catch (error) { console.error(error); }
	}
	
	// eventSub Stuff
	const userId = '31124455';// my id
	const userID = '204831754';// mods id
	const broadcasterID = await apiClient.channels.getChannelInfo(userId);
	const broadcaster = await apiClient.channels.getChannelInfo(userID);
	const twitchActivity = new WebhookClient({
		id: config.DISCORD_WEBHOOK_ID,
		token: config.DISCORD_WEBHOOK_TOKEN,
	});
	if (process.env.NODE_ENV === 'development') {
		const limeGreen = '#32CD32';
		const eventSubListener = new EventSubListener({
			apiClient,
			adapter: new NgrokAdapter(),
			secret: eventSubSecret,
			logger: { minLevel: 'error' }
		});
		await eventSubListener.listen().then(() => console.log('Event Listener Started')).catch((err) => console.error(err));
		
		const shoutoutUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID, '52c6bb77-9cc1-4f67-8096-d19c9d9f8896', {
			title: 'Shoutout',
			cost: 2000,
			autoFulfill: true,
			backgroundColor: '#09CB4C',
			globalCooldown: 60,
			isEnabled: true,
			maxRedemptionsPerUserPerStream: 3,
			maxRedemptionsPerStream: null,
			prompt: 'shout yourself out with Channel Points',
			userInputRequired: false
		});
		const twitterUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID, 'e80f9746-d183-47cb-933e-bdf9d3be5241', {
			title: 'Twitter',
			cost: 1,
			autoFulfill: true,
			backgroundColor: '#d0080a',
			globalCooldown: 30,
			isEnabled: true,
			maxRedemptionsPerUserPerStream: null,
			maxRedemptionsPerStream: null,
			prompt: 'Click for a link to my twitter profile',
			userInputRequired: false
		});
		const instagramUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID, 'c8ca7ccf-9e2f-4313-8e28-35eecdcda685', {
			title: 'Instagram',
			cost: 1,
			autoFulfill: true,
			backgroundColor: '#d0080a',
			globalCooldown: 30,
			isEnabled: true,
			maxRedemptionsPerUserPerStream: null,
			maxRedemptionsPerStream: null,
			prompt: 'Click for a link to my Instagram profile',
			userInputRequired: false
		});
		const tiktokUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID, '144837ed-514a-436c-95cf-d9491efad240', {
			title: 'TicTok',
			cost: 1,
			autoFulfill: true,
			backgroundColor: '#d0080a',
			globalCooldown: 30,
			isEnabled: true,
			maxRedemptionsPerUserPerStream: null,
			maxRedemptionsPerStream: null,
			prompt: 'Click for a link to my Tik-Tok profile',
			userInputRequired: false
		});
		const discordUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID, '9aa5fab9-2648-4875-b9c8-ebfb9dee7019', {
			title: 'Discord',
			cost: 1,
			autoFulfill: true,
			backgroundColor: '#d0080a',
			globalCooldown: 30,
			isEnabled: true,
			maxRedemptionsPerUserPerStream: null,
			maxRedemptionsPerStream: null,
			prompt: 'click for a link to my discord server',
			userInputRequired: false
		});
		const facebookUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID, 'df73bcbd-a01c-4453-8ae3-987078ced3ab', {
			title: 'Facebook',
			cost: 1,
			autoFulfill: true,
			backgroundColor: '#d0080a',
			globalCooldown: 30,
			isEnabled: true,
			maxRedemptionsPerUserPerStream: null,
			maxRedemptionsPerStream: null,
			prompt: 'click for a link to my facebook page',
			userInputRequired: false
		});
		const youtubeUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID, '993abcd3-613b-4e7a-ab0c-ae0705a707bd', {
			title: 'YouTube',
			cost: 1,
			autoFulfill: true,
			backgroundColor: '#d0080a',
			globalCooldown: 30,
			isEnabled: true,
			maxRedemptionsPerUserPerStream: null,
			maxRedemptionsPerStream: null,
			prompt: 'click for a link to my youtube channel',
			userInputRequired: false
		});
		const snapchatUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID, 'ad16d5e3-b88c-43d3-9349-0203cbaf88cc', {
			title: 'Snapchat',
			cost: 1,
			autoFulfill: true,
			backgroundColor: '#d0080a',
			globalCooldown: 30,
			isEnabled: true,
			maxRedemptionsPerUserPerStream: null,
			maxRedemptionsPerStream: null,
			prompt: 'click for a link to my Snapchat',
			userInputRequired: false
		});
		const merchUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID, 'f7ed2b68-35d5-4b57-bf54-704274d89670', {
			title: 'Merch',
			cost: 1,
			autoFulfill: true,
			backgroundColor: '#d0080a',
			globalCooldown: 30,
			isEnabled: true,
			maxRedemptionsPerUserPerStream: null,
			maxRedemptionsPerStream: null,
			prompt: 'click for a link to my Merch Shop',
			userInputRequired: false
		});
		const tipUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID, '64c19c30-5560-4b68-8716-be508de12d3d', {
			title: 'Tip',
			cost: 1,
			autoFulfill: true,
			backgroundColor: '#d0080a',
			globalCooldown: 5,
			isEnabled: true,
			maxRedemptionsPerUserPerStream: null,
			maxRedemptionsPerStream: null,
			prompt: 'click for a link to my Tipping Page',
			userInputRequired: false
		});
		const reminder = await userApiClient.channelPoints.updateCustomReward(broadcasterID, 'dc495854-7c9e-47d4-a6ac-96a736f9f32c', {
			title: 'Crafting Reminder',
			cost: 300,
			autoFulfill: true,
			backgroundColor: '#4b73f9',
			globalCooldown: 1200,
			isEnabled: true,
			maxRedemptionsPerUserPerStream: null,
			maxRedemptionsPerStream: null,
			prompt: 'remind me to craft a VZ-Rifle',
			userInputRequired: false
		});
		const weaponLoadoutUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID, '2e4b420f-5362-41a3-9999-abba4156771a', {
			title: 'Weapon Loadout',
			cost: 300,
			autoFulfill: false,
			backgroundColor: '#9146FF',
			globalCooldown: 1200,
			isEnabled: true,
			maxRedemptionsPerUserPerStream: null,
			maxRedemptionsPerStream: null,
			prompt: 'Choose my Primary Weapon when playing Vigor, No Knifes',
			userInputRequired: true
		});
		// await createChannelPointsRewards();

		
		const follower = await eventSubListener.subscribeToChannelFollowEvents(userID, async e => {
			console.log(`${e.userName} has followed the channel, ${e.followDate}`);
			// chatClient.say(broadcaster.name, `${e.userName} has followed the channel, ${e.followDate}`);
		});
		const modvlogOnline = await eventSubListener.subscribeToStreamOnlineEvents(userID, async o => {
			const stream = await o.getStream();
			const userInfo = await o.getBroadcaster();
			// chatClient.say(broadcaster.name, `${o.broadcasterDisplayName} has just gone live playing ${broadcasterID.gameName} with ${stream.viewers} viewers.`);
			// await rwClient.v2.tweet(`${userInfo.displayName} has gone live playing ${stream.gameName} here: https://twitch.tv/${userInfo.name}`);

			const LIVE = new WebhookClient({
				url: config.MOD_DISCORD_WEBHOOK_PROMOTE_URL
			});
			const liveEmbed = new MessageEmbed()
				.setTitle('GONE LIVE')
				.setAuthor({ name: `${o.broadcasterName}`, iconURL: `${userInfo.profilePictureUrl}` })
				.addFields([
					{
						name: 'Stream Title',
						value: `${stream.title}`,
						inline: true
					},
					{
						name: 'game: ',
						value: `${stream.gameName || 'No Game Set'}`,
						inline: true
					},
					{
						name: 'Viewers: ',
						value: `${stream.viewers}`,
						inline: true
					},
				])
				.setThumbnail(`${userInfo.offlinePlaceholderUrl}`)
				.setURL(`https://twitch.tv/${userInfo.name}`)
				.setColor('RANDOM')
				.setTimestamp();
			LIVE.send({ content: '@everyone', embeds: [liveEmbed] });
			await chatClient.disableEmoteOnly(broadcaster.name).catch((err) => { console.error(err); });
		});
		const modvlogOffline = await eventSubListener.subscribeToStreamOfflineEvents(userID, async stream => {

			console.log(`${stream.broadcasterDisplayName} has gone offline, thanks for stopping by i appreacate it!`);
			chatClient.say(broadcaster.name, `${stream.broadcasterDisplayName} has gone offline, thank you for stopping by!`);
			await chatClient.enableEmoteOnly(broadcaster.name).catch((err) => { console.error(err); });
		});
		const modvlogSub = await eventSubListener.subscribeToChannelSubscriptionEvents(userID, async sub => {
			console.log(`${sub.userName} has Subscribed to the channel with a tier ${sub.tier} Subscription`);
			// chatClient.say(broadcaster.name, `${sub.userName} has Subscribed to the channel with a tier ${sub.tier} Subscription`);
		});
		const modvlogResub = await eventSubListener.subscribeToChannelSubscriptionMessageEvents(userID, async s => {
			console.log(`${s.userDisplayName} has resubbed to the channel for ${s.cumulativeMonths}, currently on a ${s.streakMonths} streak, ${s.messageText}`);
			// chatClient.say(broadcaster.name, `${s.userDisplayName} has resubbed to the channel for ${s.cumulativeMonths}, currently on a ${s.streakMonths} streak, ${s.messageText}`);
		});
		const modvlogGiftedSubs = await eventSubListener.subscribeToChannelSubscriptionGiftEvents(userID, async gift => {
			console.log(`${gift.gifterDisplayName} has just gifted ${gift.amount} ${gift.tier} subs to ${gift.broadcasterName}, they have given a total of ${gift.cumulativeAmount} Subs to the channel`);
		});
		const modvlogCheers = await eventSubListener.subscribeToChannelCheerEvents(userID, async cheer => {
			if (cheer.bits >= 50) {
				console.log(`${cheer.userDisplayName} has cheered ${cheer.bits} bits`);
			}
		});
		const modvlogRaided = await eventSubListener.subscribeToChannelRaidEventsFrom(userID, async raid => {
			console.log(`${raid.raidingBroadcasterDisplayName} has raided the channel with ${raid.viewers} viewers!`);
			// chatClient.say(broadcaster.name, `${raid.raidingBroadcasterDisplayName} has raided the channel with ${raid.viewers} viewers!`);
		});
		const modvlogTitle = await eventSubListener.subscribeToChannelUpdateEvents(userID, async update => {
			console.log(`updated title to ${update.streamTitle}, categoryName: ${update.categoryName}`);
		});



		const online = await eventSubListener.subscribeToStreamOnlineEvents(userId, async o => {
			const stream = await o.getStream();
			const userInfo = await o.getBroadcaster();
			chatClient.say(broadcasterID.name, `${o.broadcasterDisplayName} has just gone live playing ${broadcasterID.gameName} with ${stream.viewers} viewers.`);
			await rwClient.v2.tweet(`${userInfo.displayName} has gone live playing ${stream.gameName} here: https://twitch.tv/${userInfo.name}`);

			const LIVE = new WebhookClient({
				url: config.DISCORD_WEBHOOK_PROMOTE_URL
			});
			const liveEmbed = new MessageEmbed()
				.setTitle('GONE LIVE')
				.setAuthor({ name: `${o.broadcasterName}`, iconURL: `${userInfo.profilePictureUrl}` })
				.addFields([
					{
						name: 'Stream Title',
						value: `${stream.title}`,
						inline: true
					},
					{
						name: 'game: ',
						value: `${stream.gameName || 'No Game Set'}`,
						inline: true
					},
					{
						name: 'Viewers: ',
						value: `${stream.viewers}`,
						inline: true
					},
				])
				.setThumbnail(`${userInfo.offlinePlaceholderUrl}`)
				.setURL(`https://twitch.tv/${userInfo.name}`)
				.setColor(limeGreen)
				.setTimestamp();
			LIVE.send({ content: '@everyone', embeds: [liveEmbed] });
			await chatClient.disableEmoteOnly(broadcasterID.name).catch((err) => { console.error(err); });
		});
		const offline = await eventSubListener.subscribeToStreamOfflineEvents(userId, async stream => {
			if (userId !== '31124455') return;
			console.log(`${stream.broadcasterDisplayName} has gone offline, thanks for stopping by i appreacate it!`);
			chatClient.say(broadcasterID.name, `${stream.broadcasterDisplayName} has gone offline, thank you for stopping by!`);
			await chatClient.enableEmoteOnly(broadcasterID.name).catch((err) => { console.error(err); });
		});
		const redeem = await eventSubListener.subscribeToChannelRedemptionAddEvents(userId, async cp => { 
			const userInfo = await cp.getUser();
			const streamer = await cp.getBroadcaster();
			console.log(broadcasterID.name, `${cp.userDisplayName}: Reward Name: ${cp.rewardTitle}, rewardId: ${cp.rewardId}, BroadcasterId: ${cp.id}`);
			// const reward = await userApiClient.channelPoints.getRedemptionById(broadcasterID, `${cp.rewardId}`, `${cp.id}`);
			switch (cp.rewardTitle || cp.rewardId) {
			case 'Weapon Loadout':
				// console.log(`${cp.userDisplayName} has redeemed ${cp.rewardTitle} and would like you to use ${cp.input}`);
				chatClient.say(broadcasterID.name, `${cp.userDisplayName} has redeemed ${cp.rewardTitle} and would like you to use ${cp.input}`);

				const weaponLoadoutEmbed = new MessageEmbed()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
					.setColor(limeGreen)
					.addFields([
						{
							name: 'User: ',
							value: `${cp.userDisplayName}`,
							inline: true
						},
						{
							name: 'Redeemed: ',
							value: `${cp.rewardTitle}, \nWeapon: ${cp.input}`,
							inline: true
						},
						{
							name: 'Skulls: ',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${userInfo.profilePictureUrl}`)
					.setFooter({ text: 'Channel Points Redeem Event', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [weaponLoadoutEmbed] });
				break;
			case 'Shoutout':
				const user = await apiClient.users.getUserByName(cp.userName);
				const gameLastPlayed = await apiClient.channels.getChannelInfo(user.id);
				chatClient.say(broadcasterID.name, `@${cp.userDisplayName} has redeemed a shoutout, help them out by giving them a follow here: https://twitch.tv/${cp.userName}, last seen playing: ${gameLastPlayed.gameName}`);

				const shoutoutEmbed = new MessageEmbed()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
					.setColor(limeGreen)
					.addFields([
						{
							name: 'Viewer: ',
							value: `${cp.userDisplayName}`,
							inline: true
						},
						{
							name: 'Playing: ',
							value: `${gameLastPlayed.gameName}`,
							inline: true
						},
						{
							name: 'Cost: ',
							value: `${cp.rewardCost} skulls`,
							inline: true
						}
					])
					.setThumbnail(`${userInfo.profilePictureUrl}`)
					.setURL(`https://twitch.tv/${cp.userName}`)
					.setFooter({ text: 'Click the event name to go to the Redeemers Twitch Channel', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [shoutoutEmbed] });
				break;
			case 'Tip':
				chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName}'s Tipping Page: https://overlay.expert/celebrate/SkullGaming31`);

				const tipEmbed = new MessageEmbed()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
					.setColor(limeGreen)
					.addFields([
						{
							name: 'User',
							value: `${cp.userDisplayName}`,
							inline: true
						},
						{
							name: 'Redeemed',
							value: `${cp.rewardTitle}`,
							inline: true
						},
						{
							name: 'Skulls',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setURL(`https://twitch.tv/${userInfo.name}`)
					.setFooter({ text: 'Click the event name to go to the Redeemers Twitch Channel', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [tipEmbed] });
				break;
			case 'Twitter':
				console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}, rewardId: ${cp.rewardId}`);
				chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName}'s Twitter: https://twitter.com/skullgaming31`);

				const twitterEmbed = new MessageEmbed()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
					.setColor(limeGreen)
					// .setDescription(`**${userInfo.displayName}** has redeemed \n**${cp.rewardTitle}** \nfor **${cp.rewardCost} Skulls**`)
					.addFields([
						{
							name: 'User',
							value: `${cp.userDisplayName}`,
							inline: true
						},
						{
							name: 'Redeemed',
							value: `${cp.rewardTitle}`,
							inline: true
						},
						{
							name: 'Skulls',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setURL(`https://twitch.tv/${userInfo.name}`)
					.setFooter({ text: 'Click the event name to go to the Redeemers Twitch Channel', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [twitterEmbed] });
				break;
			case 'Instagram':
				console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
				chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName}'s Instagram: https://instagram.com/skullgaming31`);

				const instagramEmbed = new MessageEmbed()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
					.setColor(limeGreen)
					// .setDescription(`${userInfo.displayName} has redeemed ${cp.rewardTitle} for ${cp.rewardCost} Skulls`)
					.addFields([
						{
							name: 'User',
							value: `${cp.userDisplayName}`,
							inline: true
						},
						{
							name: 'Redeemed',
							value: `${cp.rewardTitle}`,
							inline: true
						},
						{
							name: 'Skulls',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [instagramEmbed] });
				break;
			case 'YouTube':
				console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
				chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName}'s YouTube: https://youtube.com/channel/UCaJPv2Hx2-HNwUOCkBFgngA`);

				const youtubeEmbed = new MessageEmbed()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
					.setColor(limeGreen)
					.addFields([
						{
							name: 'User',
							value: `${cp.userDisplayName}`,
							inline: true
						},
						{
							name: 'Redeemed',
							value: `${cp.rewardTitle}`,
							inline: true
						},
						{
							name: 'Skulls',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [youtubeEmbed] });
				break;
			case 'TikTok':
				console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
				chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName}'s Tok-Tok: https://tiktok.com/@skullgaming31`);

				const tiktokEmbed = new MessageEmbed()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
					.setColor(limeGreen)
					.addFields([
						{
							name: 'User',
							value: `${cp.userDisplayName}`,
							inline: true
						},
						{
							name: 'Redeemed',
							value: `${cp.rewardTitle}`,
							inline: true
						},
						{
							name: 'Skulls',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [tiktokEmbed] });
				break;
			case 'Snapchat':
				console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
				chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName}'s Snapchat: https://snapchat.com/add/skullgaming31`);

				const snapchatEmbed = new MessageEmbed()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
					.setColor(limeGreen)
					.addFields([
						{
							name: 'User',
							value: `${cp.userDisplayName}`,
							inline: true
						},
						{
							name: 'Redeemed',
							value: `${cp.rewardTitle}`,
							inline: true
						},
						{
							name: 'Skulls',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [snapchatEmbed] });
				break;
			case 'Facebook':
				console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
				chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName}'s Facebook: https://facebook.com/gaming/SkullGaming8461`);

				const facebookEmbed = new MessageEmbed()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
					.setColor(limeGreen)
					.addFields([
						{
							name: 'User',
							value: `${cp.userDisplayName}`,
							inline: true
						},
						{
							name: 'Redeemed',
							value: `${cp.rewardTitle}`,
							inline: true
						},
						{
							name: 'Skulls',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [facebookEmbed] });
				break;
			case 'Discord':
				console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
				chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName}'s Discord: https://discord.com/invite/6gGxrQMC9A`);

				const discordEmbed = new MessageEmbed()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
					.setColor(limeGreen)
					// .setDescription(`${userInfo.displayName} has redeemed ${cp.rewardTitle} for ${cp.rewardCost} Skulls`)
					.addFields([
						{
							name: 'User',
							value: `${cp.userDisplayName}`,
							inline: true
						},
						{
							name: 'Redeemed',
							value: `${cp.rewardTitle}`,
							inline: true
						},
						{
							name: 'Skulls',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setURL(`https://twitch.tv/${userInfo.name}`)
					.setFooter({ text: 'Click the event name to go to the Redeemers Twitch Channel', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [discordEmbed] });
				break;
			case 'Merch':
				console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
				chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName}'s Merch: https://skullgaming31-merch.creator-spring.com`);

				const merchEmbed = new MessageEmbed()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
					.setColor(limeGreen)
					// .setDescription(`${userInfo.displayName} has redeemed ${cp.rewardTitle} for ${cp.rewardCost} Skulls`)
					.addFields([
						{
							name: 'User',
							value: `${cp.userDisplayName}`,
							inline: true
						},
						{
							name: 'Redeemed',
							value: `${cp.rewardTitle}`,
							inline: true
						},
						{
							name: 'Skulls',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setURL(`https://twitch.tv/${userInfo.name}`)
					.setFooter({ text: 'Click the event name to go to the Redeemers Twitch Channel', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [merchEmbed] });
				break;
			case 'Hydrate!':
				console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
				chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName}'s, you must stay hydrated, take a sip of whatever your drinking.`);

				const hydrateEmbed = new MessageEmbed()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
					.setColor(limeGreen)
					// .setDescription(`${userInfo.displayName} has redeemed ${cp.rewardTitle} for ${cp.rewardCost} Skulls`)
					.addFields([
						{
							name: 'User',
							value: `${cp.userDisplayName}`,
							inline: true
						},
						{
							name: 'Redeemed',
							value: `${cp.rewardTitle}`,
							inline: true
						},
						{
							name: 'Skulls',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [hydrateEmbed] });
				break;
			case 'Unload':
				console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
				chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName} Empty that Clip`);

				const unloadEmbed = new MessageEmbed()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
					.setColor(limeGreen)
					.addFields([
						{
							name: 'User',
							value: `${cp.userDisplayName}`,
							inline: true
						},
						{
							name: 'Redeemed',
							value: `${cp.rewardTitle}`,
							inline: true
						},
						{
							name: 'Skulls',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [unloadEmbed] });
				break;
			case 'DropController':
				// console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
				chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName} Put down that controller for 30 seconds`);

				const dropcontrollerEmbed = new MessageEmbed()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
					.setColor(limeGreen)
					.addFields([
						{
							name: 'User',
							value: `${cp.userDisplayName}`,
							inline: true
						},
						{
							name: 'Redeemed',
							value: `${cp.rewardTitle}`,
							inline: true
						},
						{
							name: 'Skulls',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [dropcontrollerEmbed] });
				break;
			case 'SwatRun':
				// console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
				chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName} Get to running Boi, we got buildings to charge`);

				const swatrunEmbed = new MessageEmbed()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
					.setColor(limeGreen)
					.addFields([
						{
							name: 'User',
							value: `${cp.userDisplayName}`,
							inline: true
						},
						{
							name: 'Redeemed',
							value: `${cp.rewardTitle}`,
							inline: true
						},
						{
							name: 'Skulls',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [swatrunEmbed] });
				break;
			case 'MUTEHeadset':
				console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
				chatClient.say(broadcasterID.name, `${cp.broadcasterDisplayName} you should not be listening to game sounds right now`);

				const muteheadsetEmbed = new MessageEmbed()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
					.setColor(limeGreen)
					.addFields([
						{
							name: 'User',
							value: `${cp.userDisplayName}`,
							inline: true
						},
						{
							name: 'Redeemed',
							value: `${cp.rewardTitle}`,
							inline: true
						},
						{
							name: 'Skulls',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [muteheadsetEmbed] });
				break;
			case 'Crafting Reminder':
				chatClient.say(broadcasterID.name, `${cp.broadcasterDisplayName} is reminding you to craft a PPSH, PAY ATTENTION`);

				const craftingReminderEmbed = new MessageEmbed()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
					.setColor(limeGreen)
					.addFields([
						{
							name: 'User',
							value: `${cp.userDisplayName}`,
							inline: true
						},
						{
							name: 'Redeemed',
							value: `${cp.rewardTitle}`,
							inline: true
						},
						{
							name: 'Skulls',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [craftingReminderEmbed] });
				break;
			case 'IRLWordBan':
				console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
				chatClient.say(broadcasterID.name, `@${cp.userDisplayName} has redeemed ${cp.rewardTitle} and has ban the word ${cp.input.toUpperCase()}`);

				const irlwordbanEmbed = new MessageEmbed()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
					.setColor(limeGreen)
					.addFields([
						{
							name: 'User',
							value: `${cp.userDisplayName}`,
							inline: true
						},
						{
							name: 'Redeemed',
							value: `${cp.rewardTitle}`,
							inline: true
						},
						{
							name: 'Skulls',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [irlwordbanEmbed] });
				break;
			case 'IRLVoiceBan':
				console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
				chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName} SHHHHHH why are you still talking right now`);

				const irlvoicebanEmbed = new MessageEmbed()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
					.setColor(limeGreen)
					.addFields([
						{
							name: 'User',
							value: `${cp.userDisplayName}`,
							inline: true
						},
						{
							name: 'Redeemed',
							value: `${cp.rewardTitle}`,
							inline: true
						},
						{
							name: 'Skulls',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [irlvoicebanEmbed] });
				break;
			case 'Ban in-game action':
				// console.log(`${cp.rewardTitle} has been redeemed by ${cp.userDisplayName}`);
				chatClient.say(broadcasterID.name, `${cp.userDisplayName} has redeemed Ban an In-Game Action`);

				const baningameactionEmbed = new MessageEmbed()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
					.setColor(limeGreen)
					.addFields([
						{
							name: 'User',
							value: `${cp.userDisplayName}`,
							inline: true
						},
						{
							name: 'Redeemed',
							value: `${cp.rewardTitle}`,
							inline: true
						},
						{
							name: 'Skulls',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [baningameactionEmbed] });
				break;
			default:
				console.log(`${cp.userName} has attempted to redeem ${cp.rewardTitle} thats not hardcoded in yet`);
				chatClient.say(broadcasterID.name, `@${cp.userName} has activated a channel points item and it hasnt been coded in yet`);
				break;
			}
		});
		const title = await eventSubListener.subscribeToChannelUpdateEvents(userId, async update => {
			console.log(broadcasterID.name, `updated title to ${update.streamTitle}, categoryName: ${update.categoryName}`);
		});
		const hypeEventStart = await eventSubListener.subscribeToChannelHypeTrainBeginEvents(userId, async hts => {
			if (userId !== '31124455') return;
			console.log(`Listening but no messages setup, ${hts.goal} to reach the next level of the Hype Train`);
			chatClient.say(broadcasterID.name, `${hts.goal} to reach the next level of the Hype Train, Last Contributer: ${hts.lastContribution}`);
		});
		const hypeEventEnd = await eventSubListener.subscribeToChannelHypeTrainEndEvents(userId, async hte => { // needs to be tested, progress and start to be done after end has been tested and it works!
			if (userId !== '31124455') return;
			const streamer = await hte.getBroadcaster();
			console.log(`HypeTrain End Event Ending, Total Contrubtion:${hte.total}, Total Level:${hte.level}`);
			chatClient.say(broadcasterID.name, `${hte.topContributors} have contributed to the HypeTrain`);

			const hypeeventendEmbed = new MessageEmbed()
				.setTitle('REDEEM EVENT')
				.setAuthor({ name: `${streamer.displayName}`, iconURL: `${streamer.profilePictureUrl}` })
				.setColor(limeGreen)
				.addFields([
					{
						name: 'Broadcaster Name',
						value: `${streamer.displayName},\n Start Date: ${hte.startDate}`,
						inline: true
					},
					{
						name: 'Hype Event Level',
						value: `${hte.level}`,
						inline: true
					},
					{
						name: 'Hype Train Event Top Contributers',
						value: `${[hte.topContributors]},\nTotal Contributers: ${hte.total}`,
						inline: true
					}
				])
				.setThumbnail(`${streamer.profilePictureUrl}`)
				.setFooter({ text: 'SkulledArmy', iconURL: `${streamer.profilePictureUrl}` })
				.setTimestamp(`${hte.endDate}`);
			twitchActivity.send({ embeds: [hypeeventendEmbed] });
		});
		const hypeTrainProgress = await eventSubListener.subscribeToChannelHypeTrainProgressEvents(userId, htp => {
			console.log('Hytrain Progress Testing');
			chatClient.say(broadcasterID.name, `HypeTrain Level:${htp.level}, Latest Contributer:${htp.lastContribution}, HypeTrain Progress:${htp.progress}`);
		});
		const giftedSubs = await eventSubListener.subscribeToChannelSubscriptionGiftEvents(userId, async gift => {
			console.log(broadcasterID.name, `${gift.gifterDisplayName} has just gifted ${gift.amount} ${gift.tier} subs to ${gift.broadcasterName}, they have given a total of ${gift.cumulativeAmount} Subs to the channel`);
			if (userId === '31124455') {
				chatClient.say(broadcasterID.name, `${gift.gifterDisplayName} has just gifted ${gift.amount} ${gift.tier} subs to ${gift.broadcasterName}, they have given a total of ${gift.cumulativeAmount} Subs to the channel`);

				const userInfo = await gift.getGifter();
				const giftedSubs = new MessageEmbed()
					.setTitle('GIFTED SUB EVENT')
					.setDescription(`gifted to ${gift.broadcasterDisplayName}`)
					.setAuthor({ name: `${gift.gifterDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
					.addFields([
						{
							name: 'Username: ',
							value: `${gift.gifterDisplayName}`,
							inline: true
						},
						{
							name: 'Amount: ',
							value: `Gifted ${gift.amount}`,
							inline: true
						},
						{
							name: 'Gifted Tier: ',
							value: `${parseFloat(gift.tier)}`,
							inline: true
						},
					])
					.setThumbnail(`${userInfo.profilePictureUrl}`)
					.setColor(limeGreen)
					.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [giftedSubs] });
			} else if (userId === '204831754') {
				console.log(broadcasterID.name, `${gift.gifterDisplayName} has just gifted ${gift.amount} ${gift.tier} subs to ${gift.broadcasterName}, they have given a total of ${gift.cumulativeAmount} Subs to the channel`);
			}
		});
		const resub = await eventSubListener.subscribeToChannelSubscriptionMessageEvents(userId, async s => {
			chatClient.say(broadcasterID.name, `${s.userDisplayName} has resubbed to the channel for ${s.cumulativeMonths}, currently on a ${s.streakMonths} streak, ${s.messageText}`);
			const userInfo = await s.getUser();
			const resubEmbed = new MessageEmbed()
				.setTitle('RESUB EVENT')
				.setAuthor({ name: `${sub.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
				.addFields([
					{
						name: 'Twitch User: ',
						value: `${userInfo.displayName} just re-subscribed`,
						inline: true
					},
					{
						name: 'Resub: ',
						value: `${s.cumulativeMonths} in a row`,
						inline: true
					},
					{
						name: 'Message: ',
						value: `${s.messageText}`,
						inline: true
					},
				])
				.setThumbnail(`${userInfo.profilePictureUrl}`)
				.color(limeGreen)
				.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
				.setTimestamp();
			twitchActivity.send({ embeds: [resubEmbed] });
		});
		const follow = await eventSubListener.subscribeToChannelFollowEvents(userId, async e => {
			if (broadcasterID === '204831754') {// modvlog
				console.log(broadcasterID.name `${e.userName} has followed the channel, ${e.followDate}`);
			} else if (userId === '31124455') {
				const randomFollowMessage = [
					`@${e.userDisplayName} has followed the channel`,
					`@${e.userDisplayName} has joined the army and entered there barracks`,
					`Brace yourself, @${e.userDisplayName} has followed`,
					`HEY! LISTEN! @${e.userDisplayName} has followed`,
					`We've been expecting you @${e.userDisplayName}`,
					`@${e.userDisplayName} just followed, Quick everyone look busy`,
					`Challenger Approaching - @${e.userDisplayName} has followed`,
					`Welcome @${e.userDisplayName}, stay awhile and listen`,
					`@${e.userDisplayName} has followed, it's Super Effective`
				];
				let randomString = randomFollowMessage[Math.floor(Math.random() * randomFollowMessage.length)];
				// console.log(`${e.userName} has followed the channel, ${e.followDate}`);
				const userInfo = await e.getUser();
				if (userInfo.description === '') { 
					chatClient.say(broadcasterID.name, `${randomString}`);
				} else {
					chatClient.say(broadcasterID.name, `${randomString}`);
					console.log(`Users Channel Description: ${userInfo.description}`);
				}

				const followEmbed = new MessageEmbed()
					.setTitle('FOLLOW EVENT')
					.setAuthor({ name: `${e.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
					.setColor(limeGreen)
					.addFields([
						{
							name: 'Account Acreated: ',
							value: `${userInfo.creationDate}`,
							inline: true
						},
						{
							name: 'Twitch Channel Link: ',
							value: `https://twitch.tv/${e.userName}`,
							inline: true
						},
						{
							name: 'Follow Date: ',
							value: `${e.followDate}`,
							inline: true
						},
					])
					.setThumbnail(`${userInfo.profilePictureUrl}`)
					.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [followEmbed] });
			}
		});
		const sub = await eventSubListener.subscribeToChannelSubscriptionEvents(userId, async sub => {
			chatClient.say(broadcasterID.name, `${sub.userName} has Subscribed to the channel with a tier ${sub.tier} Subscription`);
			const userInfo = await sub.getUser();
			const subEmbed = new MessageEmbed()
				.setTitle('SUBSCRIBER EVENT')
				.setAuthor({ name: `${sub.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
				.addFields([
					{
						name: 'Username: ',
						value: `${userInfo.displayName}`,
						inline: true
					},
					{
						name: 'Sub Tier: ',
						value: `tier ${sub.tier} Subscription`,
						inline: true
					},
					{
						name: 'Sub Gifted: ',
						value: `${sub.isGift}`,
						inline: true
					},
				])
				.setThumbnail(`${userInfo.profilePictureUrl}`)
				.setColor(limeGreen)
				.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
				.setTimestamp();
			twitchActivity.send({ embeds: [subEmbed] });
		});
		const cheer = await eventSubListener.subscribeToChannelCheerEvents(userId, async cheer => {
			chatClient.say(broadcasterID.name, `${cheer.userDisplayName} has cheered ${cheer.bits} bits`);
			const userInfo = await cheer.getUser();
			if (cheer.bits >= 100) {
				const cheerEmbed = new MessageEmbed()
					.setTitle('CHEER EVENT')
					.setAuthor({ name: `${sub.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
					.addFields([
						{
							name: 'Username: ',
							value: `${userInfo.displayName}`,
							inline: true
						},
						{
							name: 'Bits Amount: ',
							value: `${cheer.bits}`,
							inline: true
						},
						{
							name: 'Message: ',
							value: `${cheer.message}`,
							inline: true
						},
					])
					.setThumbnail(`${userInfo.profilePictureUrl}`)
					.setColor(limeGreen)
					.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [cheerEmbed] });
			}
		});
		const raid = await eventSubListener.subscribeToChannelRaidEventsFrom(userId, async raid => {
		// console.log(`${raid.raidingBroadcasterDisplayName} has raided the channel with ${raid.viewers} viewers!`);
			chatClient.say(broadcasterID.name, `${raid.raidingBroadcasterDisplayName} has raided the channel with ${raid.viewers} viewers!`);
			const userInfo = await raid.getRaidingBroadcaster();
			const raidEmbed = new MessageEmbed()
				.setTitle('CHANNEL RAID EVENT')
				.setAuthor({ name: `${raid.raidingBroadcasterDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
				.addFields([
					{
						name: 'Raider: ',
						value: `${raid.raidedBroadcasterName}`,
						inline: true
					},
					{
						name: 'Viewer Count: ',
						value: `${raid.viewers} Viewers`,
						inline: true
					}
				])
				.setThumbnail(`${userInfo.profilePictureUrl}`)
				.setColor(limeGreen)
				.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
				.setTimestamp();
			twitchActivity.send({ embeds: [raidEmbed] });
		});
	}

	async function createSkullPoints(msg) {
		// see if there following the channel
		// if they are add X amount of points onto there account
		// if not dont do anything
		// if points are added send a message saying X amount of points have been added
		const users = await userApiClient.users.getFollowFromUserToBroadcaster(msg.userInfo.userName, broadcasterID);
		if (users) {
			console.log('Giving skulls');
		} else {
			console.log('Im broken or they dont follow');
		}
	}

	chatClient.onMessage(async (channel, user, message, msg) => {
		console.log(`${msg.userInfo.displayName} Said: ${message} in ${channel}`);
		const display = msg.userInfo.displayName;
		const staff = msg.userInfo.isMod || msg.userInfo.isBroadcaster;

		if (message.startsWith('!') && channel === '#skullgaming31') return chatClient.say(channel, `${display}, - should be used for this channels commands`);

		if (message.startsWith('-')) {
		
			const args = message.slice(1).split(' ');
			const command = args.shift().toLowerCase();
			const leadMod = msg.userInfo.userName === 'modvlog';
		
			if (command === 'ping' && channel === '#skullgaming31') {
				if (msg.userInfo.userName === 'skullgaming31') {
					try {
						chatClient.say(channel, `${user}, Im Here and working.`);
					} catch (error) {
						console.error(error);
					}
				}
			}
			if (command === 'quote' && channel === '#skullgaming31') {
				const quotes = [
					'Behind every cloud is a ray of sunshine waiting to be revealed. Shine your light on those that need guidance in there time of darkness',
					'I wont get upset at you about a mistake, i\'ll get upset at you for the next mistake that comes from still thinking about the last mistake',
					'The only way to lose is to quit',
					'Part of being a winner is acting like a winner, you have to learn how to win and not run away when you lose.'
				];
				let randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
				chatClient.say(channel, `${randomQuote}`);
			}
			if (command === 'settitle' && channel === '#skullgaming31') {
				if (staff) {
					const title = args.join(' ');
					const setTitle = await userApiClient.channels.updateChannelInfo(broadcasterID, { 'title': `${args.join(' ')}` }); // Channel ID:'31124455'
					chatClient.say(channel, `channel title has been updated to ${setTitle}`);
				} else {
					chatClient.say(channel, `${display}, you are not a moderator or the broadcaster you do not have access to these commands, please run /help to find out what commands you can use.`);
				}
			}
			if (command === 'setgame' && channel === '#skullgaming31') {
				if (staff) {
					const gamename = await userApiClient.games.getGameByName(args.join(' '));
					const setGame = await userApiClient.channels.updateChannelInfo(broadcasterID, { gameId:  `${gamename.id}` });
					chatClient.say(channel, `channel game has been updated to ${gamename.name}`);
					console.log(`${gamename.name}: ${gamename.id}`);
				} else {
					chatClient.say(channel, `${display}, you are not a moderator or the broadcaster you do not have access to these commands, please run /help to find out what commands you can use.`);
				}
			}
			if (command === 'game' && channel === '#skullgaming31' || channel === '#modvlog') {
				if (broadcasterID === '') {
					const currentGame = await apiClient.channels.getChannelInfo(broadcasterID);
					chatClient.say(channel, `${display}, ${currentGame.displayName} is currently playing ${currentGame.gameName}`);
				}
			}
			if (command === 'lurk' && channel === '#skullgaming31') {
				const lurk = args.slice(0).join(' ');
				if (lurk) {
					chatClient.say(channel, `${lurk}`);
				} else {
					chatClient.say(channel, 'have some stuff to do but have a tab open for you, have a great stream!');
				}
			}
			if (command === 'id' && channel === '#skullgaming31') { // Mod Twitch ID- 204831754
				chatClient.say(channel, `${display} your TwitchId is ${msg.userInfo.userId}`);
			}
			if (command === 'followage' && channel === '#skullgaming31') {// TODO: cant tag someone to found out when they created there account.
				const follow = await apiClient.users.getFollowFromUserToBroadcaster(msg.userInfo.userId, msg.channelId);
				if (follow) {
					const followStartTimestamp = follow.followDate.getTime();
					chatClient.say(channel, `@${display} You have been following for ${countdown(new Date(followStartTimestamp))}!`);
				}
				else {
					chatClient.say(channel, `@${display} You are not following!`);
				}
			}
			if (command === 'accountage' && channel === '#skullgaming31') {// TODO: cant tag someone to found out when they created there account.
				const account = await apiClient.users.getUserByName(args[0] || msg.userInfo.userName);
				if (account) {
					chatClient.say(channel, `${account.creationDate}`);
				} else { 
					chatClient.say(channel, `${user}, that name could not be found`);
				}
			}
			if (command === 'uptime') {
				const stream = await apiClient.streams.getStreamByUserId(broadcasterID);
				const modvlogStream = await modvlogApiClient.streams.getStreamByUserId(broadcaster);
				if (channel === '#skullgaming31') {
					if (stream) {
						const uptime = countdown(new Date(stream.startDate));
						chatClient.say(channel, `${display}, the stream has been live for ${uptime}`);
					}
					else {
						return chatClient.say(channel, 'the Stream is currently Offline');
					}
				} else if (channel === '#modvlog') {
					if (modvlogStream) {
						const modvlogUptime = countdown(new Date(modvlogStream.startDate));
						chatClient.say(channel, `${display}, the stream has been live for ${modvlogUptime}`);
					}
				}
			}
			if (command === 'dadjoke' && channel === '#skullgaming31') {
				const response = await axios.get('https://icanhazdadjoke.com/', {
					headers: {
						'Accept': 'application/json',
						'User-Agent': 'Personal Twitch ChatBot (https://github.com/skullgaming31/skulledbotTwitch)'
					}
				});
				chatClient.say(channel, `${response.data.joke}`);
			}
			if (command === 'games' && channel === '#skullgaming31') {
				switch (args[0]) {
				case 'dice':
					const result = Math.floor(Math.random() * 12) + 1;
					chatClient.say(channel, `@${display}, you rolled a ${result}.`);
					break;
				case 'dig':// have a % chance to dig up the correct Hole and win curreny prize Failed means you lose currency. -dig [amount] isFollower * 1.5 isSubscriber * 2
					const choice = ['Succedded', 'Failed'];
					const results = choice[Math.floor(Math.random() * choice.length)];
					chatClient.say(channel, `@${display} you have ${results}`);
					break;
				case 'duel': // duel someone else for points winner takes all
					if (!args[1]) return chatClient.say(channel, 'you must tag someone to duel');
					if (!args[2]) return chatClient.say(channel, 'you must specify an amount to bet');
					break;
				default:
					chatClient.say(channel, 'you must specify which mod action you want to do, Usage: -games dice|dig|duel');
					break;
				}
			}
			if (command === 'warframe' && channel === '#skullgaming31') {
				switch (args[0]) {
				case 'about':
					chatClient.say(channel, 'Warframe is a free-to-play action role-playing third-person shooter multiplayer online game developed and published by Digital Extremes.');
					break;
				case 'lore':
					const warframe = 'https://warframe.com/landing';
					chatClient.say(channel, `In Warframe, players control members of the Tenno, a race of ancient warriors who have awoken from centuries of suspended animation far into Earth's future to find themselves at war in the planetary system with different factions. The Tenno use their powered Warframes along with a variety of weapons and abilities to complete missions. ${warframe}`);
					console.log('command being sent', warframe);
					break;
				case 'mr':
					const xblWFRank = 6;
					const ps4WFRank = 13;
					chatClient.say(channel, `Mastery Rank: XBOX: ${xblWFRank}, PS4: ${ps4WFRank}`);
					break;
				default:
					chatClient.say(channel, `${display}, Usage: -warframe [about, lore, rank]`);
					break;
				}
			}
			if (command === 'vigor' && channel === '#skullgaming31') {
				switch (args[0]) {
				case 'about':
					const vigor = 'https://vigorgame.com/about';
					chatClient.say(channel, `Outlive the apocalypse. Vigor is a free-to-play looter shooter set in post-war Norway. LOOT, SHOOT BUILD Shoot and loot in tense encounters Build your shelter and vital equipment Challenge others in various game modes Play on your own or fight together with 2 of your other friends, check out vigor here: ${vigor}`);
					break;
				case 'lore':
					chatClient.say(channel, 'not added yet');
					break;
				default:
					chatClient.say(channel, `${display}, Usage: -vigor [about, lore]`);
					break;
				}
			}
			if (command === 'commands') {
				if (channel === '#skullgaming31') {// add commands to an array to display all commands in the help command!
					if (staff) {
						const modCommands = ['ping', 'settitle', 'setgame', 'mod', 'game', 'lurk', 'id', 'followage', 'accountage', 'uptime', 'dadjoke', 'games', 'warframe', 'vigor', 'me', 'socials'];
						chatClient.say(channel, `${display}, Commands for this channel are ${modCommands.join(', ')}`);
					}
					else {
						const commands = ['game', 'lurk', 'id', 'followage', 'accountage', 'uptime', 'dadjoke', 'games', 'warframe', 'vigor', 'me', 'socials'];
						chatClient.say(channel, `${display}, Commands for this channel are ${commands.join(', ')}`);
					}
				}
				else {
					// chatClient.say(channel, 'There are no registered Commands for this channel');
					return;
				}
			}
			if (command === 'me' && channel === '#skullgaming31') { // not working, WHY: unsure
				let target = args[0];
				let action = ['slaps', 'kisses', 'hugs', 'punches', 'suckerPunches', 'kicks', 'pinches', 'uppercuts'];
				let randomNumber = action[Math.floor(Math.random() * action.length)];

				if (!args[0]) return chatClient.say(channel, `${display}, you must tag someone to use this command`);
				chatClient.say(channel, `${display}, ${randomNumber} ${target}`);
			}
			if (command === 'so' && channel === '#skullgaming31') {
				if (staff) {
					chatClient.say(channel, 'please run the -mod command');
				}
				else { return; }
			}
			if (command === 'mod' && channel === '#skullgaming31') {
				if (staff) {
					switch (args[0]) {
					case 'vip':
						if (await chatClient.getMods(channel) === args[1]) return console.log(channel, 'that person is a higer rank then VIP and can not be assigned this role');
						if (await chatClient.getVips(channel) === args[1]) return chatClient.say(channel, 'this user is already a vip or higher');
						if (!args[1]) return chatClient.say(channel, `${display}, Usage: -mod vip @name`);
						try {
							await chatClient.addVip(channel, args[1].replace('@', '')).catch(err => { console.error(err); }); {
								chatClient.say(channel, `@${args[1].replace('@', '')} has been upgraded to VIP`);
							}
							const vipEmbed = new MessageEmbed()
								.setTitle('Twitch Channel VIP Event')
								.setAuthor({ name: `${args[1].replace('@', '')}` })
								.setColor('RED')
								.addFields([
									{
										name: 'User: ',
										value: `${args[1].replace('@', '')}`,
										inline: true
									}
								])
								.setFooter({ text: `Someone just got upgraded to VIP in ${channel.replace('#', '')}'s channel` })
								.setTimestamp();
								
							twitchActivity.send({ embeds: [vipEmbed] });
						} catch (error) { console.error(error); }
						break;
					case 'unvip':
						if (!args[1]) return chatClient.say(channel, `${display}, Usage: -mod unvip @name`);
						try {
							await chatClient.removeVip(channel, args[1].replace('@', '')).catch(err => { console.error(err); }); {
								chatClient.say(channel, `@${args[1].replace('@', '')} has been removed from VIP status`);
							}
							const vipEmbed = new MessageEmbed()
								.setTitle('Twitch Channel VIP REMOVE Event')
								.setAuthor({ name: `${args[1].replace('@', '')}` })
								.setColor('RED')
								.addFields([
									{
										name: 'User: ',
										value: `${args[1].replace('@', '')}`,
										inline: true
									}
								])
								.setFooter({ text: `Someone just got demoted in ${channel.replace('#', '')}'s channel` })
								.setTimestamp();
								
							twitchActivity.send({ embeds: [vipEmbed] });
						} catch (error) { console.error(error); }
						break;
					case 'mod':
						if (!args[1]) return chatClient.say(channel, `${display}, Usage: -mod mod @name`);
						try {
							chatClient.mod(channel, args[1].replace('@', '')).catch(err => { console.error(err); }); {
								chatClient.say(channel, `@${args[1].replace('@', '')} has been givin the Moderator Powers`);
							}
							const moderatorEmbed = new MessageEmbed()
								.setTitle('Twitch Channel MOD Event')
								.setAuthor({ name: `${args[1].replace('@', '')}` })
								.setColor('RED')
								.addFields([
									{
										name: 'User: ',
										value: `${args[1].replace('@', '')}`,
										inline: true
									},
									{
										name: 'Channel: ',
										value: `${channel.replace('#', '')}'s channel`,
										inline: true
									}
								])
								.setFooter({ text: `Someone just got upgraded to Moderator in ${channel.replace('#', '')}'s channel` })
								.setTimestamp();
								
							twitchActivity.send({ embeds: [moderatorEmbed] });
						} catch (error) { console.error(error); }
						break;
					case 'unmod':
						if (!args[1]) return chatClient.say(channel, `${display}, Usage: -mod unmod @name`);
						try {
							chatClient.unmod(channel, args[1].replace('@', '')).catch((err) => { console.log(err); }); {
								chatClient.say(channel, `${args[1]} has had there moderator powers removed`);
							}
							const unModeratorEmbed = new MessageEmbed()
								.setTitle('Twitch Channel UNMOD Event')
								.setAuthor({ name: `${args[1].replace('@', '')}` })
								.setColor('RED')
								.addFields([
									{
										name: 'User: ',
										value: `${args[1].replace('@', '')}`,
										inline: true
									},
									{
										name: 'Channel: ',
										value: `${channel.replace('#', '')}'s channel`,
										inline: true
									}
								])
								.setFooter({ text: `Someone just got demoted from moderator in ${channel}'s channel` })
								.setTimestamp();
								
							twitchActivity.send({ embeds: [unModeratorEmbed] });
						} catch (error) {
							console.error(error);
						}
						break;
					case 'purge':
						if (!args[1]) return chatClient.say(channel, `${display}, Usage: -mod purge @name (duration) (reason)`);
						if (!args[2]) args[2] = 60;
						if (!args[3]) args[3] = 'No Reason Provided';
						try {
							chatClient.timeout(channel, args[1], args[2], args[3]).catch((err) => { console.log(err); }); {
								chatClient.say(channel, `@${args[1].replace('@', '')} has been purged for ${args[2]} Reason: ${args[3]}`);
							}
						} catch (error) {
							console.error(error);
						}
						break;
					case 'ban':
						try {
							if (!args[1]) return chatClient.say(channel, `${display}, Usage: -mod ban @name (reason)`);
							if (!args[2]) args[2] = 'No Reason Provided';
							try {
								await chatClient.ban(channel, args[1].replace('@', ''), args[2]).catch((err) => { console.error(err); }); {
									chatClient.say(channel, `@${args[1].replace('@', '')} has been banned for Reason: ${args[2]}`);
								}
								const banEmbed = new MessageEmbed()
									.setTitle('Twitch Channel Ban Event')
									.setAuthor({ name: `${args[1].replace('@', '')}` })
									.setColor('RED')
									.addFields([
										{
											name: 'User: ',
											value: `${args[1]}`,
											inline: true
										},
										{
											name: 'Reason',
											value: `${args[2]}`,
											inline: true
										}
									])
									.setFooter({ text: `Someone just got BANNED from ${channel}'s channel` })
									.setTimestamp();
								
								twitchActivity.send({ embeds: [banEmbed] });
							} catch (err) {
								console.error(err);
							}
						} catch (error) { console.error(error); }
						break;
					case 'shoutout':
					case 'so':
						if (!args[1]) return chatClient.say(channel, 'you must specify a person to shotout, Usage: -mod shoutout|so @name');
						const user = await apiClient.users.getUserByName(args[1].replace('@', ''));
						const gameLastPlayed = await apiClient.channels.getChannelInfo(user.id);
						chatClient.say(channel, `go check out @${args[1].replace('@', '')}, there an awesome streamer Check them out here: https://twitch.tv/${args[1].replace('@', '').toLowerCase()} last seen playing ${gameLastPlayed.gameName}`);
						break;
					default:
						chatClient.say(channel, 'you must specify which mod action you want to do, Usage: -mod vip|unvip|purge|shoutout|ban|unban');
						break;
					}
				} else {
					chatClient.say(channel, `${display} you must be a mod or the broadcastor to use this command`);
				}
			}
			if (command === 'socials' && channel === '#skullgaming31') {
				switch (args[0]) {
				case 'instagram':
					chatClient.say(channel, `${display}, SkullGaming31's Instagram: https://instagram.com/skullgaming31`);
					break;
				case 'snapchat':
					chatClient.say(channel, `${display}, SkullGaming31's Snapchat: https://snapchat.com/add/skullgaming31`);
					break;
				case 'facebook':
					chatClient.say(channel, `${display}, SkullGaming31's Facebook: SkullGaming31 Entertainment`);
					break;
				case 'tictok':
					chatClient.say(channel, `${display}, SkullGaming31's Tik-Tok: https://tiktok.com/@skullgaming31`);
					break;
				case 'discord':
					chatClient.say(channel, `${display}, SkullGaming31's Discord: https://discord.gg/7AHcU4pQFF`);
					break;
				case 'youtube':
					chatClient.say(channel, `${display}, SkullGaming31's Gaming YouTube Channel: https://www.youtube.com/channel/UCaJPv2Hx2-HNwUOCkBFgngA mostly just holds twitch archives`);
					break;
				case 'twitter':
					chatClient.say(channel, `${display}, SkullGaming31's Twitter: https://twitter.com/skullgaming31`);
					break;
				case 'merch':
					const merch = 'https://skullgaming31-merch.creator-spring.com/';
					chatClient.say(channel, `${display}, The new merch is here, Would Appreciate it if you checked it out ${merch}`);
					break;
				case 'tip':
					const tipping = 'https://overlay.expert/celebrate/SkullGaming31';
					chatClient.say(channel, `@${display}, you can help out the stream by tipping here: ${tipping}, NOTE: tips are NOT expected BUT very much appreacated, all tips go back into the stream wither it be upgrades for the stream or new games for you to watch.`);
					break;
				default:
					chatClient.say(channel, 'Which social are you looking for?, Usage: -socials twitter|instagram|snapchat|facebook|tictok|discord|merch|tip');
					break;
				}
			}
		} else {
			if (message.includes('overlay expert') && channel === '#skullgaming31') {
				chatClient.say(channel, `${display}, Create overlays and alerts for your @Twitch streams without OBS or any streaming software. For support, see https://github.com/overlay-expert/help-desk/issues/1`);
			}
			if (message.includes('overlay designer') && channel === '#skullgaming31') {
				chatClient.say(channel, `${display}, are you an overlay designer and want to make money from them check out https://overlay.expert/designers, all information should be listed on that page for you to get started.`);
			}
		}
	});
}
main();