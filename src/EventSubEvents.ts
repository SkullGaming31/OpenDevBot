import { EventSubWsListener } from '@twurple/eventsub-ws';
import { config } from 'dotenv';
import { randomInt } from 'node:crypto';
import { EmbedBuilder, WebhookClient } from 'discord.js';
config();

import { ApiClient, UserIdResolvable } from '@twurple/api/lib';
import { lurkingUsers } from './Commands/Information/lurk';
import { getUserApi } from './api/userApiClient';
import { getChatClient } from './chat';
import { LurkMessageModel } from './database/models/LurkModel';
import { createChannelPointsRewards } from './misc/channelPoints';
import { PromoteWebhookID, PromoteWebhookToken, TwitchActivityWebhookID, TwitchActivityWebhookToken, broadcasterInfo, moderatorID } from './util/constants';
import { sleep } from './util/util';


export async function initializeTwitchEventSub(): Promise<void> {
	const userApiClient = await getUserApi();
	const eventSubListener = await getEventSubs();
	const chatClient = await getChatClient();

	//#region DiscordWebhooks
	const LIVE = new WebhookClient({ id: PromoteWebhookID, token: PromoteWebhookToken });
	const twitchActivity = new WebhookClient({ id: TwitchActivityWebhookID, token: TwitchActivityWebhookToken });
	//#endregion

	await createChannelPointsRewards(false);

	// eventSub Stuff
	if (broadcasterInfo === undefined) return;
	if (moderatorID === undefined) return;

	//#region ChannelPoints
	const shoutoutUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterInfo?.id, '27716a8a-496d-4b94-b727-33be94b81611', {
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
		prompt: 'Mute Headset Sounds untel you tell me i can put them back on or encounter ends!',
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
	const discordUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterInfo?.id, '88a92e0f-4199-4bc8-b555-76d70856b5a4', {
		title: 'Discord',
		cost: 1,
		autoFulfill: true,
		backgroundColor: '#d0080a',
		globalCooldown: 300,
		isEnabled: true,
		maxRedemptionsPerUserPerStream: null,
		maxRedemptionsPerStream: null,
		prompt: 'click for a link to my Discord Server',
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
		isEnabled: false,
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
	const NBJ = await userApiClient.channelPoints.updateCustomReward(broadcasterInfo?.id, 'a9396656-be55-40f9-b46f-e5e97fd2bf14', {
		title: 'No Bullet Jumping',
		cost: 600,
		autoFulfill: false,
		backgroundColor: '#32CD32',
		globalCooldown: 60,
		isEnabled: false,
		maxRedemptionsPerUserPerStream: null,
		maxRedemptionsPerStream: null,
		prompt: 'Not aloud to bullet jump in warframe for a full mission',
		userInputRequired: false
	});
	//#endregion


	//#region EventSub
	const online = eventSubListener.onStreamOnline(broadcasterInfo.id, async (o) => {
		const stream = await o.getStream();
		const userInfo = await o.getBroadcaster();

		const liveEmbed = new EmbedBuilder()
			.setTitle('Twitch Event[NOW LIVE]')
			.setAuthor({ name: `${o.broadcasterName}`, iconURL: `${userInfo.profilePictureUrl}`})
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
			await userApiClient.chat.sendAnnouncement(broadcasterInfo?.id as UserIdResolvable, { color: 'green', message: `${o.broadcasterDisplayName} has just gone live playing ${broadcasterInfo?.gameName}- (${stream?.title})` });
			await sleep(60000);
			await LIVE.send({ content: '@everyone', embeds: [liveEmbed] });
		} catch (err: unknown) {
			console.error('Error sending going live post', err);
		}
	});
	const offline = eventSubListener.onStreamOffline(broadcasterInfo.id, async (stream) => {
		const userInfo = await stream.getBroadcaster();

		const offlineEmbed = new EmbedBuilder()
			.setAuthor({ name: `${userInfo.displayName}`, iconURL: `${userInfo.profilePictureUrl}`})
			.setDescription(`${stream.broadcasterDisplayName} has gone offline, thank you for stopping by!`)
			.setColor('Red')
			.setFooter({ text: 'Ended Stream at '})
			.setTimestamp();

		try {
			await sleep(2000);
			await userApiClient.chat.sendAnnouncement(broadcasterInfo?.id as UserIdResolvable, { color: 'primary', message: `${stream.broadcasterDisplayName} has gone offline, thank you for stopping by!` });
			await sleep(2000);
			await LIVE.send({ embeds: [offlineEmbed] });
			await sleep(2000);
			if (broadcasterInfo?.name) {
				chatClient.say(broadcasterInfo.name, 'dont forget you can join the Guilded Server too, https://guilded.gg/canadiendragon');
			}
			lurkingUsers.length = 0; // Clear the lurkingUsers array by setting its length to 0
			await LurkMessageModel.deleteMany({});// Clear all messages from the MongoDB collection
		} catch (error) {
			console.error(error);
		}
	});
	const redeem = eventSubListener.onChannelRedemptionAdd(broadcasterInfo.id, async (cp) => {
		const userInfo = await cp.getUser();
		const streamer = await cp.getBroadcaster();
		console.log(`${cp.userDisplayName}: Reward Name: ${cp.rewardTitle}, rewardId: ${cp.rewardId}`);
		// const reward = await userApiClient.channelPoints.getRedemptionById(broadcasterInfo?.id!, `${cp.rewardId}`, `${cp.id}`);
		switch (cp.rewardTitle || cp.rewardId) {
			case 'Shoutout':
				try {
					if (broadcasterInfo) {
						const stream = await userApiClient.streams.getStreamByUserName(broadcasterInfo.name);
						const userSearch = await userApiClient.users.getUserByName(userInfo.name);
						if (userSearch?.id === undefined) return;
						if (stream !== null) { await userApiClient.chat.shoutoutUser(broadcasterInfo.id, userSearch?.id); }
						await chatClient.say(broadcasterInfo.name, `@${cp.userDisplayName} has redeemed a shoutout, help them out by giving them a follow here: https://twitch.tv/${userInfo.name.toLowerCase()}, last seen playing: ${stream?.gameName}`);
					}
				} catch (error) {
					console.error('Error executing shoutout:', error);
				}
				break;
			case 'Tip':
				const tipEmbed = new EmbedBuilder()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}`})
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
							name: 'DragonFire Coins',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setURL(`https://twitch.tv/${userInfo.name}`)
					.setFooter({ text: 'Click the event name to go to the Redeemers Twitch Channel', iconURL: `${userInfo.profilePictureUrl}`})
					.setTimestamp();
				try {
					if (broadcasterInfo) { await chatClient.say(broadcasterInfo.name, `@${cp.broadcasterDisplayName}'s Tipping Page: https://overlay.expert/celebrate/canadiendragon`); }
					await twitchActivity.send({ embeds: [tipEmbed] });
				} catch (error) {
					console.error(error);
				}
				break;
			case 'Twitter':
				console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}, rewardId: ${cp.rewardId}`);
				const twitterEmbed = new EmbedBuilder()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}`})
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
							name: 'DragonFire Coins',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setURL(`https://twitch.tv/${userInfo.name}`)
					.setFooter({ text: 'Click the event name to go to the Redeemers Twitch Channel', iconURL: `${userInfo.profilePictureUrl}`})
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
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}`})
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
							name: 'DragonFire Coins',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: 'DragonFire Lair', iconURL: `${userInfo.profilePictureUrl}`})
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
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}`})
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
							name: 'DragonFire Coins',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: 'DragonFire Lair', iconURL: `${userInfo.profilePictureUrl}`})
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
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}`})
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
							name: 'DragonFire Coins',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: 'DragonFire Lair', iconURL: `${userInfo.profilePictureUrl}`})
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
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}`})
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
							name: 'DragonFire Coins',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: 'DragonFire Lair', iconURL: `${userInfo.profilePictureUrl}`})
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
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}`})
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
							name: 'DragonFire Coins',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: 'DragonFire Lair', iconURL: `${userInfo.profilePictureUrl}`})
					.setTimestamp();
				try {
					if (broadcasterInfo) { await chatClient.say(broadcasterInfo.name, `@${cp.broadcasterDisplayName}'s Facebook: https://facebook.com/gaming/SkullGaming8461`); }
					await twitchActivity.send({ embeds: [facebookEmbed] });
				} catch (error) {
					console.error(error);
				}
				break;
			case 'Discord':
				const discordEmbed = new EmbedBuilder()
					.setTitle('Twitch Event[REDEEM (Discord)]')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}`})
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
							name: 'DragonFire Coins',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setURL(`https://twitch.tv/${userInfo.name}`)
					.setFooter({ text: 'Click the event name to go to the Redeemers Twitch Channel', iconURL: `${userInfo.profilePictureUrl}`})
					.setTimestamp();
				try {
					if (broadcasterInfo) { await chatClient.say(broadcasterInfo.name, `@${cp.broadcasterDisplayName}'s Discord Server: https://discord.com/invite/6TGV75sDjW`); }
				} catch (error) {
					console.error(error);
				}
				await twitchActivity.send({ embeds: [discordEmbed] });
				break;
			case 'Merch':
				console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
				const merchEmbed = new EmbedBuilder()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}`})
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
							name: 'DragonFire Coins',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setURL(`https://twitch.tv/${userInfo.name}`)
					.setFooter({ text: 'Click the event name to go to the Redeemers Twitch Channel', iconURL: `${userInfo.profilePictureUrl}`})
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
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}`})
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
							name: 'DraonFire Coins',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: `${cp.broadcasterDisplayName}`, iconURL: `${userInfo.profilePictureUrl}`})
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
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}`})
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
							name: 'DragonFire Coins',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: `${cp.broadcasterDisplayName}`, iconURL: `${userInfo.profilePictureUrl}`})
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
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}`})
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
							name: 'DragonFire Coins',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: 'DragonFire Lair', iconURL: `${userInfo.profilePictureUrl}`})
					.setTimestamp();

				try {
					if (broadcasterInfo) { await chatClient.say(broadcasterInfo.name, `${cp.broadcasterDisplayName} you should not be listening to game sounds right now`); }
					await twitchActivity.send({ embeds: [muteheadsetEmbed] });
				} catch (error) {
					console.error(error);
				}
				break;
			case 'IRLWordBan':
				// console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
				const irlwordbanEmbed = new EmbedBuilder()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}`})
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
							name: 'DragonFire Coins',
							value: `${cp.rewardCost}`,
							inline: true
						},
						{
							name: 'Banned Word',
							value: `${cp.input.toLowerCase()}`,
							inline: false
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: 'DragonFire Lair', iconURL: `${userInfo.profilePictureUrl}`})
					.setTimestamp();
				try {
					if (broadcasterInfo) { await chatClient.say(broadcasterInfo.name, `@${cp.userDisplayName} has redeemed ${cp.rewardTitle} and has ban the word ${cp.input.toLowerCase()}`); }
					await twitchActivity.send({ embeds: [irlwordbanEmbed] });
				} catch (error) {
					console.log(error);
				}
				break;
			case 'IRLVoiceBan':
				const irlvoicebanEmbed = new EmbedBuilder()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}`})
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
							name: 'DragonFire Coins',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: 'DraagonFire Lair', iconURL: `${userInfo.profilePictureUrl}`})
					.setTimestamp();
				try {
					if (broadcasterInfo) { chatClient.say(broadcasterInfo.name, `@${cp.broadcasterDisplayName} SHHHHHH why are you still talking right now`); }
					await twitchActivity.send({ embeds: [irlvoicebanEmbed] });
				} catch (error) {
					console.error(error);
				}
				break;
			case 'Ban an in-game action':
				const baningameactionEmbed = new EmbedBuilder()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}`})
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
							name: 'DragonFire Coins',
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
					.setFooter({ text: 'DragonFire Lair', iconURL: `${userInfo.profilePictureUrl}`})
					.setTimestamp(cp.redemptionDate);
				try {
					if (broadcasterInfo) { chatClient.say(broadcasterInfo.name, `${cp.userDisplayName} has redeemed Ban an In-Game Action, Action:${cp.input}`); }
					await twitchActivity.send({ embeds: [baningameactionEmbed] });
				} catch (error) {
					console.error(error);
				}
				break;
			case 'No Bullet Jumping':
				const nbjEmbed = new EmbedBuilder()
					.setTitle('REDEEM EVENT')
					.setAuthor({ name: `${cp.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}`})
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
							name: 'DragonFire Coins',
							value: `${cp.rewardCost}`,
							inline: true
						}
					])
					.setThumbnail(`${streamer.profilePictureUrl}`)
					.setFooter({ text: 'DragonFire Lair', iconURL: `${userInfo.profilePictureUrl}`})
					.setTimestamp(cp.redemptionDate);
				try {
					if (broadcasterInfo) { chatClient.say(broadcasterInfo?.name, 'No Bullet Jumping for you'); }
					await twitchActivity.send({ embeds: [nbjEmbed] });
				} catch (error) {
					console.error(error);
				}
				break;
			default:
				console.log(`${cp.userName} has attempted to redeem ${cp.rewardTitle}, ID: ${cp.id} thats not coded in yet`);
				if (broadcasterInfo)
					// await chatClient.say(broadcasterInfo?.name, `@${cp.userName} has activated a channel points item and it hasnt been coded in yet`);
					break;
		}
	});
	const hypeEventStart = eventSubListener.onChannelHypeTrainBegin(broadcasterInfo.id, async (hts) => {
		const userInfo = await hts.getBroadcaster();
		console.log(`Listening but no messages setup, ${hts.goal} to reach the next level of the Hype Train`);
		chatClient.say(userInfo.name, `${hts.goal} to reach the next level of the Hype Train, Last Contributer: ${hts.lastContribution}`);
	});
	const hypeEventEnd = eventSubListener.onChannelHypeTrainEnd(broadcasterInfo.id, async (hte) => { // needs to be tested, progress and start to be done after end has been tested and it works!
		const userInfo = await hte.getBroadcaster();
		console.log(`HypeTrain End Event Ending, Total Contrubtion:${hte.total}, Total Level:${hte.level}`);
		chatClient.say(userInfo.name, `${hte.topContributors} have contributed to the HypeTrain`);

		const hypeeventendEmbed = new EmbedBuilder()
			.setTitle('Twitch Event[HypeTrainEND]')
			.setAuthor({ name: `${userInfo.displayName}`, iconURL: `${userInfo.profilePictureUrl}`})
			// .setColor('Random')
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
			.setFooter({ text: 'DragonFire Lair', iconURL: `${userInfo.profilePictureUrl}`})
			.setTimestamp();
		await twitchActivity.send({ embeds: [hypeeventendEmbed.toJSON()] });
	});
	const hypeTrainProgress = eventSubListener.onChannelHypeTrainProgress(broadcasterInfo.id, async (htp) => {
		const userInfo = await htp.getBroadcaster();
		chatClient.say(userInfo.name, `HypeTrain Level:${htp.level}, Latest Contributer:${htp.lastContribution}, HypeTrain Progress:${htp.progress}`);
	});
	const giftedSubs = eventSubListener.onChannelSubscriptionGift(broadcasterInfo.id, async (gift) => {
		// console.log(broadcasterInfo.name, `${gift.gifterDisplayName} has just gifted ${gift.amount} ${gift.tier} subs to ${gift.broadcasterName}, they have given a total of ${gift.cumulativeAmount} Subs to the channel`);
		const userInfo = await gift.getGifter();
		chatClient.say(userInfo.name, `${gift.gifterDisplayName} has just gifted ${gift.amount} ${gift.tier} subs to ${gift.broadcasterName}, they have given a total of ${gift.cumulativeAmount} Subs to the channel`);

		const giftedSubs = new EmbedBuilder()
			.setTitle('Twitch Event[GIFTED SUB]')
			.setDescription(`gifted to ${gift.broadcasterDisplayName}`)
			.setAuthor({ name: `${gift.gifterDisplayName}`, iconURL: `${userInfo.profilePictureUrl}`})
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
			// .setColor('Random')
			.setFooter({ text: 'DragonFire Lair', iconURL: `${userInfo.profilePictureUrl}`})
			.setTimestamp();
		await twitchActivity.send({ embeds: [giftedSubs.toJSON()] });
	});
	const resub = eventSubListener.onChannelSubscriptionMessage(broadcasterInfo.id, async (s) => {
		const userInfo = await s.getUser();
		const resubEmbed = new EmbedBuilder()
			.setTitle('Twitch Event[RESUB]')
			.setAuthor({ name: `${s.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}`})
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
			.setFooter({ text: 'DragonFire Lair', iconURL: `${userInfo.profilePictureUrl}`})
			.setTimestamp();
		try {
			// await twitchActivity.send({ embeds: [resubEmbed] });
			await chatClient.say(userInfo.name, `${s.userDisplayName} has resubbed to the channel for ${s.cumulativeMonths} Months, currently on a ${s.streakMonths} streak, ${s.messageText}`);
		} catch (error) {
			console.error(error);
		}
	});
	const follow = eventSubListener.onChannelFollow(broadcasterInfo.id as UserIdResolvable, broadcasterInfo.id as UserIdResolvable, async (e) => {
		try {
			const userInfo = await e.getUser();
			if (!broadcasterInfo) { return console.error('broadcasterInfo is undefined'); }
			const stream = await userApiClient.channels.getChannelInfoById(broadcasterInfo.id as UserIdResolvable);
			const isDescriptionEmpty = userInfo.description === '';

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
						`Avast, @${e.userDisplayName}! Prepare to chart a course through perilous waters and uncover the secrets of the Sea of Thieves. Welcome aboard, matey!`
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
					name: 'Starfield',
					gameId: '506438',
					followerMessages: [
						`In the vastness of the cosmos, we follow you, ${e.userDisplayName}, just like in Starfield.`,
						`Our journey through the stars continues, ${e.userDisplayName}, just like in the game Starfield.`,
						`Exploring the unknown, together with you, ${e.userDisplayName}, inspired by Starfield.`,
						`To infinity and beyond, with you as our guide, ${e.userDisplayName}, much like in Starfield.`,
						`Navigating the cosmic mysteries with you, ${e.userDisplayName}, echoing the spirit of Starfield`,
						`Welcome to the cosmic crew, ${e.userDisplayName}! Together, we explore the stars like true adventurers in Starfield.`
					]
				},
				{
					name: 'Rust',
					gameId: '263490',
					followerMessages: [
						`🪓 Welcome to the crew, ${e.userDisplayName}! Grab your pickaxe, we're about to gather some serious resources together! 💎🌲`,
						`🏠 Hey ${e.userDisplayName}! Thanks for joining our community. Let's build the strongest virtual base on Twitch! 🚧🔨`,
						`🌐 Welcome to the tribe, ${e.userDisplayName}! Get ready to survive and thrive in the wild world of Twitch Rust. 🛡️⚔️`,
						`🛠️ Shoutout to ${e.userDisplayName} for the follow! Time to craft some legendary moments together. 🔧✨`,
						`Howdy, ${e.userDisplayName}! Your follow is like finding a barrel of loot in the wilderness. Let's explore Twitch together! 🌄🔍`,
						`🚀 Welcome ${e.userDisplayName} to our radiation - free Twitch zone! No hazmat suits required, just good vibes and gaming. 🎮😄`,
						`⚔️ A salute to ${e.userDisplayName} for joining the ranks! Together, we'll conquer the challenges of Rust. 🛡️🌐`,
						`🚧 Hey ${e.userDisplayName}! Your follow is like laying a foundation. Let's build something epic on Twitch! 🏰🛠️`,
						`🏛️ Welcome, ${e.userDisplayName}! Just like exploring a Rust monument, our journey together is full of surprises. Let's uncover the mysteries of Twitch! 🔍🌐`,
						`⚔️ ${e.userDisplayName}, gear up! Your follow just armed us for the next raid. Together, we'll conquer Twitch like raiding a rival base in Rust! 💣🚁`
					]
				},
				{
					name: '7 Days To Die',
					gameId: '271304',
					followerMessages: [
						`Survivor ${e.userDisplayName}, welcome to the apocalypse. May your aim be steady and your fortifications strong!`,
						`Greetings, ${e.userDisplayName}! In the harsh world of 7 Days to Die, every ally counts. Welcome!`,
						`Brace yourself, ${e.userDisplayName}. The undead are relentless, but together we shall prevail!`,
						`Welcome, ${e.userDisplayName!} Let's gather resources and build our haven in this forsaken land!`,
						`In the land of the undead, ${e.userDisplayName}, your survival instincts will be your greatest asset. Welcome!`,
						`Stay sharp, ${e.userDisplayName}! The night is dark and full of terrors. Welcome to the world of 7 Days to Die!`,
						`Welcome to the survivor's club, ${e.userDisplayName}. Let's fortify and prepare for the horrors that await!`,
						`Survival is a team effort, ${e.userDisplayName}. Thanks for joining us in the fight against the undead!`,
						`The apocalypse is tough, but with you here, ${e.userDisplayName}, we stand a better chance. Welcome!`,
						`Welcome, ${e.userDisplayName}! Let's craft, scavenge, and survive in the brutal world of 7 Days to Die!`
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
				const defaultMessages = followerRandomMessages.find((obj) => obj.name === 'default');
				if (defaultMessages) {
					messages = defaultMessages.followerMessages;
				} else {
					console.error('Default messages not found.');
					messages = [];
				}
			}
			const randomIndex = randomInt(0, messages.length);
			const randomMessage = messages[randomIndex];

			const followEmbed = new EmbedBuilder()
				.setTitle('Twitch Event[Follow]')
				.setAuthor({ name: `${e.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}`})
				.setDescription(`${randomMessage}`)
				.addFields([
					{
						name: 'Twitch User: ',
						value: `${userInfo.displayName} just Followed the channel`,
						inline: true
					},
				])
				.setThumbnail(`${userInfo.profilePictureUrl}`)
				// .setColor('Green')
				.setFooter({ text: 'DragonFire Lair', iconURL: `${userInfo.profilePictureUrl}`})
				.setTimestamp();

			if (!isDescriptionEmpty) { console.log(`Users Channel Description: ${userInfo.description}`); }

			await chatClient.say(broadcasterInfo.name, `${randomMessage}`);
			await twitchActivity.send({ embeds: [followEmbed.toJSON()] });
		} catch (error) {
			console.error('An error occurred in the follower event handler:', error);
		}
	});
	const subs = eventSubListener.onChannelSubscription(broadcasterInfo.id, async (s) => {
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
			.setTitle('Twitch Event[NEW SUB]')
			.setAuthor({ name: userInfo.name, iconURL: userInfo.profilePictureUrl})
			.addFields([
				{ name: 'Sub Tier ', value: s.tier },
				{ name: 'Gifted ', value: `${s.isGift}` }
			])
			.setURL(`https://twitch.tv/${userInfo.name.toLowerCase()}`)
			.setTimestamp();
		try {
			await chatClient.say(broadcasterInfo?.id!, `${s.userName} has Subscribed to the channel with a tier ${s.tier} Subscription`);
			// await twitchActivity.send({ embeds: [subEmbed] });
		} catch (error) {
			console.error(error);
		}
	});
	const cheer = eventSubListener.onChannelCheer(broadcasterInfo.id, async (cheer) => {
		const userInfo = await cheer.getUser();
		if (cheer.bits >= 100) {
			const cheerEmbed = new EmbedBuilder()
				.setTitle('Twitch Event[CHEER]')
				.setAuthor({ name: `${userInfo?.displayName}`, iconURL: `${userInfo?.profilePictureUrl}`})
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
				.setFooter({ text: 'DragonFire Lair', iconURL: `${userInfo?.profilePictureUrl}`})
				.setTimestamp();
			try {
				await chatClient.say(broadcasterInfo?.id!, `${cheer.userDisplayName} has cheered ${cheer.bits} bits`);
				await twitchActivity.send({ embeds: [cheerEmbed.toJSON()] });
			} catch (error) {
				console.error(error);
			}
		}
	});
	const raidToListener = eventSubListener.onChannelRaidTo(broadcasterInfo.id, async (raidToEvent) => {
		try {
			console.log('Raid To Event:', raidToEvent);
			const raidedBroadcaster = await raidToEvent.getRaidedBroadcaster();
			const raidingBroadcaster = await raidToEvent.getRaidingBroadcaster();

			const raidEmbed = new EmbedBuilder()
				.setTitle('Raid Initiated!')
				// .setColor('Purple') // Adjust color as needed
				.setAuthor({ name: `You (as ${raidingBroadcaster.displayName})`, iconURL: raidingBroadcaster.profilePictureUrl})
				.addFields([
					{ name: 'Raided Channel:', value: `[${raidedBroadcaster.displayName}](https://twitch.tv/${raidedBroadcaster.displayName.toLowerCase()})`, inline: false },
					{ name: 'Viewers:', value: `${raidToEvent.viewers} viewers`, inline: false },
				])
				.setTimestamp();

			await twitchActivity.send({ embeds: [raidEmbed.toJSON()] });
		} catch (error) {
			console.error('Error sending raid notification to Discord:', error);
		}
	});
	const raidFromListener = eventSubListener.onChannelRaidFrom(broadcasterInfo.id, async (raidEvent) => {
		try {
			console.log('Raid Data: ', raidEvent);

			const raidedBroadcaster = await raidEvent.getRaidedBroadcaster(); // You (the broadcaster)
			const raidingBroadcaster = await raidEvent.getRaidingBroadcaster(); // User raiding you

			const raidEmbed = new EmbedBuilder()
				.setTitle('Twitch Event [RAID]')
				// .setColor('Green')
				.setAuthor({ name: raidingBroadcaster.displayName, iconURL: raidingBroadcaster.profilePictureUrl})
				.addFields([
					{ name: 'Raided By: ', value: raidingBroadcaster.displayName, inline: true },
					{ name: 'Viewer Count: ', value: `${raidEvent.viewers} Viewers`, inline: true },
				])
				.setURL(`https://twitch.tv/${raidingBroadcaster.displayName.toLowerCase()}`)
				.setThumbnail(raidedBroadcaster.profilePictureUrl) // You (the broadcaster)
				.setFooter({ text: 'DragonFire Lair', iconURL: raidingBroadcaster.offlinePlaceholderUrl})
				.setTimestamp();

			const raidMessage = `${raidEvent.raidedBroadcasterDisplayName} has raided the channel with ${raidEvent.viewers} viewers!`;
			await chatClient.say(broadcasterInfo?.id!, raidMessage);

			await twitchActivity.send({ embeds: [raidEmbed.toJSON()] });

			await sleep(3000); // Consider adjusting delay based on needs

			await userApiClient.chat.shoutoutUser(broadcasterInfo?.id!, raidingBroadcaster.name);
		} catch (error) {
			console.error(error);
		}
	});
	const goalBeginning = eventSubListener.onChannelGoalBegin(broadcasterInfo.id, async (gb) => {
		const userInfo = await gb.getBroadcaster();
		console.log(`${userInfo.displayName}, current ${gb.type} goal: ${gb.currentAmount} - ${gb.targetAmount}`);
		// if (moderatorID?.id === undefined) return;
		// if (broadcasterInfo?.id === undefined) return;
		switch (gb.type) {
			case 'follow':
				console.log(`${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`);
				await chatClient.say(userInfo.name, `${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`);
				await userApiClient.chat.sendAnnouncement(broadcasterInfo?.id as UserIdResolvable, { color: 'purple', message: `${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}` }).catch((err) => { console.error(err); });
				break;
			case 'subscription':
				console.log(`${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`);
				await chatClient.say(userInfo.name, `${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`);
				await userApiClient.chat.sendAnnouncement(broadcasterInfo?.id as UserIdResolvable, { color: 'purple', message: `${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}` }).catch((err) => { console.error(err); });
				break;
			// case 'subscription_count':
			// 	console.log(`${gb.type}`);
			// 	break;
			// case 'new_subscription_count':
			// 	console.log(`${gb.type}`);
			// 	break;
			// case 'new_subscription':
			// 	console.log(`${gb.type}`);
			// 	break;
			default:
				console.log(`Default Case hit for: ${gb.type}`);
				break;
		}
	});
	const goalProgress = eventSubListener.onChannelGoalProgress(broadcasterInfo.id, async (gp) => {
		const userInfo = await gp.getBroadcaster();
		setTimeout(() => {
			console.log(`${userInfo.displayName} ${gp.type} Goal, ${gp.currentAmount} - ${gp.targetAmount}`);
		}, 60000);
		await chatClient.say(userInfo.name, `${userInfo.displayName} ${gp.type} Goal, ${gp.currentAmount} - ${gp.targetAmount}`);
	});
	const goalEnded = eventSubListener.onChannelGoalEnd(broadcasterInfo.id, async (ge) => {
		const userInfo = await ge.getBroadcaster();
		console.log(`${userInfo.displayName}, ${ge.currentAmount} - ${ge.targetAmount} Goal Started:${ge.startDate} Goal Ended: ${ge.endDate}`);
		if (broadcasterInfo) { await chatClient.say(broadcasterInfo?.name, `${userInfo.displayName}, ${ge.currentAmount} - ${ge.targetAmount} Goal Started:${ge.startDate} Goal Ended: ${ge.endDate}`); }
	});
	const subscriptionCreateSuccess = eventSubListener.onSubscriptionCreateSuccess((subscription) => {
		const Enviroment = process.env.Enviroment as string;
		if (Enviroment === 'debug') {
			console.log(`(CS)SubscriptionID: ${subscription.id}, SubscriptionAuthUserId: ${subscription.authUserId}`);
		}
	});
	const subscriptionCreateFailure = eventSubListener.onSubscriptionCreateFailure((subscription, error) => {
		const Enviroment = process.env.Enviroment as string;
		if (Enviroment === 'debug') {
			console.log(`(CF){SubscriptionID: ${subscription.id}, SubscriptionAuthUserId: ${subscription.authUserId}`, error);
		}
	});
	const subscriptionDeleteSuccess = eventSubListener.onSubscriptionDeleteSuccess((subscription) => {
		const Enviroment = process.env.Enviroment as string;
		if (Enviroment === 'debug') {
			console.log(`(DS){SubscriptionID: ${subscription.id}, SubscriptionAuthUserId: ${subscription.authUserId}`);
		}
	});
	const subscriptionDeleteFailure = eventSubListener.onSubscriptionDeleteFailure((subscription, error) => {
		const Enviroment = process.env.Enviroment as string;
		if (Enviroment === 'debug') {
			console.log(`(DF){SubscriptionID: ${subscription.id}, SubscriptionAuthUserId: ${subscription.authUserId}`, error);
		}
	});
	let previousTitle: string = '';
	let previousCategory: string = '';

	const channelUpdates = eventSubListener.onChannelUpdate(broadcasterInfo.id, async (event) => {
		const { streamTitle, categoryName } = event;
		const chatClient = await getChatClient();

		// Check if the title has changed
		if (streamTitle !== previousTitle) {
			// Display a chat message with the updated stream title
			await chatClient.say(event.broadcasterName, `Stream title has been updated: ${streamTitle}`);
			previousTitle = streamTitle; // Update the previous title
			return; // Exit the function to prevent displaying the category
		}

		// Check if the category has changed
		if (categoryName !== previousCategory) {
			// Display a chat message with the updated stream category
			await chatClient.say(event.broadcasterName, `Stream category has been updated: ${categoryName}`);
			previousCategory = categoryName; // Update the previous category
			return;
		}
	});
	//#endregion
}

let eventSubListenerPromise: Promise<EventSubWsListener> | null = null;
export async function getEventSubs(): Promise<EventSubWsListener> {
	if (!eventSubListenerPromise) {
		eventSubListenerPromise = createEventSubListener();
		// (await eventSubListenerPromise).on('', () => {});
	}
	return eventSubListenerPromise;
}
async function createEventSubListener(): Promise<EventSubWsListener> {
	const userApiClient: ApiClient = await getUserApi();
	const eventSubListener = new EventSubWsListener({ apiClient: userApiClient, logger: { minLevel: 'ERROR' } });
	eventSubListener.start();
	return eventSubListener;
}