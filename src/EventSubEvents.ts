import { EventSubWsListener } from '@twurple/eventsub-ws';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { config } from 'dotenv';
import { randomInt } from 'node:crypto';
config();

import { lurkingUsers } from './Commands/Information/lurk';
import { getUserApi } from './api/userApiClient';
import { getChatClient } from './chat';
import { LurkMessageModel } from './database/models/LurkModel';
import { createChannelPointsRewards } from './misc/channelPoints';
import { PromoteWebhookID, PromoteWebhookToken, TwitchActivityWebhookID, TwitchActivityWebhookToken, broadcasterInfo, moderatorID, userID } from './util/constants';
import { generateRandomPirateName } from './util/randomFunctions';
import { sleep } from './util/util';

export async function initializeTwitchEventSub(): Promise<void> {
	const userApiClient = await getUserApi();
	const eventSubListener = await getEventSubs();
	const chatClient = await getChatClient();

	//#region Webhooks
	const LIVE = new WebhookClient({ id: PromoteWebhookID, token: PromoteWebhookToken });
	const twitchActivity = new WebhookClient({ id: TwitchActivityWebhookID, token: TwitchActivityWebhookToken });
	//#endregion

	const isDevEnvironment = process.env.NODE_ENV === 'dev';

	if (isDevEnvironment) {
		try {
			await userApiClient.eventSub.deleteAllSubscriptions();
			console.log('All Subscriptions Deleted!');
		} catch (error) {
			console.error(error);
		}
	}
	await createChannelPointsRewards(false);

	// eventSub Stuff
	if (broadcasterInfo === undefined) return;
	if (moderatorID === undefined) return;
	// console.log('broadcasters ID: ', broadcasterInfo?.id);
	// console.log('Moderator ID: ', moderatorID.id);
	
	//#region ChannelPoints
	// const shoutoutUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterInfo?.id, 'ad2a5d3f-b3fa-47a6-a362-95e19329b6ca', {
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
	const Hydrate = await userApiClient.channelPoints.updateCustomReward(broadcasterInfo?.id, 'c033cf9f-28a5-4cd4-86d9-7e48158c83a5', {
		title: 'Hydrate',
		cost: 250,
		autoFulfill: true,
		backgroundColor: '#09CB4C',
		globalCooldown: 60,
		isEnabled: true,
		maxRedemptionsPerUserPerStream: null,
		maxRedemptionsPerStream: null,
		prompt: 'Make me take a sip of whatever im drinking!',
		userInputRequired: false
	});
	const DropController = await userApiClient.channelPoints.updateCustomReward(broadcasterInfo?.id, '652b2b71-5903-47bf-bf8c-076a28a1cafc', {
		title: 'DropController',
		cost: 1000,
		autoFulfill: true,
		backgroundColor: '#09CB4C',
		globalCooldown: 60,
		isEnabled: true,
		maxRedemptionsPerUserPerStream: null,
		maxRedemptionsPerStream: null,
		prompt: 'put down the controller for 15 seconds!',
		userInputRequired: false
	});
	const IRLVoiceBan = await userApiClient.channelPoints.updateCustomReward(broadcasterInfo?.id, '9b59a9d9-69eb-4570-a3df-07080ed21761', {
		title: 'IRLVoiceBan',
		cost: 1500,
		autoFulfill: true,
		backgroundColor: '#09CB4C',
		globalCooldown: 60,
		isEnabled: true,
		maxRedemptionsPerUserPerStream: null,
		maxRedemptionsPerStream: null,
		prompt: 'I can\'t say anything for the next 3 minutes!',
		userInputRequired: false
	});
	const IRLWordBan = await userApiClient.channelPoints.updateCustomReward(broadcasterInfo?.id, '1bab3478-f2cc-447e-94f4-8de2a28ad975', {
		title: 'IRLWordBan',
		cost: 1500,
		autoFulfill: true,
		backgroundColor: '#09CB4C',
		globalCooldown: 30,
		isEnabled: true,
		maxRedemptionsPerUserPerStream: null,
		maxRedemptionsPerStream: null,
		prompt: 'What Word can i not say for 5 minutes!',
		userInputRequired: true
	});
	const MUTEHeadset = await userApiClient.channelPoints.updateCustomReward(broadcasterInfo?.id, 'e148d22c-f104-4d5b-9941-8097f79f9179', {
		title: 'MUTEHeadset',
		cost: 2000,
		autoFulfill: true,
		backgroundColor: '#09CB4C',
		globalCooldown: 60,
		isEnabled: true,
		maxRedemptionsPerUserPerStream: null,
		maxRedemptionsPerStream: null,
		prompt: 'Mute Headset Sounds for 5 minutes!',
		userInputRequired: false
	});
	const twitterUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterInfo?.id, '90693245-492f-48ea-8cae-1b13c699ffc9', {
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
	const instagramUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterInfo?.id, 'e054cc48-edc4-4c01-96d7-856edc9c39b6', {
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
	const tiktokUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterInfo?.id, '3fa8d533-0d6d-47a3-b1c5-280f1bfb2895', {
		title: 'TikTok',
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
	const discordUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterInfo?.id, '3d9e67e4-85fa-4c50-9e7f-8a78afd1bf67', {
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
	const facebookUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterInfo?.id, '6dc38904-bf3a-42ae-bb42-01b0d805707b', {
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
	const youtubeUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterInfo?.id, '71192c7c-8055-453a-a726-3b095319fed3', {
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
	const snapchatUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterInfo?.id, '5c18b145-5824-4c8c-9419-4c0b4f52f489', {
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
	const merchUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterInfo?.id, 'cd77cc2a-94c9-41e8-8143-8b68d68b4b13', {
		title: 'Merch',
		cost: 1,
		autoFulfill: true,
		backgroundColor: '#d0080a',
		globalCooldown: 30,
		isEnabled: false,
		maxRedemptionsPerUserPerStream: null,
		maxRedemptionsPerStream: null,
		prompt: 'click for a link to my Merch Shop',
		userInputRequired: false
	});
	const tipUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterInfo?.id, 'faa9bdc4-ef09-4a32-9e9b-4d2ae84a576f', {
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
	const Baningameaction = await userApiClient.channelPoints.updateCustomReward(broadcasterInfo?.id, 'ab17d121-b5b7-4df1-94b0-9f2864292e63', {
		title: 'Ban an in-game action',
		cost: 1500,
		autoFulfill: false,
		backgroundColor: '#d0080a',
		globalCooldown: 5,
		isEnabled: true,
		maxRedemptionsPerUserPerStream: null,
		maxRedemptionsPerStream: null,
		prompt: 'Ban an In-Game Action while playing a game only!',
		userInputRequired: true
	});
	//#endregion

	
	//#region EventSub
	const online = eventSubListener.onStreamOnline(broadcasterInfo.id, async (o: { getStream: () => any; getBroadcaster: () => any; broadcasterName: any; broadcasterDisplayName: any; }) => {
		const chatClient = await getChatClient();
		const stream = await o.getStream();
		const userInfo = await o.getBroadcaster();
		
		const liveEmbed = new EmbedBuilder()
			.setTitle('GONE LIVE')
			.setAuthor({ name: `${o.broadcasterName}`, iconURL: `${userInfo.profilePictureUrl}` })
			.addFields([
				{
					name: 'Stream Title',
					value: `${stream?.title || 'No Title Set'}`,
					inline: true
				},
				{
					name: 'game: ',
					value: `${stream?.gameName || 'No Game Set'}`,
					inline: true
				},
				{
					name: 'Viewers: ',
					value: `${stream?.viewers || 0}`,
					inline: true
				},
			])
			.setURL(`https://twitch.tv/${userInfo.name}`)
			.setColor('Green')
			.setTimestamp();

		try {
			if (stream?.thumbnailUrl) { liveEmbed.setImage(`${stream.thumbnailUrl}`); }
			if (userInfo.profilePictureUrl) { liveEmbed.setThumbnail(userInfo.profilePictureUrl); }
			
			await sleep(60000);
			await userApiClient.chat.sendAnnouncement(userID, userID, { color: 'green', message: `${o.broadcasterDisplayName} has just gone live playing ${broadcasterInfo?.gameName} with ${stream?.viewers} viewers.` });
			// await chatClient.say(broadcasterInfo.name, `${o.broadcasterDisplayName} has just gone live playing ${broadcasterInfo?.gameName} with ${stream?.viewers} viewers.`);
			await sleep(60000);
			await LIVE.send({ content: '@everyone', embeds: [liveEmbed] });
		} catch (err: any) {
			console.error(err);
		}
	});
	const offline = eventSubListener.onStreamOffline(broadcasterInfo.id, async (stream: { getBroadcaster: () => any; broadcasterDisplayName: any; }) => {
		const userInfo = await stream.getBroadcaster();
		const offlineEmbed = new EmbedBuilder()
			.setAuthor({ name: `${userInfo.displayName}`, iconURL: `${userInfo.profilePictureUrl}` })
			.setDescription(`${stream.broadcasterDisplayName} has gone offline, thank you for stopping by!`)
			.setColor('Red')
			.setFooter({ text: 'Ended Stream at ' })
			.setTimestamp();
		try {
			await sleep(2000);
			await userApiClient.chat.sendAnnouncement(userID, userID, { color: 'primary', message: `${stream.broadcasterDisplayName} has gone offline, thank you for stopping by!` });
			await sleep(2000);
			await LIVE.send({ embeds: [offlineEmbed] });
			await sleep(2000);
			if (broadcasterInfo?.name) { chatClient.say(broadcasterInfo.name, 'dont forget you can join the discord too, https://discord.com/invite/dHpehkD6M3'); }
			lurkingUsers.length = 0; // Clear the lurkingUsers array by setting its length to 0
			await LurkMessageModel.deleteMany({});// Clear all messages from the MongoDB collection
		} catch (error) {
			console.error(error);
		}
	});
	const redeem = eventSubListener.onChannelRedemptionAdd(broadcasterInfo.id, async (cp: { getUser: () => any; getBroadcaster: () => any; rewardTitle: any; rewardId: any; userDisplayName: any; rewardCost: any; broadcasterDisplayName: any; userName: any; input: string; getReward: () => any; redemptionDate: number | Date | null | undefined; }) => {
		const userInfo = await cp.getUser();
		const streamer = await cp.getBroadcaster();
		// console.log(`${cp.userDisplayName}: Reward Name: ${cp.rewardTitle}, rewardId: ${cp.rewardId}, broadcasterInfo: ${cp.id}`);
		// const reward = await userApiClient.channelPoints.getRedemptionById(broadcasterInfo, `${cp.rewardId}`, `${cp.id}`);
		switch (cp.rewardTitle || cp.rewardId) {
		case 'ShoutOut':
			try {
				if (broadcasterInfo) {
					const stream = await userApiClient.streams.getStreamByUserName(broadcasterInfo.name);
					const userSearch = await userApiClient.users.getUserByName(userInfo.name);
					if (userSearch?.id === undefined) return;
					if (stream !== null) {
						await userApiClient.chat.shoutoutUser(broadcasterInfo.id, userSearch?.id, broadcasterInfo.id);
					}
					await chatClient.say(
						broadcasterInfo.name,
						`@${cp.userDisplayName} has redeemed a shoutout, help them out by giving them a follow here: https://twitch.tv/${userInfo.name.toLowerCase()}, last seen playing: ${stream?.gameName}`
					);
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
								value: `${stream?.gameName}`,
								inline: true
							},
							{
								name: 'Cost: ',
								value: `${cp.rewardCost} skulls`,
								inline: true
							}
						])
						.setThumbnail(`${userInfo.profilePictureUrl}`)
						.setURL(`https://twitch.tv/${userInfo.name.toLowerCase()}`)
						.setFooter({ text: 'Click the event name to go to the Redeemers Twitch Channel', iconURL: `${userInfo.profilePictureUrl}` })
						.setTimestamp();
					await twitchActivity.send({ embeds: [shoutoutEmbed] });
				}
			} catch (error) {
				console.error('Error executing shoutout:', error);
			}
			
			break;
		case 'Tip':
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
			try {
				if (broadcasterInfo) { await chatClient.say(broadcasterInfo.name, `@${cp.broadcasterDisplayName}'s Tipping Page: https://overlay.expert/celebrate/canadiendragon`); }
				twitchActivity.send({ embeds: [tipEmbed] });
			} catch (error) {
				console.error(error);
			}
			break;
		case 'Twitter':
			console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}, rewardId: ${cp.rewardId}`);
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
			try {
				if (broadcasterInfo) { await chatClient.say(broadcasterInfo.name, `@${cp.broadcasterDisplayName}'s Twitter: https://twitter.com/canadiendragon`); }
				await twitchActivity.send({ embeds: [twitterEmbed] });
			} catch (error) {
				console.error(error);
			}
			break;
		case 'Instagram':
			console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
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
			try {
				if (broadcasterInfo) { await chatClient.say(broadcasterInfo.name, `@${cp.broadcasterDisplayName}'s Instagram: https://instagram.com/canadiendragon`); }
			} catch (error) {
				console.error(error);
			}
			await twitchActivity.send({ embeds: [instagramEmbed] });
			break;
		case 'YouTube':
			console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
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
			try {
				if (broadcasterInfo) { await chatClient.say(broadcasterInfo.name, `@${cp.broadcasterDisplayName}'s YouTube: https://youtube.com/channel/UCUHnQESlc-cPkp_0KvbVK6g`); }
				await twitchActivity.send({ embeds: [youtubeEmbed] });
			} catch (error) {
				console.error(error);
			}
			break;
		case 'TikTok':
			console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
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
			try {
				if (broadcasterInfo) { await chatClient.say(broadcasterInfo.name, `@${cp.broadcasterDisplayName}'s Tic-Tok: https://tiktok.com/@canadiendragon`); }
				await twitchActivity.send({ embeds: [tiktokEmbed] });
			} catch (error) {
				console.error(error);
			}
			break;
		case 'Snapchat':
			console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
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
			try {
				if (broadcasterInfo) { await chatClient.say(broadcasterInfo.name, `@${cp.broadcasterDisplayName}'s Snapchat: https://snapchat.com/add/canadiendragon`); }
				await twitchActivity.send({ embeds: [snapchatEmbed] });
			} catch (error) {
				console.error(error);
			}
			break;
		case 'Facebook':
			console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
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
			try {
				if (broadcasterInfo) { await chatClient.say(broadcasterInfo.name, `@${cp.broadcasterDisplayName}'s Facebook: https://facebook.com/gaming/SkullGaming8461`); }
				await twitchActivity.send({ embeds: [facebookEmbed] });
			} catch (error) {
				console.error(error);
			}
			break;
		case 'Discord':
			console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
			const discordEmbed = new EmbedBuilder()
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
			try {
				if (broadcasterInfo) { await chatClient.say(broadcasterInfo.name, `@${cp.broadcasterDisplayName}'s Discord: https://discord.com/invite/dHpehkD6M3`); }
			} catch (error) {
				console.error(error);
			}
			await twitchActivity.send({ embeds: [discordEmbed] });
			break;
		case 'Merch':
			console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
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
			try {
				if (broadcasterInfo) { await chatClient.say(broadcasterInfo.name, `@${cp.broadcasterDisplayName}'s Merch: https://canadiendragon-merch.creator-spring.com`); }
				await twitchActivity.send({ embeds: [merchEmbed] });
			} catch (error) {
				console.error(error);
			}
			break;
		case 'Hydrate':
			// console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
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
				.setFooter({ text: 'LevelUp Legends Lounge', iconURL: `${userInfo.profilePictureUrl}` })
				.setTimestamp();
			try {
				if (broadcasterInfo) { await chatClient.say(broadcasterInfo.name, `@${cp.broadcasterDisplayName}'s, you must stay hydrated, take a sip of whatever your drinking.`); }
				await twitchActivity.send({ embeds: [hydrateEmbed] });
			} catch (error) {
				console.log(error);
			}
			break;
		case 'DropController':
			// console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
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
			try {
				if (broadcasterInfo) { await chatClient.say(broadcasterInfo.name, `@${cp.broadcasterDisplayName} Put down that controller for 30 seconds`); }
				await twitchActivity.send({ embeds: [dropcontrollerEmbed] });
			} catch (error) {
				console.error(error);
			}
			break;
		case 'MUTEHeadset':
			console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
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

			try {
				if (broadcasterInfo) { await chatClient.say(broadcasterInfo.name, `${cp.broadcasterDisplayName} you should not be listening to game sounds right now`); }
				await twitchActivity.send({ embeds: [muteheadsetEmbed] });
			} catch (error) {
				console.error(error);
			}
			break;
		case 'IRLWordBan':
			console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
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
			try {
				if (broadcasterInfo) { await chatClient.say(broadcasterInfo.name, `@${cp.userDisplayName} has redeemed ${cp.rewardTitle} and has ban the word ${cp.input.toUpperCase()}`); }
				await twitchActivity.send({ embeds: [irlwordbanEmbed] });
			} catch (error) {
				console.log(error);
			}
			break;
		case 'IRLVoiceBan':
			console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);

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
			try {
				if (broadcasterInfo) { chatClient.say(broadcasterInfo.name, `@${cp.broadcasterDisplayName} SHHHHHH why are you still talking right now`); }
				await twitchActivity.send({ embeds: [irlvoicebanEmbed] });
			} catch (error) {
				console.error(error);
			}
			break;
		case 'Ban an in-game action':
			console.log(`${cp.rewardTitle} has been redeemed by ${cp.userDisplayName}, ${cp.input}`);
			const tbd = await cp.getReward();

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
					},
					{
						name: 'Input',
						value: `${cp.input}`,
						inline: false
					}
				])
				.setThumbnail(`${streamer.profilePictureUrl}`)
				.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
				.setTimestamp(cp.redemptionDate);
			try {
				if (broadcasterInfo) { chatClient.say(broadcasterInfo.name, `${cp.userDisplayName} has redeemed Ban an In-Game Action, Action:${cp.input}`); }
				await twitchActivity.send({ embeds: [baningameactionEmbed] });
			} catch (error) {
				console.error(error);
			}
			break;
		default:
			console.log(`${cp.userName} has attempted to redeem ${cp.rewardTitle} thats not coded in yet`);
			if (broadcasterInfo)
				await chatClient.say(broadcasterInfo?.name, `@${cp.userName} has activated a channel points item and it hasnt been coded in yet`);
			break;
		}
	});
	const hypeEventStart = eventSubListener.onChannelHypeTrainBegin(broadcasterInfo.id, async (hts: { getBroadcaster: () => any; goal: any; lastContribution: any; }) => {
		const userInfo = await hts.getBroadcaster();
		console.log(`Listening but no messages setup, ${hts.goal} to reach the next level of the Hype Train`);
		chatClient.say(userInfo.name, `${hts.goal} to reach the next level of the Hype Train, Last Contributer: ${hts.lastContribution}`);
	});
	const hypeEventEnd = eventSubListener.onChannelHypeTrainEnd(broadcasterInfo.id, async (hte: { getBroadcaster: () => any; total: any; level: any; topContributors: any; startDate: any; }) => { // needs to be tested, progress and start to be done after end has been tested and it works!
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
		await twitchActivity.send({ embeds: [hypeeventendEmbed] });
	});
	const hypeTrainProgress = eventSubListener.onChannelHypeTrainProgress(broadcasterInfo.id, async (htp: { getBroadcaster: () => any; level: any; lastContribution: any; progress: any; }) => {
		const userInfo = await htp.getBroadcaster();
		chatClient.say(userInfo.name, `HypeTrain Level:${htp.level}, Latest Contributer:${htp.lastContribution}, HypeTrain Progress:${htp.progress}`);
	});
	const giftedSubs = eventSubListener.onChannelSubscriptionGift(broadcasterInfo.id, async (gift: { getGifter: () => any; gifterDisplayName: any; amount: any; tier: string; broadcasterName: any; cumulativeAmount: any; broadcasterDisplayName: any; }) => {
		// console.log(broadcasterInfo.name, `${gift.gifterDisplayName} has just gifted ${gift.amount} ${gift.tier} subs to ${gift.broadcasterName}, they have given a total of ${gift.cumulativeAmount} Subs to the channel`);
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
		await twitchActivity.send({ embeds: [giftedSubs] });
	});
	const resub = eventSubListener.onChannelSubscriptionMessage(broadcasterInfo.id, async (s: { getUser: () => any; userDisplayName: any; cumulativeMonths: any; messageText: any; streakMonths: any; }) => {
		const userInfo = await s.getUser();
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
		try {
			await twitchActivity.send({ embeds: [resubEmbed] });
			await chatClient.say(userInfo.name, `${s.userDisplayName} has resubbed to the channel for ${s.cumulativeMonths} Months, currently on a ${s.streakMonths} streak, ${s.messageText}`);
		} catch (error) {
			console.error(error);
		}
	});
	const follow = eventSubListener.onChannelFollow(broadcasterInfo.id, moderatorID?.id, async (e: { getUser: () => any; userDisplayName: any; userName: any; followDate: any; }) => {
		try {
			const userInfo = await e.getUser();
			if (!broadcasterInfo) { return console.error('broadcasterInfo is undefined'); }
			const stream = await userApiClient.channels.getChannelInfoById(broadcasterInfo.id);
			const isDescriptionEmpty = userInfo.description === '';
	
			const pirateName = generateRandomPirateName();
	
			const followerRandomMessages = [
				{
					name: 'Conan Exiles',
					gameId: 493551,
					followerMessages: [
						`We've been waiting for a worthy adventurer like you, @${e.userDisplayName}. Welcome to this perfect place for building friendships and having fun!`, // conan exiles,
						`Survival is in our blood, and we're thrilled to have you join us, @${e.userDisplayName}. Welcome!`, // conan exiles,
						`The gods themselves will be pleased with your arrival, @${e.userDisplayName}. Welcome to our community!`,// conan exiles,
						`The sands of our chat will drink the blood of our enemies together, @${e.userDisplayName}. Welcome!`, // conan exiles
						`You are an exile no more, @${e.userDisplayName}. Welcome to the lands of adventure!`,// conan exiles
					]
				}, 
				{
					name: 'Vigor',
					gameId: 506489,
					followerMessages: [
						`Welcome to Vigor, @${e.userDisplayName}. Your journey starts here.`,
						`@${e.userDisplayName}, welcome to the harsh yet beautiful world of Vigor. May you survive and thrive!`,
						`Greetings, @${e.userDisplayName}. In Vigor, you must always stay alert and trust no one. Welcome to the challenge!`,
						`@${e.userDisplayName}, welcome to the Outlands. May your weapons stay sharp and your aim true!`,
						`Welcome to the Stream, @${e.userDisplayName}. Remember: your decisions here will determine your survival. Choose wisely!`
					]
				},
				{
					name: 'Science & Technolgy',
					gameId: 509670,
					followerMessages: [
						`Welcome to the world of coding, @${e.userDisplayName}. Let's create amazing things with the power of code!`,
						`Greetings, @${e.userDisplayName}. In coding, we turn ideas into reality through the art of programming. Welcome to the journey!`,
						`Step into the realm of coding, @${e.userDisplayName}. Here, we write, debug, and optimize. Welcome to the world of code!`,
						`Welcome to the world of coding, @${e.userDisplayName}. Where the only limit is your imagination. Let's write some awesome code together!`,
						`@${e.userDisplayName}, welcome to the world of logic and algorithms. Let's explore the fascinating world of coding together!`
					]
				},
				{
					name: 'Sea of Thieves',
					gameId: 490377,
					followerMessages: [
						`Welcome aboard, @${e.userDisplayName}. Let's set sail and seek our fortunes on the high seas of Sea of Thieves!`,
						`Ahoy, @${e.userDisplayName}! You've joined a crew of swashbucklers and rogues on a quest for treasure. Welcome to Sea of Thieves!`,
						`@${e.userDisplayName}, welcome to the pirate's life. Get ready for adventure, danger, and plenty of rum!`,
						`Hoist the sails and batten down the hatches, @${e.userDisplayName}. You're now part of the Sea of Thieves crew. Welcome!`,
						`Ahoy, @${e.userDisplayName}! Let's pillage and plunder our way to riches on the high seas. Welcome to Sea of Thieves!`,
						`Ahoy, @${e.userDisplayName}! Get ready to sail across the vast seas, i shall call thee, ${pirateName}`
					]
				},
				{
					name: 'Space Engineers',
					gameId: 391475,
					followerMessages: [
						`Welcome aboard, @${e.userDisplayName}! Prepare for an out-of-this-world experience in Space Engineers.`,
						`Attention, space enthusiasts! @${e.userDisplayName} has joined the crew. Let's embark on a thrilling journey through the cosmos.`,
						`Greetings, @${e.userDisplayName}! Get ready to engineer your way to the stars and beyond in Space Engineers. Let's build a universe together.`,
						`Welcome to the stream, @${e.userDisplayName}! Prepare to witness the marvels of space exploration and the endless possibilities of Space Engineers.`,
						`Calling all aspiring astronauts! @${e.userDisplayName} has joined the mission. Let's launch into an epic adventure in Space Engineers.`,
						`Attention, stargazers! @${e.userDisplayName} is here to explore the vast depths of space with us in Space Engineers. Join the cosmic odyssey!`
					]
				},
				{
					name: 'DayZ',
					gameId: 65632,
					followerMessages: [
						`Survivor ${e.userDisplayName}, welcome to the unforgiving world of DayZ. May your wits be sharp and your aim true.`,
						`Prepare yourself, ${e.userDisplayName}, for a journey of survival and perseverance in the post-apocalyptic wasteland. Welcome to DayZ.`,
						`Step cautiously, ${e.userDisplayName}, as you enter the land where trust is scarce and danger lurks around every corner. Welcome to the realm of DayZ.`,
						`Embrace the challenge, ${e.userDisplayName}, as you join the ranks of those who struggle to survive. Welcome to the relentless world of DayZ.`,
						`In the realm of DayZ, ${e.userDisplayName}, every decision matters. Trust no one and fight for your survival. Welcome to the chaos.`,
						`Brace yourself, ${e.userDisplayName}, for the raw and immersive experience that awaits you in DayZ. Welcome, survivor, to this unforgiving journey.`
					]
				},
				{
					name: 'default',// if no coded messages for a specific game it will default to this array of follow messages
					followerMessages: [
						`@${e.userDisplayName} has followed the channel`,
						`@${e.userDisplayName} has joined the army and entered the barracks`,
						`Brace yourself, @${e.userDisplayName} has followed`,
						`HEY! LISTEN! @${e.userDisplayName} has followed`,
						`We've been expecting you @${e.userDisplayName}`,
						`@${e.userDisplayName} just followed, quick everyone look busy`,
						`Challenger Approaching - @${e.userDisplayName} has followed`,
						`Welcome @${e.userDisplayName}, stay awhile and listen`,
						`@${e.userDisplayName} has followed, it's super effective`,
						`@${e.userDisplayName} has joined the party! Let's rock and roll!`,
						`Looks like @${e.userDisplayName} is ready for an adventure! Welcome to the team!`,
						`The hero we need has arrived! Welcome, @${e.userDisplayName}!`,
						`@${e.userDisplayName} has leveled up! Welcome to the next stage of the journey!`,
						`It's dangerous to go alone, @${e.userDisplayName}. Take this warm welcome!`,
						`Welcome to the battlefield, @${e.userDisplayName}. Let's conquer together!`,
					]
				},
			];
			let messages: string[] = [];
	
			const game = followerRandomMessages.find((obj) => obj.name === stream?.gameName);
			if (game) {
				messages = game.followerMessages;
			} else {
				messages = followerRandomMessages.find((obj) => obj.name === 'default')!.followerMessages;
			}
			// const randomMessage = messages[Math.floor(Math.random() * messages.length)];
			const randomIndex = randomInt(0, messages.length);
			const randomMessage = messages[randomIndex];
		
			if (!isDescriptionEmpty) { console.log(`Users Channel Description: ${userInfo.description}`); }
		
			const subed = await userInfo.isSubscribedTo(broadcasterInfo?.id) ? 'yes' : 'no';
		
			const followEmbed = new EmbedBuilder()
				.setTitle('FOLLOW EVENT')
				.setAuthor({ name: e.userDisplayName, iconURL: userInfo.profilePictureUrl })
				.setDescription(userInfo.description)
				.setURL(`https://twitch.tv/${e.userName}`)
				.setColor('Random')
				.addFields([
					{
						name: 'Account Created: ',
						value: `${userInfo.creationDate}`,
						inline: true
					},
					{
						name: 'Follow Date: ',
						value: `${e.followDate}`,
						inline: true
					},
					{
						name: 'Subscribed: ',
						value: `${subed}`,
						inline: true
					}
				])
				.setThumbnail(userInfo.profilePictureUrl)
				.setFooter({ text: 'Click Title to check out their channel', iconURL: userInfo.profilePictureUrl })
				.setTimestamp();
	
	
			await chatClient.say(broadcasterInfo.name, `${randomMessage}`);
			await twitchActivity.send({ embeds: [followEmbed] });
		} catch (error) {
			console.error('An error occurred in the follow event handler:', error);
		}
	});
	const subs = eventSubListener.onChannelSubscription(broadcasterInfo.id, async (s: { getUser: () => any; tier: any; isGift: any; userName: any; }) => {
		const userInfo = await s.getUser();
		let subTier;
		switch (s.tier) {
		case '1000':
			subTier = '1';
			break;
		case '2000':
			subTier = '2';
			break;
		case '3000':
			subTier = '3';
			break;
		default:
			subTier = 'Unknown';
			break;
		}
		const subEmbed = new EmbedBuilder()
			.setTitle('NEW SUB')
			.setAuthor({ name: userInfo.name, iconURL: userInfo.profilePictureUrl })
			.addFields([
				{ name: 'Sub Tier ', value: s.tier },
				{ name: 'Gifted ', value: `${s.isGift}` }
			])
			.setURL(`https://twitch.tv/${userInfo.name.toLowerCase()}`)
			.setTimestamp();
		try {
			await chatClient.say(broadcasterInfo?.id!, `${s.userName} has Subscribed to the channel with a tier ${s.tier} Subscription`);
			await twitchActivity.send({ embeds: [subEmbed] });
		} catch (error) {
			console.error(error);
		}
	});
	const cheer = eventSubListener.onChannelCheer(broadcasterInfo.id, async (cheer: { getUser: () => any; bits: number; message: any; userDisplayName: any; }) => {
		const userInfo = await cheer.getUser();
		if (cheer.bits >= 100) {
			const cheerEmbed = new EmbedBuilder()
				.setTitle('CHEER EVENT')
				.setAuthor({ name: `${userInfo?.displayName}`, iconURL: `${userInfo?.profilePictureUrl}` })
				.addFields([
					{
						name: 'Username: ',
						value: `${userInfo?.displayName}`,
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
				.setFooter({ text: 'Legends Lounge', iconURL: `${userInfo?.profilePictureUrl}` })
				.setTimestamp();
			try {
				await twitchActivity.send({ embeds: [cheerEmbed] });
				await chatClient.say(broadcasterInfo?.id!, `${cheer.userDisplayName} has cheered ${cheer.bits} bits`);
			} catch (error) {
				console.error(error);
			}
		}
	});
	const raid = eventSubListener.onChannelRaidFrom(broadcasterInfo.id, async (raid: { getRaidedBroadcaster: () => any; getRaidingBroadcaster: () => any; viewers: any; raidedBroadcasterDisplayName: any; }) => {
		const raidFrom = await raid.getRaidedBroadcaster();
		const userInfo = await raid.getRaidingBroadcaster();
	
		const raidEmbed = new EmbedBuilder()
			.setTitle('CHANNEL RAID EVENT')
			.setColor('Random')
			.setAuthor({ name: userInfo.displayName, iconURL: userInfo.profilePictureUrl })
			.addFields([
				{
					name: 'Raider: ',
					value: userInfo.displayName,
					inline: true,
				},
				{
					name: 'Viewer Count: ',
					value: `${raid.viewers} Viewers`,
					inline: true,
				},
			])
			.setURL(`https://twitch.tv/${userInfo.name}`)
			.setThumbnail(raidFrom.profilePictureUrl)
			.setFooter({ text: 'LevelUp Legends Lounge', iconURL: userInfo.offlinePlaceholderUrl })
			.setTimestamp();
	
		try {
			await chatClient.say(broadcasterInfo?.id!, `${raid.raidedBroadcasterDisplayName} has raided the channel with ${raid.viewers} viewers!`);
			await twitchActivity.send({ embeds: [raidEmbed] });
			await sleep(1000);
		} catch (error) {
			console.error(error);
		}
	});
	const goalBeginning = eventSubListener.onChannelGoalBegin(broadcasterInfo.id, async (gb: { getBroadcaster: () => any; type: any; currentAmount: any; targetAmount: any; }) => {
		const userInfo = await gb.getBroadcaster();
		console.log(`${userInfo.displayName}, current ${gb.type} goal: ${gb.currentAmount} - ${gb.targetAmount}`);
		if (moderatorID?.id === undefined) return;
		if (broadcasterInfo?.id === undefined) return;
		switch (gb.type) {
		case 'follow':
			console.log(`${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`);
			await chatClient.say(broadcasterInfo?.id, `${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`);
			await userApiClient.chat.sendAnnouncement(broadcasterInfo?.id, moderatorID.id, { color: 'purple', message: `${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}` }).catch((err) => { console.error(err); });
			break;
		case 'subscription':
			console.log(`${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`);
			await chatClient.say(broadcasterInfo?.id, `${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`);
			await userApiClient.chat.sendAnnouncement(broadcasterInfo?.id, moderatorID.id, { color: 'purple', message: `${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}` }).catch((err) => { console.error(err); });
			break;
		case 'subscription_count':
			console.log(`${gb.type}`);
			break;
		case 'new_subscription_count':
			console.log(`${gb.type}`);
			break;
		case 'new_subscription':
			console.log(`${gb.type}`);
			break;
		default:
			console.log(`Default Case hit for: ${gb.type}`);
			break;
		}
	});
	const goalProgress = eventSubListener.onChannelGoalProgress(broadcasterInfo.id, async (gp: { getBroadcaster: () => any; type: any; currentAmount: any; targetAmount: any; }) => {
		const userInfo = await gp.getBroadcaster();
		setTimeout(() => {
			console.log(`${userInfo.displayName} ${gp.type} Goal, ${gp.currentAmount} - ${gp.targetAmount}`);
		}, 60000);
		await chatClient.say(userInfo.name, `${userInfo.displayName} ${gp.type} Goal, ${gp.currentAmount} - ${gp.targetAmount}`);
	});
	const goalEnded = eventSubListener.onChannelGoalEnd(broadcasterInfo.id, async (ge: { getBroadcaster: () => any; currentAmount: any; targetAmount: any; startDate: any; endDate: any; }) => {
		const userInfo = await ge.getBroadcaster();
		console.log(`${userInfo.displayName}, ${ge.currentAmount} - ${ge.targetAmount} Goal Started:${ge.startDate} Goal Ended: ${ge.endDate}`);
		if (broadcasterInfo) { await chatClient.say(broadcasterInfo?.name, `${userInfo.displayName}, ${ge.currentAmount} - ${ge.targetAmount} Goal Started:${ge.startDate} Goal Ended: ${ge.endDate}`); }
	});
	let previousTitle: string = '';
	let previousCategory: string = '';

	const channelUpdates = eventSubListener.onChannelUpdate(userID, async (event: { broadcasterName?: any; streamTitle?: any; categoryName?: any; }) => {
		const { streamTitle, categoryName } = event;
		const chatClient = await getChatClient();

		// Check if the title has changed
		if (streamTitle !== previousTitle) {
			// Display a chat message with the updated stream title
			chatClient.say(event.broadcasterName, `Stream title has been updated: ${streamTitle}`);
			previousTitle = streamTitle; // Update the previous title
			return; // Exit the function to prevent displaying the category
		}

		// Check if the category has changed
		if (categoryName !== previousCategory) {
			// Display a chat message with the updated stream category
			chatClient.say(event.broadcasterName, `Stream category has been updated: ${categoryName}`);
			previousCategory = categoryName; // Update the previous category
			return;
		}
	});
	//#endregion
}

export async function getEventSubs(): Promise<EventSubWsListener> {
	const userApiClient = await getUserApi();
	const eventSubListener = new EventSubWsListener({ apiClient: userApiClient, logger: { minLevel: 'DEBUG' } });
	eventSubListener.start();

	return eventSubListener;
}