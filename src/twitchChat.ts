import countdown from 'countdown';
import { promises as fs } from 'fs';
import ms from 'ms';
import axios from 'axios';
import { RefreshingAuthProvider, AppTokenAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { ChatClient } from '@twurple/chat';
import { EventSubHttpListener } from '@twurple/eventsub-http';
import { NgrokAdapter } from '@twurple/eventsub-ngrok'
import { WebhookClient, EmbedBuilder, ErrorEvent } from 'discord.js';

import { config } from 'dotenv'
config();

// const { rwClient } = require('./tweet');

// WIP Stuff Starts

// const botModel = require('../src/database/models/bot');
import client from './discord/index';
// const eventSubListener = require('./eventSub');

// WIP Stuff Ends

export async function twitchChat() {

	const clientId = `${process.env.TWITCH_CLIENT_ID}`;
	const clientSecret = `${process.env.TWITCH_CLIENT_SECRET}`;
	const eventSubSecret = `${process.env.TWITCH_EVENTSUB_SECRET}`;

	if (clientId || clientSecret || eventSubSecret === undefined) return;

	// START AuthProviders
	const botTokenData = JSON.parse(await fs.readFile('./auth/tokens/token.659523613.json', 'utf-8'));
	const authProvider = new RefreshingAuthProvider({
		clientId,
		clientSecret,
		onRefresh: async (newTokenData: any) => await fs.writeFile('./auth/tokens/token.659523613.json', JSON.stringify(newTokenData, null, 4), 'utf-8')
		
	});
	authProvider.addUser('659523613', botTokenData, ['chat']);

	const userTokenData = JSON.parse(await fs.readFile('./auth/tokens/token.31124455.json', 'utf-8'));
	const userAuthProvider = new RefreshingAuthProvider({
		clientId,
		clientSecret,
		onRefresh: async (newTokenData: any) => await fs.writeFile('./auth/tokens/token.31124455.json', JSON.stringify(newTokenData, null, 4), 'utf-8')
	});
	userAuthProvider.addUser('31124455', userTokenData);

	//End Auth Provider Section
	const chatClient = new ChatClient({ 
		authProvider, 
		channels: ['canadiendragon'], 
		logger: { minLevel: 'error' },
		authIntents: ['chat'],
		botLevel: 'none'
	});
	await chatClient.connect().then(() => console.log('connected to Twitch Chat')).catch((err) => { console.error(err); });
	const appAuthProvider = new AppTokenAuthProvider(clientId, clientSecret);
	const apiClient = new ApiClient({ 
		authProvider: appAuthProvider, 
		logger: { minLevel: 'critical' }
	});
	const userApiClient = new ApiClient({ authProvider: userAuthProvider, logger: { minLevel: 'error' } });


	if (process.env.NODE_ENV === 'dev') { await apiClient.eventSub.deleteAllSubscriptions().then(() => { console.log('All Subscriptions Deleted!') } ).catch((err) => { console.error(err); }); }

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
	const broadcasterID = await apiClient.channels.getChannelInfoById(userId);// apiClient.channels.getChannelInfoById(userID);
	const twitchActivity = new WebhookClient({ id: `${process.env.DISCORD_WEBHOOK_ID}`, token: `${process.env.DISCORD_WEBHOOK_TOKEN}` });

	// await createChannelPointsRewards();

	if (process.env.NODE_ENV === 'dev') {
		const eventSubListener = new EventSubHttpListener({
			apiClient,
			adapter: new NgrokAdapter(),
			secret: eventSubSecret,
			logger: { minLevel: 'error' },
			strictHostCheck: true
		});

		eventSubListener.start();

		// const shoutoutUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID?.id, '52c6bb77-9cc1-4f67-8096-d19c9d9f8896', {
		// 	title: 'Shoutout',
		// 	cost: 2000,
		// 	autoFulfill: true,
		// 	backgroundColor: '#09CB4C',
		// 	globalCooldown: 60,
		// 	isEnabled: true,
		// 	maxRedemptionsPerUserPerStream: 3,
		// 	maxRedemptionsPerStream: null,
		// 	prompt: 'shout yourself out with Channel Points',
		// 	userInputRequired: false
		// });
		// const twitterUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID, 'e80f9746-d183-47cb-933e-bdf9d3be5241', {
		// 	title: 'Twitter',
		// 	cost: 1,
		// 	autoFulfill: true,
		// 	backgroundColor: '#d0080a',
		// 	globalCooldown: 30,
		// 	isEnabled: true,
		// 	maxRedemptionsPerUserPerStream: null,
		// 	maxRedemptionsPerStream: null,
		// 	prompt: 'Click for a link to my twitter profile',
		// 	userInputRequired: false
		// });
		// const instagramUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID, 'c8ca7ccf-9e2f-4313-8e28-35eecdcda685', {
		// 	title: 'Instagram',
		// 	cost: 1,
		// 	autoFulfill: true,
		// 	backgroundColor: '#d0080a',
		// 	globalCooldown: 30,
		// 	isEnabled: true,
		// 	maxRedemptionsPerUserPerStream: null,
		// 	maxRedemptionsPerStream: null,
		// 	prompt: 'Click for a link to my Instagram profile',
		// 	userInputRequired: false
		// });
		// const tiktokUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID, '144837ed-514a-436c-95cf-d9491efad240', { // 144837ed-514a-436c-95cf-d9491efad240
		// 	title: 'TicTok',
		// 	cost: 1,
		// 	autoFulfill: true,
		// 	backgroundColor: '#d0080a',
		// 	globalCooldown: 30,
		// 	isEnabled: true,
		// 	maxRedemptionsPerUserPerStream: null,
		// 	maxRedemptionsPerStream: null,
		// 	prompt: 'Click for a link to my Tik-Tok profile',
		// 	userInputRequired: false
		// });
		// const discordUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID, '9aa5fab9-2648-4875-b9c8-ebfb9dee7019', {
		// 	title: 'Discord',
		// 	cost: 1,
		// 	autoFulfill: true,
		// 	backgroundColor: '#d0080a',
		// 	globalCooldown: 30,
		// 	isEnabled: true,
		// 	maxRedemptionsPerUserPerStream: null,
		// 	maxRedemptionsPerStream: null,
		// 	prompt: 'click for a link to my discord server',
		// 	userInputRequired: false
		// });
		// const facebookUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID, 'df73bcbd-a01c-4453-8ae3-987078ced3ab', {
		// 	title: 'Facebook',
		// 	cost: 1,
		// 	autoFulfill: true,
		// 	backgroundColor: '#d0080a',
		// 	globalCooldown: 30,
		// 	isEnabled: true,
		// 	maxRedemptionsPerUserPerStream: null,
		// 	maxRedemptionsPerStream: null,
		// 	prompt: 'click for a link to my facebook page',
		// 	userInputRequired: false
		// });
		// const youtubeUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID, '993abcd3-613b-4e7a-ab0c-ae0705a707bd', {
		// 	title: 'YouTube',
		// 	cost: 1,
		// 	autoFulfill: true,
		// 	backgroundColor: '#d0080a',
		// 	globalCooldown: 30,
		// 	isEnabled: true,
		// 	maxRedemptionsPerUserPerStream: null,
		// 	maxRedemptionsPerStream: null,
		// 	prompt: 'click for a link to my youtube channel',
		// 	userInputRequired: false
		// });
		// const snapchatUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID, 'ad16d5e3-b88c-43d3-9349-0203cbaf88cc', {
		// 	title: 'Snapchat',
		// 	cost: 1,
		// 	autoFulfill: true,
		// 	backgroundColor: '#d0080a',
		// 	globalCooldown: 30,
		// 	isEnabled: true,
		// 	maxRedemptionsPerUserPerStream: null,
		// 	maxRedemptionsPerStream: null,
		// 	prompt: 'click for a link to my Snapchat',
		// 	userInputRequired: false
		// });
		// const merchUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID, 'f7ed2b68-35d5-4b57-bf54-704274d89670', {
		// 	title: 'Merch',
		// 	cost: 1,
		// 	autoFulfill: true,
		// 	backgroundColor: '#d0080a',
		// 	globalCooldown: 30,
		// 	isEnabled: true,
		// 	maxRedemptionsPerUserPerStream: null,
		// 	maxRedemptionsPerStream: null,
		// 	prompt: 'click for a link to my Merch Shop',
		// 	userInputRequired: false
		// });
		// const tipUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID, '64c19c30-5560-4b68-8716-be508de12d3d', {
		// 	title: 'Tip',
		// 	cost: 1,
		// 	autoFulfill: true,
		// 	backgroundColor: '#d0080a',
		// 	globalCooldown: 5,
		// 	isEnabled: true,
		// 	maxRedemptionsPerUserPerStream: null,
		// 	maxRedemptionsPerStream: null,
		// 	prompt: 'click for a link to my Tipping Page',
		// 	userInputRequired: false
		// });

		const online = eventSubListener.onStreamOnline(userId, async (o) => {
			const stream = await o.getStream();
			const userInfo = await o.getBroadcaster();
			chatClient.say(userInfo.name, `${o.broadcasterDisplayName} has just gone live playing ${broadcasterID?.gameName} with ${stream?.viewers} viewers.`);
			// await rwClient.v2.tweet(`${userInfo.displayName} has gone live playing ${stream.gameName} here: https://twitch.tv/${userInfo.name}`);

			const LIVE = new WebhookClient({
				url: `${process.env.DISCORD_WEBHOOK_PROMOTE_URL}`
			});
			const liveEmbed = new EmbedBuilder()
				.setTitle('GONE LIVE')
				.setAuthor({ name: `${o.broadcasterName}`, iconURL: `${userInfo.profilePictureUrl}` })
				.addFields([
					{
						name: 'Stream Title',
						value: `${stream?.title}`,
						inline: true
					},
					{
						name: 'game: ',
						value: `${stream?.gameName || 'No Game Set'}`,
						inline: true
					},
					{
						name: 'Viewers: ',
						value: `${stream?.viewers}`,
						inline: true
					},
				])
				.setThumbnail(`${userInfo.offlinePlaceholderUrl}`)
				.setURL(`https://twitch.tv/${userInfo.name}`)
				.setImage(`${stream?.thumbnailUrl}`)
				.setColor('Green')
				.setTimestamp();
			await LIVE.send({ content: '<@&967016374486573096>', embeds: [liveEmbed] });
			// chatClient.onEmoteOnly(['#canadiendragon', false]);
		});
		const offline = eventSubListener.onStreamOffline(userId, async (stream) => {
			// console.log(`${stream.broadcasterDisplayName} has gone offline, thanks for stopping by i appreacate it!`);
			const userInfo = await stream.getBroadcaster();
			chatClient.say(userInfo.name, `${stream.broadcasterDisplayName} has gone offline, thank you for stopping by!`);
			const LIVE = new WebhookClient({ url: `${process.env.DISCORD_WEBHOOK_PROMOTE_URL}` });

			const offlineEmbed = new EmbedBuilder()
				.setAuthor({ name: `${userInfo.displayName}`, iconURL: `${userInfo.profilePictureUrl}` })
				.setDescription(`${stream.broadcasterDisplayName} has gone offline, thank you for stopping by!`)
				.setColor('Red')
				.setFooter({ text: 'Ended Stream at ' })
				.setTimestamp();
			await LIVE.send({ embeds: [offlineEmbed] });
			// await chatClient.enableEmoteOnly(broadcasterID.name).catch((err) => { console.error(err); });
		});
		const redeem = eventSubListener.onChannelRedemptionAdd(userId, async (cp) => {
			const userInfo = await cp.getUser();
			const streamer = await cp.getBroadcaster();
			console.log(`${cp.userDisplayName}: Reward Name: ${cp.rewardTitle}, rewardId: ${cp.rewardId}, BroadcasterId: ${cp.id}`);
			// const reward = await userApiClient.channelPoints.getRedemptionById(broadcasterID, `${cp.rewardId}`, `${cp.id}`);
			switch (cp.rewardTitle || cp.rewardId) {
				case 'Shoutout':
					const user = await apiClient.users.getUserByName(cp.userName);
					const gameLastPlayed = await apiClient.channels.getChannelInfoById(broadcasterID?.id!);
					chatClient.say(userInfo.name, `@${cp.userDisplayName} has redeemed a shoutout, help them out by giving them a follow here: https://twitch.tv/${cp.userName}, last seen playing: ${gameLastPlayed?.gameName}`);

					const shoutoutEmbed = new EmbedBuilder()
						.setTitle('REDEEM EVENT')
						.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
						.setColor('Random')
						.addFields([
							{
								name: 'Viewer: ',
								value: `${cp.userDisplayName}`,
								inline: true
							},
							{
								name: 'Playing: ',
								value: `${gameLastPlayed?.gameName}`,
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
					chatClient.say(userInfo.name, `@${cp.broadcasterDisplayName}'s Tipping Page: https://overlay.expert/celebrate/canadiendragon`);

					const tipEmbed = new EmbedBuilder()
						.setTitle('REDEEM EVENT')
						.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
						.setColor('Random')
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
					chatClient.say(userInfo.name, `@${cp.broadcasterDisplayName}'s Twitter: https://twitter.com/canadiendragon`);

					const twitterEmbed = new EmbedBuilder()
						.setTitle('REDEEM EVENT')
						.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
						.setColor('Random')
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
					chatClient.say(userInfo.name, `@${cp.broadcasterDisplayName}'s Instagram: https://instagram.com/canadiendragon`);

					const instagramEmbed = new EmbedBuilder()
						.setTitle('REDEEM EVENT')
						.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
						.setColor('Random')
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
					await chatClient.say(userInfo.name, `@${cp.broadcasterDisplayName}'s YouTube: https://youtube.com/channel/UCaJPv2Hx2-HNwUOCkBFgngA`);

					const youtubeEmbed = new EmbedBuilder()
						.setTitle('REDEEM EVENT')
						.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
						.setColor('Random')
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
					chatClient.say(userInfo.name, `@${cp.broadcasterDisplayName}'s Tic-Tok: https://tiktok.com/@canadiendragon`);

					const tiktokEmbed = new EmbedBuilder()
						.setTitle('REDEEM EVENT')
						.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
						.setColor('Random')
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
					chatClient.say(userInfo.name, `@${cp.broadcasterDisplayName}'s Snapchat: https://snapchat.com/add/canadiendragon`);

					const snapchatEmbed = new EmbedBuilder()
						.setTitle('REDEEM EVENT')
						.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
						.setColor('Random')
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
					chatClient.say(userInfo.name, `@${cp.broadcasterDisplayName}'s Facebook: https://facebook.com/gaming/SkullGaming8461`);

					const facebookEmbed = new EmbedBuilder()
						.setTitle('REDEEM EVENT')
						.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
						.setColor('Random')
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
					chatClient.say(userInfo.name, `@${cp.broadcasterDisplayName}'s Discord: https://discord.com/invite/6gGxrQMC9A`);

					const discordEmbed = new EmbedBuilder()
						.setTitle('REDEEM EVENT')
						.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
						.setColor('Random')
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
					chatClient.say(userInfo.name, `@${cp.broadcasterDisplayName}'s Merch: https://canadiendragon-merch.creator-spring.com`);

					const merchEmbed = new EmbedBuilder()
						.setTitle('REDEEM EVENT')
						.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
						.setColor('Random')
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
					chatClient.say(userInfo.name, `@${cp.broadcasterDisplayName}'s, you must stay hydrated, take a sip of whatever your drinking.`);

					const hydrateEmbed = new EmbedBuilder()
						.setTitle('REDEEM EVENT')
						.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
						.setColor('Random')
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
					chatClient.say(userInfo.name, `@${cp.broadcasterDisplayName} Empty that Clip`);

					const unloadEmbed = new EmbedBuilder()
						.setTitle('REDEEM EVENT')
						.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
						.setColor('Random')
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
					chatClient.say(userInfo.name, `@${cp.broadcasterDisplayName} Put down that controller for 30 seconds`);

					const dropcontrollerEmbed = new EmbedBuilder()
						.setTitle('REDEEM EVENT')
						.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
						.setColor('Random')
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
					chatClient.say(userInfo.name, `@${cp.broadcasterDisplayName} Get to running Boi, we got buildings to charge`);

					const swatrunEmbed = new EmbedBuilder()
						.setTitle('REDEEM EVENT')
						.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
						.setColor('Random')
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
					chatClient.say(userInfo.name, `${cp.broadcasterDisplayName} you should not be listening to game sounds right now`);

					const muteheadsetEmbed = new EmbedBuilder()
						.setTitle('REDEEM EVENT')
						.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
						.setColor('Random')
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
				case 'IRLWordBan':
					console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
					chatClient.say(userInfo.name, `@${cp.userDisplayName} has redeemed ${cp.rewardTitle} and has ban the word ${cp.input.toUpperCase()}`);

					const irlwordbanEmbed = new EmbedBuilder()
						.setTitle('REDEEM EVENT')
						.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
						.setColor('Random')
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
					chatClient.say(userInfo.name, `@${cp.broadcasterDisplayName} SHHHHHH why are you still talking right now`);

					const irlvoicebanEmbed = new EmbedBuilder()
						.setTitle('REDEEM EVENT')
						.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
						.setColor('Random')
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
					chatClient.say(userInfo.name, `${cp.userDisplayName} has redeemed Ban an In-Game Action`);

					const baningameactionEmbed = new EmbedBuilder()
						.setTitle('REDEEM EVENT')
						.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
						.setColor('Random')
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
					console.log(`${cp.userName} has attempted to redeem ${cp.rewardTitle} thats not coded in yet`);
					await chatClient.say(userInfo.name, `@${cp.userName} has activated a channel points item and it hasnt been coded in yet`);
					break;
			}
		});
		const title = eventSubListener.onChannelUpdate(userId, async (update) => {
			const userInfo = await update.getBroadcaster();
			const tbd = await update.getGame();
			console.log(userInfo.name, `updated title to ${update.streamTitle}, categoryName: ${update.categoryName}`);
		});
		const hypeEventStart = eventSubListener.onChannelHypeTrainBegin(userId, async (hts) => {
			const userInfo = await hts.getBroadcaster();
			console.log(`Listening but no messages setup, ${hts.goal} to reach the next level of the Hype Train`);
			chatClient.say(userInfo.name, `${hts.goal} to reach the next level of the Hype Train, Last Contributer: ${hts.lastContribution}`);
		});
		const hypeEventEnd = eventSubListener.onChannelHypeTrainEnd(userId, async (hte) => { // needs to be tested, progress and start to be done after end has been tested and it works!
			const userInfo = await hte.getBroadcaster();
			console.log(`HypeTrain End Event Ending, Total Contrubtion:${hte.total}, Total Level:${hte.level}`);
			chatClient.say(userInfo.name, `${hte.topContributors} have contributed to the HypeTrain`);

			const hypeeventendEmbed = new EmbedBuilder()
				.setTitle('REDEEM EVENT')
				.setAuthor({ name: `${userInfo.displayName}`, iconURL: `${userInfo.profilePictureUrl}` })
				.setColor('Random')
				.addFields([
					{
						name: 'Broadcaster Name',
						value: `${userInfo.displayName},\n Start Date: ${hte.startDate}`,
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
				.setThumbnail(`${userInfo.profilePictureUrl}`)
				.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
				.setTimestamp();
			twitchActivity.send({ embeds: [hypeeventendEmbed] });
		});
		const hypeTrainProgress = eventSubListener.onChannelHypeTrainProgress(userId, async (htp) => {
			const userInfo = await htp.getBroadcaster();
			chatClient.say(userInfo.name, `HypeTrain Level:${htp.level}, Latest Contributer:${htp.lastContribution}, HypeTrain Progress:${htp.progress}`);
		});
		const giftedSubs = eventSubListener.onChannelSubscriptionGift(userId, async (gift) => {
			// console.log(broadcasterID.name, `${gift.gifterDisplayName} has just gifted ${gift.amount} ${gift.tier} subs to ${gift.broadcasterName}, they have given a total of ${gift.cumulativeAmount} Subs to the channel`);
			const userInfo = await gift.getGifter();
			chatClient.say(userInfo.name, `${gift.gifterDisplayName} has just gifted ${gift.amount} ${gift.tier} subs to ${gift.broadcasterName}, they have given a total of ${gift.cumulativeAmount} Subs to the channel`);

			const giftedSubs = new EmbedBuilder()
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
				.setColor('Random')
				.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
				.setTimestamp();
			twitchActivity.send({ embeds: [giftedSubs] });
		});
		const resub = eventSubListener.onChannelSubscriptionMessage(userId, async (s) => {
			const userInfo = await s.getUser();
			chatClient.say(userInfo.name, `${s.userDisplayName} has resubbed to the channel for ${s.cumulativeMonths} Months, currently on a ${s.streakMonths} streak, ${s.messageText}`);
			const resubEmbed = new EmbedBuilder()
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
				.setColor('Random')
				.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
				.setTimestamp();
			twitchActivity.send({ embeds: [resubEmbed] });
		});
		const follow = eventSubListener.onChannelFollow(userId, '659523613', async (e) => {
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
				chatClient.say(userInfo.name, `${randomString}`);
			} else {
				chatClient.say(userInfo.name, `${randomString}`);
				console.log(`Users Channel Description: ${userInfo.description}`);
			}

			const followEmbed = new EmbedBuilder()
				.setTitle('FOLLOW EVENT')
				.setAuthor({ name: `${e.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
				.setColor('Random')
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
		const subs = eventSubListener.onChannelSubscription(userId, async (s) => {
			const userInfo = await s.getUser();
			chatClient.say(userInfo.name, `${s.userName} has Subscribed to the channel with a tier ${s.tier} Subscription`);
			const subEmbed = new EmbedBuilder()
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
				.setColor('Random')
				.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
				.setTimestamp();
			twitchActivity.send({ embeds: [subEmbed] });
		});
		const cheer = eventSubListener.onChannelCheer(userId, async (cheer) => {
			const userInfo = await cheer.getBroadcaster();
			const userCheer = await cheer.getUser();
			chatClient.say(userInfo?.name, `${cheer.userDisplayName} has cheered ${cheer.bits} bits`);
			if (cheer.bits >= 100) {
				const cheerEmbed = new EmbedBuilder()
					.setTitle('CHEER EVENT')
					.setAuthor({ name: `${userCheer?.displayName}`, iconURL: `${userCheer?.profilePictureUrl}` })
					.addFields([
						{
							name: 'Username: ',
							value: `${userCheer?.displayName}`,
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
					.setThumbnail(`${userInfo?.profilePictureUrl}`)
					.setColor('Random')
					.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo?.profilePictureUrl}` })
					.setTimestamp();
				twitchActivity.send({ embeds: [cheerEmbed] });
			}
		});
		const raid = eventSubListener.onChannelRaidFrom(userId, async (raid) => {
			// console.log(`${raid.raidingBroadcasterDisplayName} has raided the channel with ${raid.viewers} viewers!`);
			const raidFrom = await raid.getRaidedBroadcaster();
			const userInfo = await raid.getRaidingBroadcaster();

			chatClient.say(userInfo?.name, `${raid.raidedBroadcasterDisplayName} has raided the channel with ${raid.viewers} viewers!`);
			const raidEmbed = new EmbedBuilder()
				.setTitle('CHANNEL RAID EVENT')
				.setColor('Random')
				.setAuthor({ name: `${raid.raidedBroadcasterDisplayName}`, iconURL: `${raidFrom.profilePictureUrl}` })
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
				.setThumbnail(`${raidFrom.profilePictureUrl}`)
				.setFooter({ text: 'SkulledArmy', iconURL: `${raidFrom.profilePictureUrl}` })
				.setTimestamp();
			twitchActivity.send({ embeds: [raidEmbed] });
		});
		const goalBeginning = eventSubListener.onChannelGoalBegin(userId, async (gb) => {
			const userInfo = await gb.getBroadcaster();
			console.log(`${userInfo.displayName}, current ${gb.type} goal: ${gb.currentAmount} - ${gb.targetAmount}`);
			switch (gb.type) {
				case 'follower':
					console.log(`${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`);
					chatClient.say(userInfo.name, `${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`);
					break;
				case 'subscription':
					console.log(`${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`);
					chatClient.say(userInfo.name, `${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`);
					break;
			}
		});
		const goalProgress = eventSubListener.onChannelGoalProgress(userId, async (gp) => {
			const userInfo = await gp.getBroadcaster();
			setTimeout(() => {
				console.log(`${userInfo.displayName} ${gp.type} Goal, ${gp.currentAmount} - ${gp.targetAmount}`);
			}, 60000);
			chatClient.say(userInfo.name, `${userInfo.displayName} ${gp.type} Goal, ${gp.currentAmount} - ${gp.targetAmount}`);
		});
		const goalEnded = eventSubListener.onChannelGoalEnd(userId, async (ge) => {
			const userInfo = await ge.getBroadcaster();
			console.log(`${userInfo.displayName}, ${ge.currentAmount} - ${ge.targetAmount} Goal Started:${ge.startDate} Goal Ended: ${ge.endDate}`);
			chatClient.say(userInfo.name, `${userInfo.displayName}, ${ge.currentAmount} - ${ge.targetAmount} Goal Started:${ge.startDate} Goal Ended: ${ge.endDate}`);
		});
	}

	chatClient.onMessage(async (channel: string, user: string, text: string, msg) => {
		console.log(`${msg.userInfo.displayName} Said: ${text} in #${channel}`);

		const display: any = msg.userInfo.displayName;
		const staff = msg.userInfo.isMod || msg.userInfo.isBroadcaster;
		const canadiendragon = await userApiClient.channels.getChannelInfoById(userId);

		if (text.startsWith('-')) {

			const args = text.slice(1).split(' ');
			const command = args.shift()!.toLowerCase();

			if (command === 'ping') {
				switch (channel) {
					case '#canadiendragon':
						if (staff) {
							await chatClient.say(channel, `${user}, Im online and working correctly`);
							// const tbd = await userApiClient.streams.getStreamByUserId(broadcasterID?.id);
						}
						break;
					default:
						chatClient.say(channel, `${user}, Only a mod or the broadcaster can use this command`);
						break;
				}
			}
			if (command === 'quote' && channel === '#canadiendragon') {
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
					case '#canadiendragon':
						try {
							if (staff) {
								const setTitle = await userApiClient.channels.updateChannelInfo(canadiendragon?.id!, { 'title': `${args.join(' ')}` }); // Channel ID:'31124455'
								chatClient.say(channel, `${display}, has updated the channel title to ${canadiendragon?.title}`);
								const commandEmbed = new EmbedBuilder()
									.setTitle('Command Used')
									.setColor('Red')
									.addFields([
										{
											name: 'Command Executer: ',
											value: `\`${msg.userInfo.displayName}\``,
											inline: true
										},
										{
											name: 'New Title: ',
											value: `\`${canadiendragon?.title}\``,
											inline: true
										}
									])
									.setFooter({ text: `Channel: ${channel.replace('#', '')}` })
									.setTimestamp();
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
					case '#canadiendragon':
						if (staff) {
							const gamename = await userApiClient.games.getGameByName(args.join(' '));
							const setGame = await userApiClient.channels.updateChannelInfo(broadcasterID?.id!, { gameId: `${gamename?.id}` });
							chatClient.say(channel, `channel game has been updated to ${gamename?.name}`);
							const commandEmbed = new EmbedBuilder()
								.setTitle('Command Used')
								.setColor('Red')
								.addFields([
									{
										name: 'Command Executer: ',
										value: `\`${msg.userInfo.displayName}\``,
										inline: true
									},
									{
										name: 'New Category:',
										value: `\`Gamename: ${gamename?.name}\`, \n||\`GameID: ${gamename?.id}\`||`,
										inline: true
									}
								])
								.setFooter({ text: `Channel: ${channel.replace('#', '')}` })
								.setTimestamp();
							console.log(`${gamename?.name}: ${gamename?.id}`);
						} else {
							chatClient.say(channel, `${display}, you are not a moderator or the broadcaster you do not have access to these commands, please run /commands to find out what commands you can use.`);
						}
						break;
					}
			}
			if (command === 'game') {
				switch (channel) {
					case '#canadiendragon':
						chatClient.say(channel, `${display}, ${broadcasterID?.displayName} is currently playing ${broadcasterID?.gameName}`);
						break;
				}
			}
			if (command === 'lurk' && channel === '#canadiendragon') {
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
			if (command === 'id' && channel === '#canadiendragon') { // Mod Twitch ID- 204831754
				chatClient.say(channel, `${display} your TwitchId is ${msg.userInfo.userId}`);
			}
			if (command === 'followage' && channel === '#canadiendragon') {// cant tag someone to found out when they created there account.
				if (msg.channelId === null) return;
				// const follow = await apiClient.channels.getChannelFollowers(userId, userId, msg.channelId);
				const follow = await apiClient.users.getFollowFromUserToBroadcaster(msg.userInfo.userId, msg.channelId);
				if (follow) {
					const followStartTimestamp = follow.followDate.getTime();
					chatClient.say(channel, `@${display} You have been following for ${countdown(new Date(followStartTimestamp))}!`);
				}
				else {
					chatClient.say(channel, `@${display} You are not following!`);
				}
			}
			if (command === 'accountage' && channel === '#canadiendragon') {// cant tag someone to found out when they created there account.
				const account = await apiClient.users.getUserByName(args[0] || msg.userInfo.userName);
				if (account) {
					chatClient.say(channel, `${account.creationDate}`);
				} else {
					chatClient.say(channel, `${user}, that name could not be found`);
				}
			}
			if (command === 'uptime') {
				const stream = await userApiClient.streams.getStreamByUserId(broadcasterID?.id!);
				switch (channel) {
					case '#canadiendragon':
						if (stream) {
							const uptime = countdown(new Date(stream.startDate));
							chatClient.say(channel, `${display}, the stream has been live for ${uptime}`);
						}
						else {
							return chatClient.say(channel, 'the Stream is currently Offline');
						}
						break;
				}
			}
			if (command === 'dadjoke' && channel === '#canadiendragon') {
				const response = await axios.get('https://icanhazdadjoke.com/', {
					headers: {
						'Accept': 'application/json',
						'User-Agent': 'Personal Twitch ChatBot (https://github.com/canadiendragon/skulledbotTwitch)'
					}
				});
				chatClient.say(channel, `${response.data.joke}`);
			}
			if (command === 'games' && channel === '#canadiendragon') {
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
			if (command === 'warframe' && channel === '#canadiendragon') {
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
						const xblWFRank = 11;
						const ps4WFRank = 16;
						chatClient.say(channel, `Mastery Rank: XBOX: ${xblWFRank}, PS4: ${ps4WFRank}`);
						break;
					default:
						chatClient.say(channel, `${display}, Usage: -warframe [about, lore, rank]`);
						break;
				}
			}
			if (command === 'vigor' && channel === '#canadiendragon') {
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
					case '#canadiendragon':
						if (staff) {
							const modCommands = ['ping', 'settitle', 'setgame', 'mod', 'game', 'lurk', 'id', 'followage', 'accountage', 'uptime', 'dadjoke', 'games', 'warframe', 'vigor', 'me', 'socials'];
							chatClient.say(channel, `${display}, Commands for this channel are ${modCommands.join(', ')}`);
						} else {
							const commands = ['game', 'lurk', 'id', 'followage', 'accountage', 'uptime', 'dadjoke', 'games', 'warframe', 'vigor', 'me', 'socials'];
							chatClient.say(channel, `${display}, Commands for this channel are ${commands.join(', ')}`);
						}
						break;
					default:
						chatClient.say(channel, 'There are no registered Commands for this channel');
						break;
				}
			}
			if (command === 'me' && channel === '#canadiendragon') {
				let target = args[0];
				let action = ['slaps', 'kisses', 'hugs', 'punches', 'suckerPunches', 'kicks', 'pinches', 'uppercuts'];
				let randomNumber = action[Math.floor(Math.random() * action.length)];

				if (!args[0]) return chatClient.say(channel, `${display}, you must tag someone to use this command`);
				chatClient.say(channel, `${display}, ${randomNumber} ${target}`);
			}
			if (command === 'so' && channel === '#canadiendragon') {
				if (staff) {
					chatClient.say(channel, 'please run the -mod command');
				}
				else { return; }
			}
			if (command === 'mod' && channel === '#canadiendragon') {
				if (staff) {
					switch (args[0]) {
						case 'vip':
							// if (await apiClient.moderation.getModerators(channel) === args[1]) return console.log(channel, 'that person is a higer rank then VIP and can not be assigned this role');
							// if (await chatClient.getVips(channel) === args[1]) return chatClient.say(channel, 'this user is already a vip or higher');
							if (!args[1]) return await chatClient.say(channel, `${display}, Usage: -mod vip @name`);
							try {
								const addVIP = await apiClient.channels.addVip(userId, args[1]);
								// await chatClient.addVip(channel, args[1].replace('@', '')).catch((err: any) => { console.error(err); }); {
								// 	chatClient.say(channel, `@${args[1].replace('@', '')} has been upgraded to VIP`);
								// }
								const vipEmbed = new EmbedBuilder()
									.setTitle('Twitch Channel VIP Event')
									.setAuthor({ name: `${args[1].replace('@', '')}` })
									.setColor('Red')
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
								await userApiClient.channels.removeVip(userId, args[1].replace('@', ''));
								// await chatClient.removeVip(channel, args[1].replace('@', '')).catch((err: any) => { console.error(err); }); {
								// 	chatClient.say(channel, `@${args[1].replace('@', '')} has been removed from VIP status`);
								// }
								await chatClient.say(channel, `@${args[1].replace('@', '')} has been removed from VIP status`);
								const vipEmbed = new EmbedBuilder()
									.setTitle('Twitch Channel VIP REMOVE Event')
									.setAuthor({ name: `${args[1].replace('@', '')}` })
									.setColor('Red')
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
								await userApiClient.moderation.addModerator(userId, args[1].replace('@', ''));
								await chatClient.say(channel, `@${args[1]} has been givin the Moderator Powers`);

								const moderatorEmbed = new EmbedBuilder()
									.setTitle('Twitch Channel MOD Event')
									.setAuthor({ name: `${args[1].replace('@', '')}` })
									.setColor('Green')
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
								await userApiClient.moderation.removeModerator(userId, args[1].replace('@', ''));
								await chatClient.say(channel, `${args[1]} has had there moderator powers removed`);

								const unModeratorEmbed = new EmbedBuilder()
									.setTitle('Twitch Channel UNMOD Event')
									.setAuthor({ name: `${args[1].replace('@', '')}` })
									.setColor('Red')
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
							if (!args[2]) return chatClient.say(channel, `${display}, please specify a duration in seconds to purge texts`);
							if (!args[3]) args[3] = 'No Reason Provided';
							try {
								await apiClient.moderation.banUser(userId, userId, {
									user: args[1],
									reason: args[3],
									duration: Number(args[2]),
								});
								const purgeEmbed = new EmbedBuilder()
									.setTitle('Twitch Channel Purge Event')
									.setAuthor({ name: `${msg.userInfo.userName}` })
									.setColor('Red')
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
									await apiClient.moderation.banUser(userId, userId, {
										user: args[1].replace('@', ''),
										reason: args[2],
									});
									await chatClient.say(channel, `@${args[1].replace('@', '')} has been banned for Reason: ${args[2]}`);
									const banEmbed = new EmbedBuilder()
										.setTitle('Twitch Channel Ban Event')
										.setAuthor({ name: `${args[1].replace('@', '')}` })
										.setColor('Red')
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
							const mods = await userApiClient.moderation.getModerators(userId);
							if (!args[1]) return chatClient.say(channel, 'you must specify a person to shotout, Usage: -mod shoutout|so @name');
							if (args[1] === undefined) return;
							const tbd = await apiClient.chat.shoutoutUser(userId, args[1].replace('@', ''), userId);
							const user = await apiClient.users.getUserByName(args[1].replace('@', ''));
							if (user === null) return;
							const gameLastPlayed = await apiClient.channels.getChannelInfoById(user?.id);
							await chatClient.say(channel, `go check out @${args[1].replace('@', '')}, there an awesome streamer Check them out here: https://twitch.tv/${args[1].replace('@', '').toLowerCase()} last seen playing ${gameLastPlayed?.gameName}`);
							break;
						default:
							chatClient.say(channel, 'you must specify which mod action you want to do, Usage: -mod vip|unvip|purge|shoutout|ban|unban');
							break;
					}
				} else {
					chatClient.say(channel, `${display} you must be a mod or the broadcastor to use this command`);
				}
			}
			if (command === 'socials' && channel === '#canadiendragon') {
				switch (args[0]) {
					case 'instagram':
						chatClient.say(channel, `${display}, canadiendragon's Instagram: https://instagram.com/canadiendragon`);
						break;
					case 'snapchat':
						chatClient.say(channel, `${display}, canadiendragon's Snapchat: https://snapchat.com/add/canadiendragon`);
						break;
					case 'facebook':
						chatClient.say(channel, `${display}, canadiendragon's Facebook: canadiendragon Entertainment`);
						break;
					case 'tictok':
						chatClient.say(channel, `${display}, canadiendragon's Tik-Tok: https://tiktok.com/@canadiendragon`);
						break;
					case 'discord':
						chatClient.say(channel, `${display}, canadiendragon's Discord: https://discord.gg/7AHcU4pQFF`);
						break;
					case 'youtube':
						chatClient.say(channel, `${display}, canadiendragon's Gaming YouTube Channel: https://www.youtube.com/channel/UCaJPv2Hx2-HNwUOCkBFgngA mostly just holds twitch archives`);
						break;
					case 'twitter':
						chatClient.say(channel, `${display}, canadiendragon's Twitter: https://twitter.com/canadiendragon`);
						break;
					case 'merch':
						const merch = 'https://canadiendragon-merch.creator-spring.com/';
						chatClient.say(channel, `${display}, The new merch is here, Would Appreciate it if you checked it out ${merch}`);
						break;
					case 'tip':
						const tipping = 'https://overlay.expert/celebrate/canadiendragon';
						chatClient.say(channel, `@${display}, you can help out the stream by tipping here: ${tipping}, NOTE: tips are NOT expected BUT very much appreacated, all tips go back into the stream wither it be upgrades for the stream or new games for you to watch.`);
						break;
					default:
						chatClient.say(channel, 'Which social are you looking for?, Usage: -socials twitter|instagram|snapchat|facebook|tictok|discord|merch|tip');
						break;
				}
			}
		} else {
			if (text.includes('overlay expert') && channel === '#canadiendragon') {
				chatClient.say(channel, `${display}, Create overlays and alerts for your @Twitch streams without OBS or any streaming software. For support, see https://github.com/overlay-expert/help-desk/issues/1`);
			}
			if (text.includes('overlay designer') && channel === '#canadiendragon') {
				chatClient.say(channel, `${display}, are you an overlay designer and want to make money from them check out https://overlay.expert/designers, all information should be listed on that page for you to get started.`);
			}
			if (text.includes('wl') && channel === '#canadiendragon') {
				const amazon = 'https://www.amazon.ca/hz/wishlist/ls/354MPD0EKWXZN?ref_=wl_share';
				setTimeout(() => {
					chatClient.say(channel, `check out the Wish List here if you would like to help out the stream ${amazon}`);
				}, 1800000);
			}
			if (text.includes('Want to become famous?') && channel === '#canadiendragon') {
				apiClient.moderation.banUser(userId, userId, { user: msg.userInfo.userId, reason: 'Promoting selling followers to a broadcaster for twitch' });
				apiClient.moderation.deleteChatMessages(userId, userId, msg.id);
				chatClient.say(channel, `${display} bugger off with your scams and frauds, you have been removed from this channel, have a good day`);
			}
		}
	});
}