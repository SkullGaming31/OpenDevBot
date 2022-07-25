const countdown = require('countdown');
const fs = require('fs/promises');
const axios = require('axios').default;
const { RefreshingAuthProvider, ClientCredentialsAuthProvider } = require('@twurple/auth');
const { ApiClient } = require('@twurple/api');
const { ChatClient } = require('@twurple/chat');
const { EventSubListener, EnvPortAdapter } = require('@twurple/eventsub');
const { NgrokAdapter } = require('@twurple/eventsub-ngrok');
const { WebhookClient, MessageEmbed } = require('discord.js');

const userModel = require('./database/models/user');

const { rwClient } = require('./tweet');
const config = require('../config');

// WIP Stuff Starts

// const botModel = require('../src/database/models/bot');
const client = require('./discord/index');
// const eventSubListener = require('./eventSub');
// const { apiClient, modvlogApiClient, userApiClient } = require('./lib/twitch-api');
// const { authProvider, modvlogAuthProvider, userAuthProvider } = require('./auth/authProvider');

// WIP Stuff Ends


async function main() {

	const clientId = config.TWITCH_CLIENT_ID;
	const clientSecret = config.TWITCH_CLIENT_SECRET;
	const eventSubSecret = config.TWITCH_EVENTSUB_SECRET;

	// START AuthProviders
	const botTokenData = JSON.parse(await fs.readFile('./src/auth/tokens/bot.json', 'UTF-8'));
	const authProvider = new RefreshingAuthProvider({
		clientId,
		clientSecret,
		onRefresh: async (newTokenData) => await fs.writeFile('./src/auth/tokens/bot.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')
	}, botTokenData);

	const userTokenData = JSON.parse(await fs.readFile('./src/auth/tokens/user.json', 'UTF-8'));
	const userAuthProvider = new RefreshingAuthProvider({
		clientId,
		clientSecret,
		onRefresh: async (newTokenData) => await fs.writeFile('./src/auth/tokens/user.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')
	}, userTokenData);

	const modvlogTokenData = JSON.parse(await fs.readFile('./src/auth/tokens/modvlog.json', 'UTF-8'));
	const modvlogAuthProvider = new RefreshingAuthProvider({
		clientId,
		clientSecret,
		onRefresh: async (newTokenData) => await fs.writeFile('./src/auth/tokens/modvlog.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')
	}, modvlogTokenData);

	//End Auth Provider Section
	const chatClient = new ChatClient({ authProvider, channels: ['skullgaming31', 'modvlog'], logger: { minLevel: 'error' } });
	await chatClient.connect().then(() => console.log('connected to Twitch Chat')).catch((err) => { console.error(err); });
	const appAuthProvider = new ClientCredentialsAuthProvider(clientId, clientSecret);
	const apiClient = new ApiClient({ authProvider: appAuthProvider, logger: { minLevel: 'critical' } });
	const userApiClient = new ApiClient({ authProvider: userAuthProvider, logger: { minLevel: 'error' } });
	const modvlogApiClient = new ApiClient({ authProvider: modvlogAuthProvider, logger: { minLevel: 'error' } });


	if (process.env.NODE_ENV === 'development') {
		await apiClient.eventSub.deleteAllSubscriptions();
	}

	async function createChannelPointsRewards() { // creating the channel points rewards
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
		} catch (error) { console.error(error); }
	}

	// eventSub Stuff
	const userId = '31124455';// my id
	const userID = '204831754';// mods id
	const broadcasterID = await apiClient.channels.getChannelInfoById(userId);// apiClient.channels.getChannelInfoById(userID);
	const broadcaster = await modvlogApiClient.channels.getChannelInfoById(userID);
	const twitchActivity = new WebhookClient({
		id: config.DISCORD_WEBHOOK_ID,
		token: config.DISCORD_WEBHOOK_TOKEN,
	});
	const modVlogCommandUsage = new WebhookClient({ url: config.MOD_DISCORD_COMMAND_USAGE_URL });
	const twitchModlogs = new WebhookClient({ url: config.DISCORD_COMMAND_USAGE_URL });

	// await createChannelPointsRewards();

	if (process.env.NODE_ENV === 'production') {
		// const eventSubListener = new ReverseProxyAdapter({
		// 	port: process.env.PORT,
		// 	hostName: 'skulledbottwitch.up.railway.app/',
		// });
		const eventSubListener = new EventSubListener({
			apiClient,
			adapter: new EnvPortAdapter({ hostName: 'skulledbottwitch.up.railway.app/', variableName: '$PORT' }),
			secret: config.TWITCH_EVENTSUB_SECRET
		});

		eventSubListener.listen(process.env.$PORT || config.PORT).then(() => { console.log('Connected to Twitch EventSub'); }).catch((err) => console.error(err));
	}

	if (process.env.NODE_ENV === 'development') {
		const eventSubListener = new EventSubListener({
			apiClient,
			adapter: new NgrokAdapter(),
			secret: eventSubSecret,
			logger: { minLevel: 'error' },
			strictHostCheck: true
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
		const tiktokUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID, '144837ed-514a-436c-95cf-d9491efad240', { // 144837ed-514a-436c-95cf-d9491efad240
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
		const abandonShipUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID, '8539757d-d2ed-44e6-ad9f-700e79bd1523', {
			title: 'Abandon Ship',
			cost: 750,
			autoFulfill: true,
			backgroundColor: '#d0080a',
			globalCooldown: 5,
			isEnabled: true,
			maxRedemptionsPerUserPerStream: null,
			maxRedemptionsPerStream: null,
			prompt: 'Jump off the ship',
			userInputRequired: false
		});
		const noMermaidUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID, 'e4186dae-a9a2-4415-9f44-430aead7b1f9', {
			title: 'No Mermaid',
			cost: 500,
			autoFulfill: true,
			backgroundColor: '#d0080a',
			globalCooldown: 5,
			isEnabled: true,
			maxRedemptionsPerUserPerStream: null,
			maxRedemptionsPerStream: null,
			prompt: 'i cant use a mermaid for 1 minute',
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
			isEnabled: false,
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
			isEnabled: false,
			maxRedemptionsPerUserPerStream: null,
			maxRedemptionsPerStream: null,
			prompt: 'Choose my Primary Weapon when playing Vigor, No Knifes',
			userInputRequired: true
		});
		const swatRunUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID, 'd336dafa-afe2-4c1d-a78e-ce0dba038150', {
			title: 'SwatRun',
			cost: 1000,
			autoFulfill: true,
			backgroundColor: '#d0080a',
			globalCooldown: null,
			isEnabled: true,
			maxRedemptionsPerUserPerStream: null,
			maxRedemptionsPerStream: null,
			prompt: 'i must continue to run for the full encounter and charge into buildings, this redemption is for Vigor',
			userInputRequired: false
		});


		const modvlogFollower = await eventSubListener.subscribeToChannelFollowEvents(userID, async e => {
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
			const modvlogLIVE = new WebhookClient({
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
				.setColor('GREEN')
				.setTimestamp();
			await LIVE.send({ content: '@everyone', embeds: [liveEmbed] });// modvlog going live in his discord
			modvlogLIVE.send({ content: '<@&967016374486573096>', embeds: [liveEmbed] }); // modvlog going live in my discord
			await chatClient.disableEmoteOnly(broadcaster.name).catch((err) => { console.error(err); });
		});
		const modvlogOffline = await eventSubListener.subscribeToStreamOfflineEvents(userID, async stream => {
			const userInfo = await stream.getBroadcaster();
			chatClient.say(broadcaster.name, `${stream.broadcasterDisplayName} has gone offline, thank you for stopping by!`);
			const LIVE = new WebhookClient({
				url: config.MOD_DISCORD_WEBHOOK_PROMOTE_URL
			});

			const offlineEmbed = new MessageEmbed()
				.setAuthor({ name: `${userInfo.displayName}`, iconURL: `${userInfo.profilePictureUrl}` })
				.setColor('RED')
				.setDescription(`${stream.broadcasterDisplayName} has gone offline, thank you to those that stopped by and lurked or chatted!!`)
				.setFooter({ text: 'Ended Stream at ' })
				.setTimestamp();
			await LIVE.send({ embeds: [offlineEmbed] });
			await chatClient.enableEmoteOnly(broadcaster.name).catch((err) => { console.error(err); });
		});
		const modvlogSub = await eventSubListener.subscribeToChannelSubscriptionEvents(userID, async sub => {
			console.log(`${sub.userName} has Subscribed to the channel with a tier ${sub.tier} Subscription`);
			// chatClient.say(broadcaster.name, `${sub.userName} has Subscribed to the channel with a tier ${sub.tier} Subscription`);
		});
		const modvlogResub = await eventSubListener.subscribeToChannelSubscriptionMessageEvents(userID, async s => {
			console.log(`${s.userDisplayName} has resubbed to the channel for ${s.cumulativeMonths} Months, currently on a ${s.streakMonths} streak, ${s.messageText}`);
			// chatClient.say(broadcaster.name, `${s.userDisplayName} has resubbed to the channel for ${s.cumulativeMonths}, currently on a ${s.streakMonths} streak, ${s.messageText}`);
		});
		const modvlogGiftedSubs = await eventSubListener.subscribeToChannelSubscriptionGiftEvents(userID, async gift => {
			console.log(`${gift.gifterDisplayName} has just gifted ${gift.amount} ${gift.tier} subs to ${gift.broadcasterName}, they have given a total of ${gift.cumulativeAmount} Subs to the channel`);
		});
		const modvlogCheers = await eventSubListener.subscribeToChannelCheerEvents(userID, async cheer => {
			if (cheer.bits >= 50 && !cheer.isAnonymous) {
				console.log(`${cheer.userDisplayName} has cheered ${cheer.bits} bits ${cheer.message}`);
			} else {
				console.log(`${broadcaster.name}, Anonymous has cheered ${cheer.bits} bits with a message of ${cheer.message}`);
			}
		});
		const modvlogRaided = await eventSubListener.subscribeToChannelRaidEventsFrom(userID, async raid => {
			console.log(`${raid.raidingBroadcasterDisplayName} has raided the channel with ${raid.viewers} viewers!`);
			// chatClient.say(broadcaster.name, `${raid.raidingBroadcasterDisplayName} has raided the channel with ${raid.viewers} viewers!`);
		});
		const modvlogTitle = await eventSubListener.subscribeToChannelUpdateEvents(userID, async update => {
			console.log(`${broadcaster.name} updated title to ${update.streamTitle}, categoryName: ${update.categoryName}`);
		});
		const modvlogGoalBeginning = await eventSubListener.subscribeToChannelGoalBeginEvents(userID, async gb => {
			const userInfo = await gb.getBroadcaster();
			console.log(`${userInfo.displayName}, current ${gb.type} goal: ${gb.currentAmount} - ${gb.targetAmount}`);
		});
		const modvlogGoalProgress = await eventSubListener.subscribeToChannelGoalProgressEvents(userID, async gp => {
			const userInfo = await gp.getBroadcaster();
			console.log(`${userInfo.displayName}, ${gp.currentAmount} - ${gp.targetAmount}`);
		});
		const modvlogGoalEnded = await eventSubListener.subscribeToChannelGoalEndEvents(userID, async ge => {
			const userInfo = await ge.getBroadcaster();
			console.log(`${userInfo.displayName}, ${ge.currentAmount} - ${ge.targetAmount} Goal Started:${ge.startDate} Goal Ended: ${ge.endDate}`);
		});

		const online = await eventSubListener.subscribeToStreamOnlineEvents(userId, async o => {
			const stream = await o.getStream();
			const userInfo = await o.getBroadcaster();
			chatClient.say(broadcasterID.name, `${o.broadcasterDisplayName} has just gone live playing ${broadcasterID.gameName} with ${stream.viewers} viewers.`);
			if (process.env.BOT === 'LIVE') {
				await rwClient.v2.tweet(`${userInfo.displayName} has gone live playing ${stream.gameName} here: https://twitch.tv/${userInfo.name}`);
			} else {
				return;
			}

			const LIVE = new WebhookClient({
				url: config.DISCORD_WEBHOOK_PROMOTE_URL
			});
			const modvlogLIVEDiscord = new WebhookClient({ // me going live posting in modvlogs discord
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
				.setImage(`${stream.thumbnailUrl}`)
				.setColor('GREEN')
				.setTimestamp();
			await LIVE.send({ content: '<@&967016374486573096>', embeds: [liveEmbed] });
			modvlogLIVEDiscord.send({ embeds: [liveEmbed] });
			await chatClient.disableEmoteOnly(broadcasterID.name).catch((err) => { console.error(err); });
		});
		const offline = await eventSubListener.subscribeToStreamOfflineEvents(userId, async stream => {
			// console.log(`${stream.broadcasterDisplayName} has gone offline, thanks for stopping by i appreacate it!`);
			const userInfo = await stream.getBroadcaster();
			chatClient.say(broadcasterID.name, `${stream.broadcasterDisplayName} has gone offline, thank you for stopping by!`);
			const LIVE = new WebhookClient({
				url: config.DISCORD_WEBHOOK_PROMOTE_URL
			});
			const modvlogLIVE = new WebhookClient({
				url: config.MOD_DISCORD_WEBHOOK_PROMOTE_URL
			});

			const offlineEmbed = new MessageEmbed()
				.setAuthor({ name: `${userInfo.displayName}`, iconURL: `${userInfo.profilePictureUrl}` })
				.setDescription(`${stream.broadcasterDisplayName} has gone offline, thank you for stopping by!`)
				.setColor('RED')
				.setFooter({ text: 'Ended Stream at ' })
				.setTimestamp();
			await LIVE.send({ embeds: [offlineEmbed] });
			await modvlogLIVE.send({ embeds: [offlineEmbed] });
			await chatClient.enableEmoteOnly(broadcasterID.name).catch((err) => { console.error(err); });
		});
		const redeem = await eventSubListener.subscribeToChannelRedemptionAddEvents(userId, async cp => {
			const userInfo = await cp.getUser();
			const streamer = await cp.getBroadcaster();
			console.log(`${cp.userDisplayName}: Reward Name: ${cp.rewardTitle}, rewardId: ${cp.rewardId}, BroadcasterId: ${cp.id}`);
			// const reward = await userApiClient.channelPoints.getRedemptionById(broadcasterID, `${cp.rewardId}`, `${cp.id}`);
			switch (cp.rewardTitle || cp.rewardId) {
				case 'No Mermaid':
					chatClient.say(broadcasterID.name, `${cp.userDisplayName} has redeemed ${cp.rewardTitle} and has blocked you from using a mermaid for 1 minute`);

					const noMermaidEmbed = new MessageEmbed()
						.setTitle('REDEEM EVENT')
						.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
						.setColor('RANDOM')
						.addFields([
							{
								name: 'User: ',
								value: `${cp.userDisplayName}`,
								inline: true
							},
							{
								name: 'Redeemed: ',
								value: `${cp.rewardTitle}`,
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
					twitchActivity.send({ embeds: [noMermaidEmbed] });
					break;
				case 'Abandon Ship':
					chatClient.say(broadcasterID.name, `${cp.userDisplayName} has redeemed ${cp.rewardTitle} and would kindly like you to GET OFF THE SHIP`);

					const abandonShipEmbed = new MessageEmbed()
						.setTitle('REDEEM EVENT')
						.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
						.setColor('RANDOM')
						.addFields([
							{
								name: 'User: ',
								value: `${cp.userDisplayName}`,
								inline: true
							},
							{
								name: 'Redeemed: ',
								value: `${cp.rewardTitle}`,
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
					twitchActivity.send({ embeds: [abandonShipEmbed] });
					break;
				case 'Weapon Loadout':
					// console.log(`${cp.userDisplayName} has redeemed ${cp.rewardTitle} and would like you to use ${cp.input}`);
					chatClient.say(broadcasterID.name, `${cp.userDisplayName} has redeemed ${cp.rewardTitle} and would like you to use ${cp.input}`);

					const weaponLoadoutEmbed = new MessageEmbed()
						.setTitle('REDEEM EVENT')
						.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
						.setColor('RANDOM')
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
						.setColor('RANDOM')
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
						.setColor('RANDOM')
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
						.setColor('RANDOM')
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
						.setColor('RANDOM')
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
						.setColor('RANDOM')
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
				case 'TicTok':
					console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
					chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName}'s Tic-Tok: https://tiktok.com/@skullgaming31`);

					const tiktokEmbed = new MessageEmbed()
						.setTitle('REDEEM EVENT')
						.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
						.setColor('RANDOM')
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
						.setColor('RANDOM')
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
						.setColor('RANDOM')
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
						.setColor('RANDOM')
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
						.setColor('RANDOM')
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
						.setColor('RANDOM')
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
						.setColor('RANDOM')
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
						.setColor('RANDOM')
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
						.setColor('RANDOM')
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
						.setColor('RANDOM')
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
						.setColor('RANDOM')
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
						.setColor('RANDOM')
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
						.setColor('RANDOM')
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
						.setColor('RANDOM')
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
			console.log(`Listening but no messages setup, ${hts.goal} to reach the next level of the Hype Train`);
			chatClient.say(broadcasterID.name, `${hts.goal} to reach the next level of the Hype Train, Last Contributer: ${hts.lastContribution}`);
		});
		const hypeEventEnd = await eventSubListener.subscribeToChannelHypeTrainEndEvents(userId, async hte => { // needs to be tested, progress and start to be done after end has been tested and it works!
			const streamer = await hte.getBroadcaster();
			console.log(`HypeTrain End Event Ending, Total Contrubtion:${hte.total}, Total Level:${hte.level}`);
			chatClient.say(broadcasterID.name, `${hte.topContributors} have contributed to the HypeTrain`);

			const hypeeventendEmbed = new MessageEmbed()
				.setTitle('REDEEM EVENT')
				.setAuthor({ name: `${streamer.displayName}`, iconURL: `${streamer.profilePictureUrl}` })
				.setColor('RANDOM')
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
				.setColor('RANDOM')
				.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
				.setTimestamp();
			twitchActivity.send({ embeds: [giftedSubs] });
		});
		const resub = await eventSubListener.subscribeToChannelSubscriptionMessageEvents(userId, async s => {
			chatClient.say(broadcasterID.name, `${s.userDisplayName} has resubbed to the channel for ${s.cumulativeMonths} Months, currently on a ${s.streakMonths} streak, ${s.messageText}`);
			const userInfo = await s.getUser();
			const resubEmbed = new MessageEmbed()
				.setTitle('RESUB EVENT')
				.setAuthor({ name: `${s.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
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
				.color('RANDOM')
				.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
				.setTimestamp();
			twitchActivity.send({ embeds: [resubEmbed] });
		});
		const follow = await eventSubListener.subscribeToChannelFollowEvents(userId, async e => {
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
				.setColor('RANDOM')
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
		});
		const subs = await eventSubListener.subscribeToChannelSubscriptionEvents(userId, async s => {
			chatClient.say(broadcasterID.name, `${s.userName} has Subscribed to the channel with a tier ${s.tier} Subscription`);
			const userInfo = await s.getUser();
			const subEmbed = new MessageEmbed()
				.setTitle('SUBSCRIBER EVENT')
				.setAuthor({ name: `${s.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
				.addFields([
					{
						name: 'Username: ',
						value: `${userInfo.displayName}`,
						inline: true
					},
					{
						name: 'Sub Tier: ',
						value: `tier ${s.tier} Subscription`,
						inline: true
					},
					{
						name: 'Sub Gifted: ',
						value: `${s.isGift}`,
						inline: true
					},
				])
				.setThumbnail(`${userInfo.profilePictureUrl}`)
				.setColor('RANDOM')
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
					.setAuthor({ name: `${userInfo.displayName}`, iconURL: `${userInfo.profilePictureUrl}` })
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
					.setColor('RANDOM')
					.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [cheerEmbed] });
			}
		});
		const raid = await eventSubListener.subscribeToChannelRaidEventsFrom(userId, async raid => {
			// console.log(`${raid.raidingBroadcasterDisplayName} has raided the channel with ${raid.viewers} viewers!`);
			chatClient.say(broadcasterID.name, `${raid.raidedBroadcasterDisplayName} has raided the channel with ${raid.viewers} viewers!`);
			const userInfo = await raid.getRaidedBroadcaster();
			const raidEmbed = new MessageEmbed()
				.setTitle('CHANNEL RAID EVENT')
				.setColor('RANDOM')
				.setAuthor({ name: `${raid.raidedBroadcasterDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
				.addFields([
					{
						name: 'Raider: ',
						value: `${raid.raidedBroadcasterDisplayName}`,
						inline: true
					},
					{
						name: 'Viewer Count: ',
						value: `${raid.viewers} Viewers`,
						inline: true
					}
				])
				.setURL(`https://twitch.tv/${raid.raidedBroadcasterName}`)
				.setThumbnail(`${userInfo.profilePictureUrl}`)
				.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
				.setTimestamp();
			twitchActivity.send({ embeds: [raidEmbed] });
		});
		const goalBeginning = await eventSubListener.subscribeToChannelGoalBeginEvents(userId, async gb => {
			const userInfo = await gb.getBroadcaster();
			console.log(`${userInfo.displayName}, current ${gb.type} goal: ${gb.currentAmount} - ${gb.targetAmount}`);
			switch (gb.type) {
				case 'follower':
					console.log(`${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`);
					chatClient.say(broadcasterID.name, `${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`);
					break;
				case 'subscriber':
					console.log(`${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`);
					chatClient.say(broadcasterID.name, `${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`);
					break;
			}
		});
		const goalProgress = await eventSubListener.subscribeToChannelGoalProgressEvents(userId, async gp => {
			const userInfo = await gp.getBroadcaster();
			setTimeout(() => {
				console.log(`${userInfo.displayName} ${gp.type} Goal, ${gp.currentAmount} - ${gp.targetAmount}`);
			}, 60000);
			chatClient.say(broadcasterID.name, `${userInfo.displayName} ${gp.type} Goal, ${gp.currentAmount} - ${gp.targetAmount}`);
		});
		const goalEnded = await eventSubListener.subscribeToChannelGoalEndEvents(userId, async ge => {
			const userInfo = await ge.getBroadcaster();
			console.log(`${userInfo.displayName}, ${ge.currentAmount} - ${ge.targetAmount} Goal Started:${ge.startDate} Goal Ended: ${ge.endDate}`);
			chatClient.say(broadcasterID.name, `${userInfo.displayName}, ${ge.currentAmount} - ${ge.targetAmount} Goal Started:${ge.startDate} Goal Ended: ${ge.endDate}`);
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
		// console.log(`${msg.userInfo.displayName} Said: ${message} in ${channel}`);

		const display = msg.userInfo.displayName;
		const staff = msg.userInfo.isMod || msg.userInfo.isBroadcaster;
		const skullgaming31 = await userApiClient.channels.getChannelInfoById(userId);
		const modvlog = await userApiClient.channels.getChannelInfoById(userID);


		if (message.includes('!poke')) return;
		if (message.startsWith('!') && channel === '#modvlog') return;
		if (message.startsWith('!') && channel === '#skullgaming31') return chatClient.say(channel, `${display}, - should be used for this channels commands`);

		if (message.startsWith('-')) {

			const args = message.slice(1).split(' ');
			const command = args.shift().toLowerCase();

			if (command === 'ping') {
				switch (channel) {
					case '#skullgaming31':
						if (staff) {
							chatClient.say(channel, `${user}, Im online and working correctly`);
							const tbd = await userApiClient.streams.getStreamByUserName(broadcasterID);
						}
						break;
					case '#modvlog':
						if (staff) {
							chatClient.say(channel, `${user}, im online and working correctly`);
						}
						break;
					default:
						chatClient.say(channel, `${user}, Only a mod or the broadcaster can use this command`);
						break;
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
			if (command === 'settitle') {
				switch (channel) {
					case '#skullgaming31':
						try {
							if (staff) {
								const setTitle = await userApiClient.channels.updateChannelInfo(skullgaming31.name, { 'title': `${args.join(' ')}` }); // Channel ID:'31124455'
								chatClient.say(channel, `${display}, has updated the channel title to ${skullgaming31.title}`);
								const commandEmbed = new MessageEmbed()
									.setTitle('Command Used')
									.setColor('RED')
									.addFields([
										{
											name: 'Command Executer: ',
											value: `\`${msg.userInfo.displayName}\``,
											inline: true
										},
										{
											name: 'New Title: ',
											value: `\`${skullgaming31.title}\``,
											inline: true
										}
									])
									.setFooter({ text: `Channel: ${channel.replace('#', '')}` })
									.setTimestamp();
								twitchModlogs.send({ embeds: [commandEmbed] });
							} else {
								chatClient.say(channel, `${display}, you are not a moderator or the broadcaster you do not have access to these commands, please run /help to find out what commands you can use.`);
							}
						} catch (error) {
							console.error(error);
							return;
						}
						break;
					case '#modvlog':
						try {
							if (staff) {
								const setTitle = await modvlogApiClient.channels.updateChannelInfo(broadcaster, { 'title': `${args.join(' ')}` }); // Channel ID:'31124455'
								chatClient.say(channel, `${display}, has updated the channel title to ${modvlog.title}`);
								const commandEmbed = new MessageEmbed()
									.setTitle('Command Used')
									.setColor('RED')
									.addFields([
										{
											name: 'Command Executer: ',
											value: `\`${msg.userInfo.displayName}\``,
											inline: true
										},
										{
											name: 'New Title: ',
											value: `\`${modvlog.title}\``,
											inline: true
										}
									])
									.setFooter({ text: `Channel: ${channel.replace('#', '')}` })
									.setTimestamp();
								modVlogCommandUsage.send({ embeds: [commandEmbed] });
							} else {
								chatClient.say(channel, `${display}, you are not a moderator or the broadcaster you do not have access to these commands, please run /help to find out what commands you can use.`);
							}
						} catch (error) {
							console.error(error);
							return;
						}
						break;
				}
			}
			if (command === 'setgame') {
				switch (channel) {
					case '#skullgaming31':
						if (staff) {
							const gamename = await userApiClient.games.getGameByName(args.join(' '));
							const setGame = await userApiClient.channels.updateChannelInfo(broadcasterID, { gameId: `${gamename.id}` });
							chatClient.say(channel, `channel game has been updated to ${gamename.name}`);
							const commandEmbed = new MessageEmbed()
								.setTitle('Command Used')
								.setColor('RED')
								.addFields([
									{
										name: 'Command Executer: ',
										value: `\`${msg.userInfo.displayName}\``,
										inline: true
									},
									{
										name: 'New Category:',
										value: `\`Gamename: ${gamename.name}\`, \n||\`GameID: ${gamename.id}\`||`,
										inline: true
									}
								])
								.setFooter({ text: `Channel: ${channel.replace('#', '')}` })
								.setTimestamp();
							twitchModlogs.send({ embeds: [commandEmbed] });
							console.log(`${gamename.name}: ${gamename.id}`);
						} else {
							chatClient.say(channel, `${display}, you are not a moderator or the broadcaster you do not have access to these commands, please run /commands to find out what commands you can use.`);
						}
						break;
					case '#modvlog':
						try {
							if (staff) {
								const gamename = await modvlogApiClient.games.getGameByName(args.join(' '));
								const setGame = await modvlogApiClient.channels.updateChannelInfo(broadcaster, { gameId: `${gamename.id}` });
								chatClient.say(channel, `channel game has been updated to ${gamename.name}`);
								console.log(`${gamename.name}: ${gamename.id}`);
								const commandEmbed = new MessageEmbed()
									.setTitle('Command Used')
									.setColor('RED')
									.addFields([
										{
											name: 'Command Executer: ',
											value: `\`${msg.userInfo.displayName}\``,
											inline: true
										},
										{
											name: 'New Category:',
											value: `\`Gamename: ${gamename.name}\`, \n||\`GameID: ${gamename.id}\`||`,
											inline: true
										}
									])
									.setFooter({ text: `Channel: ${channel.replace('#', '')}` })
									.setTimestamp();
								modVlogCommandUsage.send({ embeds: [commandEmbed] });
							} else {
								chatClient.say(channel, `${display}, you are not a moderator or the broadcaster you do not have access to these commands, please run /commands to find out what commands you can use.`);
							}
						} catch (error) {
							console.error(error);
						}
						break;
				}
			}
			if (command === 'game') {
				switch (channel) {
					case '#modvlog':
						chatClient.say(channel, `${display}, ${broadcaster.displayName} is currently playing ${broadcaster.gameName}`);
						break;
					default:
						// const currentGame = await apiClient.channels.getChannelInfoById(broadcasterID);
						chatClient.say(channel, `${display}, ${broadcasterID.displayName} is currently playing ${broadcasterID.gameName}`);
						break;
				}
				// if (channel === '#skullgaming31') {
				// 	const currentGame = await apiClient.channels.getChannelInfoById(broadcasterID);
				// 	chatClient.say(channel, `${display}, ${currentGame.displayName} is currently playing ${currentGame.gameName}`);
				// } else if (channel === '#modvlog') {
				// 	const modcurrentGame = await apiClient.channels.getChannelInfoById(broadcaster);
				// 	chatClient.say(channel, `${display}, ${modcurrentGame.displayName} is currently playing ${modcurrentGame.gameName}`);
				// } else { return; }
			}
			if (command === 'lurk' && channel === '#skullgaming31') {
				switch (args[0]) {
					case 'lurk':
						const lurk = args.slice(0).join(' ');
						if (lurk) {
							chatClient.say(channel, `${lurk}`);
						} else {
							chatClient.say(channel, 'have some stuff to do but have a tab open for you, have a great stream!');
						}
						break;
				}
			}
			if (command === 'id' && channel === '#skullgaming31') { // Mod Twitch ID- 204831754
				chatClient.say(channel, `${display} your TwitchId is ${msg.userInfo.userId}`);
			}
			if (command === 'followage' && channel === '#skullgaming31') {// cant tag someone to found out when they created there account.
				const follow = await apiClient.users.getFollowFromUserToBroadcaster(msg.userInfo.userId, msg.channelId);
				if (follow) {
					const followStartTimestamp = follow.followDate.getTime();
					chatClient.say(channel, `@${display} You have been following for ${countdown(new Date(followStartTimestamp))}!`);
				}
				else {
					chatClient.say(channel, `@${display} You are not following!`);
				}
			}
			if (command === 'accountage' && channel === '#skullgaming31') {// cant tag someone to found out when they created there account.
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
				switch (channel) {
					case 'modvlog':
						if (modvlogStream) {
							const modvlogUptime = countdown(new Date(modvlogStream.startDate));
							chatClient.say(channel, `${display}, the stream has been live for ${modvlogUptime}`);
						}
						else {
							return chatClient.say(channel, `${display}, the stream is currently offline`);
						}
						break;
					default:
						if (stream) {
							const uptime = countdown(new Date(stream.startDate));
							chatClient.say(channel, `${display}, the stream has been live for ${uptime}`);
						}
						else {
							return chatClient.say(channel, 'the Stream is currently Offline');
						}
						break;
				}
				// if (channel === '#skullgaming31') {
				// 	if (stream) {
				// 		const uptime = countdown(new Date(stream.startDate));
				// 		chatClient.say(channel, `${display}, the stream has been live for ${uptime}`);
				// 	}
				// 	else {
				// 		return chatClient.say(channel, 'the Stream is currently Offline');
				// 	}
				// } else if (channel === '#modvlog') {
				// 	if (modvlogStream) {
				// 		const modvlogUptime = countdown(new Date(modvlogStream.startDate));
				// 		chatClient.say(channel, `${display}, the stream has been live for ${modvlogUptime}`);
				// 	}
				// 	else {
				// 		return chatClient.say(channel, `${display}, the stream is currently offline`);
				// 	}
				// }
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
					case 'dig':// have a % chance to dig up the correct Hole and win currency prize Failed means you lose currency. -dig [amount] isFollower * 1.5 isSubscriber * 2
						/**
						 * Total: 5 holes
						 *  random number between 1-4 desides how many bombs are in play out of 5 holes
						 */
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
				switch (channel) {
					case '#skullgaming31':
						if (staff) {
							const modCommands = ['ping', 'settitle', 'setgame', 'mod', 'game', 'lurk', 'id', 'followage', 'accountage', 'uptime', 'dadjoke', 'games', 'warframe', 'vigor', 'me', 'socials'];
							chatClient.say(channel, `${display}, Commands for this channel are ${modCommands.join(', ')}`);
						} else {
							const commands = ['game', 'lurk', 'id', 'followage', 'accountage', 'uptime', 'dadjoke', 'games', 'warframe', 'vigor', 'me', 'socials'];
							chatClient.say(channel, `${display}, Commands for this channel are ${commands.join(', ')}`);
						}
						break;
					case '#modvlog':
						if (staff) {
							const moderatorCommands = ['ping', 'settitle', 'setgame', 'game', /* 'followage', 'accountage', */ 'uptime', 'dadjoke', 'vigor'];
							chatClient.say(channel, `${display}, Commands for this channel are ${moderatorCommands.join(', ')}`);
						} else {
							const modvlogCommands = ['game', /* 'followage', 'accountage', */ 'uptime', 'dadjoke', 'vigor', 'me'];
							chatClient.say(channel, `${display}, Commands for this channel are ${modvlogCommands.join(', ')}`);
						}
						break;
					default:
						chatClient.say(channel, 'There are no registered Commands for this channel');
						break;
				}
				// if (channel === '#skullgaming31') {
				// 	if (staff) {
				// 		const modCommands = ['ping', 'settitle', 'setgame', 'mod', 'game', 'lurk', 'id', 'followage', 'accountage', 'uptime', 'dadjoke', 'games', 'warframe', 'vigor', 'me', 'socials'];
				// 		chatClient.say(channel, `${display}, Commands for this channel are ${modCommands.join(', ')}`);
				// 	}
				// 	else {
				// 		const commands = ['game', 'lurk', 'id', 'followage', 'accountage', 'uptime', 'dadjoke', 'games', 'warframe', 'vigor', 'me', 'socials'];
				// 		chatClient.say(channel, `${display}, Commands for this channel are ${commands.join(', ')}`);
				// 	}
				// }
				// else {
				// 	chatClient.say(channel, 'There are no registered Commands for this channel');
				// 	return;
				// }
			}
			if (command === 'me' && channel === '#skullgaming31') {
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
											name: 'Executer',
											value: `${msg.userInfo.displayName}`,
											inline: true
										},
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
											name: 'Executer',
											value: `${msg.userInfo.displayName}`,
											inline: true
										},
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
											name: 'Executer',
											value: `${msg.userInfo.displayName}`,
											inline: true
										},
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
											name: 'Executer',
											value: `${msg.userInfo.displayName}`,
											inline: true
										},
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
								const purgeEmbed = new MessageEmbed()
									.setTitle('Twitch Channel Purge Event')
									.setAuthor({ name: `${msg.userInfo.userName}` })
									.setColor('RED')
									.addFields([
										{
											name: 'Executer',
											value: `${msg.userInfo.displayName}`,
											inline: true
										}
									])
									.setFooter({ text: `Someone just purged in ${channel}'s channel` })
									.setTimestamp();
								twitchActivity.send({ embeds: [purgeEmbed] });
							} catch (error) {
								console.error(error);
							}
							break;
						case 'ban':
							try {
								if (!args[1]) return chatClient.say(channel, `${display}, Usage: -mod ban @name (reason)`);
								if (!args[2]) args[2] = 'No Reason Provided';
								if (args[2]) args.join(' ');
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
							const gameLastPlayed = await apiClient.channels.getChannelInfoById(user.id);
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
			if (message.includes('wl') && channel === '#skullgaming31') {
				const amazon = 'https://www.amazon.ca/hz/wishlist/ls/354MPD0EKWXZN?ref_=wl_share';
				setTimeout(() => {
					chatClient.say(channel, `check out the Wish List here if you would like to help out the stream ${amazon}`);
				}, 1800000);
			}
			if (message.includes('Want to become famous?') && channel === '#skullgaming31') {
				await chatClient.ban(channel, msg.userInfo.userName, 'Selling Followers');
				await chatClient.deleteMessage(channel, msg.id);
				chatClient.say(channel, `${display} bugger off with your scams and frauds, you have been removed from this channel, have a good day`);
			}
		}
	});
}
main();