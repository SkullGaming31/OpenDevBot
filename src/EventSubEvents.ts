import { EventSubWsListener } from '@twurple/eventsub-ws';
import { config } from 'dotenv';
import { randomInt } from 'node:crypto';
import { EmbedBuilder, WebhookClient } from 'discord.js';
config();

import { ApiClient, HelixPaginatedEventSubSubscriptionsResult, HelixPagination, UserIdResolvable } from '@twurple/api/lib';
import { lurkingUsers } from './Commands/Information/lurk';
import { getUserApi } from './api/userApiClient';
import { getChatClient } from './chat';
import { LurkMessageModel } from './database/models/LurkModel';
import { createChannelPointsRewards } from './misc/channelPoints';
import { PromoteWebhookID, PromoteWebhookToken, TwitchActivityWebhookID, TwitchActivityWebhookToken, broadcasterInfo, moderatorIDs } from './util/constants';
import { sleep } from './util/util';
import { SubscriptionInfo, SubscriptionModel } from './database/models/eventSubscriptions';
import FollowMessage from './database/models/followMessages';


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
	if (broadcasterInfo === undefined || moderatorIDs === undefined) return;

	//#region EventSub
	for (const info of broadcasterInfo) {
		//#region ChannelPoints
		if (info.id as UserIdResolvable === '31124455') {
			const shoutoutUpdate = await userApiClient.channelPoints.updateCustomReward(info.id as UserIdResolvable, '27716a8a-496d-4b94-b727-33be94b81611', {
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
			const Hydrate = await userApiClient.channelPoints.updateCustomReward(info.id as UserIdResolvable, 'c033cf9f-28a5-4cd4-86d9-7e48158c83a5', {
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
			const DropController = await userApiClient.channelPoints.updateCustomReward(info.id as UserIdResolvable, '652b2b71-5903-47bf-bf8c-076a28a1cafc', {
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
			const IRLVoiceBan = await userApiClient.channelPoints.updateCustomReward(info.id as UserIdResolvable, '9b59a9d9-69eb-4570-a3df-07080ed21761', {
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
			const IRLWordBan = await userApiClient.channelPoints.updateCustomReward(info.id as UserIdResolvable, '1bab3478-f2cc-447e-94f4-8de2a28ad975', {
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
			const MUTEHeadset = await userApiClient.channelPoints.updateCustomReward(info.id as UserIdResolvable, 'e148d22c-f104-4d5b-9941-8097f79f9179', {
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
			const instagramUpdate = await userApiClient.channelPoints.updateCustomReward(info.id as UserIdResolvable, 'e054cc48-edc4-4c01-96d7-856edc9c39b6', {
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
			const tiktokUpdate = await userApiClient.channelPoints.updateCustomReward(info.id as UserIdResolvable, '3fa8d533-0d6d-47a3-b1c5-280f1bfb2895', {
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
			const discordUpdate = await userApiClient.channelPoints.updateCustomReward(info.id as UserIdResolvable, '88a92e0f-4199-4bc8-b555-76d70856b5a4', {
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
			const facebookUpdate = await userApiClient.channelPoints.updateCustomReward(info.id as UserIdResolvable, '6dc38904-bf3a-42ae-bb42-01b0d805707b', {
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
			const youtubeUpdate = await userApiClient.channelPoints.updateCustomReward(info.id as UserIdResolvable, '71192c7c-8055-453a-a726-3b095319fed3', {
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
			const snapchatUpdate = await userApiClient.channelPoints.updateCustomReward(info.id as UserIdResolvable, '5c18b145-5824-4c8c-9419-4c0b4f52f489', {
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
			const merchUpdate = await userApiClient.channelPoints.updateCustomReward(info.id as UserIdResolvable, 'cd77cc2a-94c9-41e8-8143-8b68d68b4b13', {
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
			const tipUpdate = await userApiClient.channelPoints.updateCustomReward(info.id as UserIdResolvable, 'faa9bdc4-ef09-4a32-9e9b-4d2ae84a576f', {
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
			const Baningameaction = await userApiClient.channelPoints.updateCustomReward(info.id as UserIdResolvable, 'ab17d121-b5b7-4df1-94b0-9f2864292e63', {
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
			const NBJ = await userApiClient.channelPoints.updateCustomReward(info.id as UserIdResolvable, 'a9396656-be55-40f9-b46f-e5e97fd2bf14', {
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
		}
		//#endregion

		const online = eventSubListener.onStreamOnline(info.id as UserIdResolvable, async (o) => {
			const userApiClient = await getUserApi();
			const stream = await o.getStream();
			const userInfo = await o.getBroadcaster();
	
			try {
				const game = await userApiClient.games.getGameById(stream?.gameId as string);
	
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
					.setImage(`${game?.boxArtUrl}`)
					.setColor('Green')
					.setTimestamp();

				if (stream?.thumbnailUrl) { liveEmbed.setImage(`${stream.thumbnailUrl}`); }
				if (userInfo.profilePictureUrl) { liveEmbed.setThumbnail(userInfo.profilePictureUrl); }

				
				await sleep(60000);
				await userApiClient.chat.sendAnnouncement(info.id  as UserIdResolvable, { color: 'green', message: `${o.broadcasterDisplayName} has just gone live playing ${broadcasterInfo[0].gameName}- (${stream?.title})` });
				if (info.id === '31124455') {
					await sleep(60000);
					await LIVE.send({ content: '@everyone', embeds: [liveEmbed] });
				}
			} catch (err: unknown) {
				console.error('Error sending going live post', err);
			}
		});
		const offline = eventSubListener.onStreamOffline(info.id as UserIdResolvable, async (stream) => {
			const userInfo = await stream.getBroadcaster();
	
			const offlineEmbed = new EmbedBuilder()
				.setAuthor({ name: `${userInfo.displayName}`, iconURL: `${userInfo.profilePictureUrl}`})
				.setDescription(`${stream.broadcasterDisplayName} has gone offline, thank you for stopping by!`)
				.setColor('Red')
				.setFooter({ text: 'Ended Stream at '})
				.setTimestamp();
	
			try {
				await sleep(2000);
				await userApiClient.chat.sendAnnouncement(info.id as UserIdResolvable, { color: 'primary', message: `${stream.broadcasterDisplayName} has gone offline, thank you for stopping by!` });
				await sleep(2000);
				if (info.id === '31124455') {
					await LIVE.send({ embeds: [offlineEmbed] });
					await sleep(2000);
					if (info.name === 'canadiendragon') {
						await chatClient.say(info.name, 'dont forget you can join the Discord Server too, https://discord.com/invite/6TGV75sDjW');
					}
				}
				lurkingUsers.length = 0; // Clear the lurkingUsers array by setting its length to 0
				await LurkMessageModel.deleteMany({});// Clear all messages from the MongoDB collection
			} catch (error) {
				console.error(error);
			}
		});
		const redeem = eventSubListener.onChannelRedemptionAdd(info.id as UserIdResolvable, async (cp) => {
			if (info.id !== '31124455') return;
			const userInfo = await cp.getUser();
			const streamer = await cp.getBroadcaster();
			console.log(`${cp.userDisplayName}: Reward Name: ${cp.rewardTitle}, rewardId: ${cp.rewardId}`);
			// const reward = await userApiClient.channelPoints.getRedemptionById(broadcasterInfo[0].id!, `${cp.rewardId}`, `${cp.id}`);
			switch (cp.rewardTitle || cp.rewardId) {
				case 'Shoutout':
					try {
						if (broadcasterInfo) {
							const stream = await userApiClient.streams.getStreamByUserName(info.name);
							const userSearch = await userApiClient.users.getUserByName(userInfo.name);
							if (userSearch?.id === undefined) return;
							if (stream !== null) { await userApiClient.chat.shoutoutUser(info.id, userSearch?.id); }
							await chatClient.say(broadcasterInfo[0].name, `@${cp.userDisplayName} has redeemed a shoutout, help them out by giving them a follow here: https://twitch.tv/${userInfo.name.toLowerCase()}, last seen playing: ${stream?.gameName}`);
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
						if (broadcasterInfo) { await chatClient.say(broadcasterInfo[0].name, `@${cp.broadcasterDisplayName}'s Tipping Page: https://overlay.expert/celebrate/canadiendragon`); }
						await twitchActivity.send({ embeds: [tipEmbed] });
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
						if (broadcasterInfo) { await chatClient.say(broadcasterInfo[0].name, `@${cp.broadcasterDisplayName}'s Instagram: https://instagram.com/canadiendragon`); }
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
						if (broadcasterInfo) { await chatClient.say(broadcasterInfo[0].name, `@${cp.broadcasterDisplayName}'s YouTube: https://youtube.com/channel/UCUHnQESlc-cPkp_0KvbVK6g`); }
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
						if (broadcasterInfo) { await chatClient.say(broadcasterInfo[0].name, `@${cp.broadcasterDisplayName}'s Tic-Tok: https://tiktok.com/@canadiendragon`); }
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
						if (broadcasterInfo) { await chatClient.say(broadcasterInfo[0].name, `@${cp.broadcasterDisplayName}'s Snapchat: https://snapchat.com/add/canadiendragon`); }
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
						if (broadcasterInfo) { await chatClient.say(broadcasterInfo[0].name, `@${cp.broadcasterDisplayName}'s Facebook: https://facebook.com/gaming/SkullGaming8461`); }
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
						if (broadcasterInfo) { await chatClient.say(broadcasterInfo[0].name, `@${cp.broadcasterDisplayName}'s Discord Server: https://discord.com/invite/6TGV75sDjW`); }
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
						if (broadcasterInfo) { await chatClient.say(broadcasterInfo[0].name, `@${cp.broadcasterDisplayName}'s Merch: https://canadiendragon-merch.creator-spring.com`); }
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
						if (broadcasterInfo) { await chatClient.say(broadcasterInfo[0].name, `@${cp.broadcasterDisplayName}'s, you must stay hydrated, take a sip of whatever your drinking.`); }
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
						if (broadcasterInfo) { await chatClient.say(broadcasterInfo[0].name, `@${cp.broadcasterDisplayName} Put down that controller for 30 seconds`); }
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
						if (broadcasterInfo) { await chatClient.say(broadcasterInfo[0].name, `${cp.broadcasterDisplayName} you should not be listening to game sounds right now`); }
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
						if (broadcasterInfo) { await chatClient.say(broadcasterInfo[0].name, `@${cp.userDisplayName} has redeemed ${cp.rewardTitle} and has ban the word ${cp.input.toLowerCase()}`); }
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
						if (broadcasterInfo) { chatClient.say(broadcasterInfo[0].name, `@${cp.broadcasterDisplayName} SHHHHHH why are you still talking right now`); }
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
						if (broadcasterInfo) { chatClient.say(broadcasterInfo[0].name, `${cp.userDisplayName} has redeemed Ban an In-Game Action, Action:${cp.input}`); }
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
						if (broadcasterInfo) { chatClient.say(broadcasterInfo[0].name, 'No Bullet Jumping for you'); }
						await twitchActivity.send({ embeds: [nbjEmbed] });
					} catch (error) {
						console.error(error);
					}
					break;
				default:
					if (process.env.Enviroment === 'dev' || process.env.Enviroment === 'debug' && cp.broadcasterName === 'canadiendragon') {
						console.log(`${cp.userName} has attempted to redeem ${cp.rewardTitle}, ID: ${cp.id} thats not coded in yet`);
					}
					if (broadcasterInfo)
						// await chatClient.say(broadcasterInfo?.name, `@${cp.userName} has activated a channel points item and it hasnt been coded in yet`);
						break;
			}
		});
		const hypeEventStart = eventSubListener.onChannelHypeTrainBegin(info.id as UserIdResolvable, async (hts) => {
			const userInfo = await hts.getBroadcaster();
			console.log(`Listening but no messages setup, ${hts.goal} to reach the next level of the Hype Train`);
			chatClient.say(userInfo.name, `${hts.goal} to reach the next level of the Hype Train, Last Contributer: ${hts.lastContribution}`);
		});
		const hypeEventEnd = eventSubListener.onChannelHypeTrainEnd(info.id as UserIdResolvable, async (hte) => { // needs to be tested, progress and start to be done after end has been tested and it works!
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
			await twitchActivity.send({ embeds: [hypeeventendEmbed] });
		});
		const hypeTrainProgress = eventSubListener.onChannelHypeTrainProgress(info.id as UserIdResolvable, async (htp) => {
			const userInfo = await htp.getBroadcaster();
			chatClient.say(userInfo.name, `HypeTrain Level:${htp.level}, Latest Contributer:${htp.lastContribution}, HypeTrain Progress:${htp.progress}`);
		});
		const giftedSubs = eventSubListener.onChannelSubscriptionGift(info.id as UserIdResolvable, async (gift) => {
			// console.log(info.name, `${gift.gifterDisplayName} has just gifted ${gift.amount} ${gift.tier} subs to ${gift.broadcasterName}, they have given a total of ${gift.cumulativeAmount} Subs to the channel`);
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
			await twitchActivity.send({ embeds: [giftedSubs] });
		});
		const resub = eventSubListener.onChannelSubscriptionMessage(info.id as UserIdResolvable, async (s) => {
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
		const follow = eventSubListener.onChannelFollow(info.id as UserIdResolvable, info.id as UserIdResolvable, async (e) => {
			try {
				const userInfo = await e.getUser();
				if (!broadcasterInfo) {
					return console.error('broadcasterInfo is undefined');
				}
				
				const stream = await userApiClient.channels.getChannelInfoById(info.id as UserIdResolvable);
				const isDescriptionEmpty = userInfo.description === '';
				let gameId = stream?.gameId || ''; // Default gameId to empty string if not provided
		
				// If gameId is an empty string, use 'default' as fallback
				if (gameId === '') {
					gameId = 'default';
				}
		
				let followMessage;
		
				// Handle empty string gameId separately to fetch default messages
				if (gameId === 'default') {
					followMessage = await FollowMessage.findOne({ gameId: { $in: ['', 'default'] } });
				} else {
					followMessage = await FollowMessage.findOne({ gameId });
				}
		
				if (!followMessage) {
					console.error('No follow messages found for this game.');
					return;
				}
		
				const messages = followMessage.messages;
				const randomIndex = Math.floor(Math.random() * messages.length);
				const randomMessage = messages[randomIndex].replace('${e.userDisplayName}', e.userDisplayName);
		
				const followEmbed = new EmbedBuilder()
					.setTitle('Twitch Event[Follow]')
					.setAuthor({ name: `${e.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
					.setDescription(`${randomMessage}`)
					.addFields([
						{
							name: 'Twitch User: ',
							value: `${userInfo.displayName} just Followed the channel`,
							inline: true
						},
					])
					.setThumbnail(`${userInfo.profilePictureUrl}`)
					.setFooter({ text: 'DragonFire Lair', iconURL: `${userInfo.profilePictureUrl}` })
					.setTimestamp();
		
				if (!isDescriptionEmpty) {
					console.log(`Users Channel Description: ${userInfo.description}`);
				}
		
				await chatClient.say(info.name, `${randomMessage}`);
				await twitchActivity.send({ embeds: [followEmbed] });
			} catch (error) {
				console.error('An error occurred in the follower event handler:', error);
			}
		});		
		const subs = eventSubListener.onChannelSubscription(info.id as UserIdResolvable, async (s) => {
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
				await chatClient.say(info.id, `${s.userName} has Subscribed to the channel with a tier ${s.tier} Subscription`);
				// await twitchActivity.send({ embeds: [subEmbed] });
			} catch (error) {
				console.error(error);
			}
		});
		const cheer = eventSubListener.onChannelCheer(info.id as UserIdResolvable, async (cheer) => {
			const userInfo = await cheer.getUser();
			if (cheer.bits >= 50) {
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
					.setFooter({ text: `Channel ${info.name}`, iconURL: `${userInfo?.profilePictureUrl}`})
					.setTimestamp();
				try {
					await chatClient.say(info.name, `${cheer.userDisplayName} has cheered ${cheer.bits} bits in ${info.name}`);
					await twitchActivity.send({ embeds: [cheerEmbed] });
				} catch (error) {
					console.error(error);
				}
			}
		});
		const raidToListener = eventSubListener.onChannelRaidTo(info.id as UserIdResolvable, async (raidToEvent) => { // raided by another streamer
			try {
				const raidedBroadcaster = await raidToEvent.getRaidedBroadcaster(); // You (the broadcaster)
				const raidingBroadcaster = await raidToEvent.getRaidingBroadcaster(); // User raiding you
	
				const raidEmbed = new EmbedBuilder()
					.setTitle('Twitch Event [RAID]')
					.setAuthor({ name: raidedBroadcaster.displayName, iconURL: raidedBroadcaster.profilePictureUrl})
					.addFields([
						{ name: 'Raided By: ', value: raidingBroadcaster.displayName, inline: true },
						{ name: 'Viewer Count: ', value: `${raidToEvent.viewers} Viewers`, inline: true },
					])
					.setURL(`https://twitch.tv/${raidingBroadcaster.displayName.toLowerCase()}`)
					.setThumbnail(raidingBroadcaster.profilePictureUrl)
					.setFooter({ text: `Channel ${info.name}`, iconURL: raidingBroadcaster.offlinePlaceholderUrl})
					.setTimestamp();
	
				const raidMessage = `${raidingBroadcaster.displayName} has raided ${raidedBroadcaster.displayName}'s channel with ${raidToEvent.viewers} viewers!`;
				await chatClient.say(info.id, raidMessage);
				await twitchActivity.send({ embeds: [raidEmbed] });
	
				await sleep(1000);
	
				await userApiClient.chat.shoutoutUser(info.id, raidingBroadcaster.name);
			} catch (error) {
				console.error('Error sending raid notification to Discord:', error);
			}
		});
		const raidFromListener = eventSubListener.onChannelRaidFrom(info.id as UserIdResolvable, async (raidEvent) => { // raiding another streamer
			try {
				console.log('Raid To Event:', raidEvent);
				const raidedBroadcaster = await raidEvent.getRaidedBroadcaster();
				const raidingBroadcaster = await raidEvent.getRaidingBroadcaster();
	
				const raidEmbed = new EmbedBuilder()
					.setTitle('Raid Initiated!')
					.setColor('Purple') // Adjust color as needed
					.setAuthor({ name: `You (as ${raidingBroadcaster.displayName})`, iconURL: raidingBroadcaster.profilePictureUrl})
					.addFields([
						{ name: 'Raided Channel:', value: `[${raidedBroadcaster.displayName}](https://twitch.tv/${raidedBroadcaster.displayName.toLowerCase()})`, inline: false },
						{ name: 'Viewers:', value: `${raidEvent.viewers} viewers`, inline: false },
					])
					.setTimestamp();
	
				await twitchActivity.send({ embeds: [raidEmbed] });
			} catch (error) {
				console.error(error);
			}
		});
		const goalBeginning = eventSubListener.onChannelGoalBegin(info.id as UserIdResolvable, async (gb) => {
			const userInfo = await gb.getBroadcaster();
			console.log(`${userInfo.displayName}, current ${gb.type} goal: ${gb.currentAmount} - ${gb.targetAmount}`);
			// if (moderatorID?.id === undefined) return;
			// if (info.id  as UserIdResolvable === undefined) return;
			switch (gb.type) {
				case 'follow':
					console.log(`${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`);
					await chatClient.say(userInfo.name, `${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`);
					await userApiClient.chat.sendAnnouncement(info.id  as UserIdResolvable as UserIdResolvable, { color: 'purple', message: `${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}` }).catch((err) => { console.error(err); });
					break;
				case 'subscription':
					console.log(`${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`);
					await chatClient.say(userInfo.name, `${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`);
					await userApiClient.chat.sendAnnouncement(info.id  as UserIdResolvable as UserIdResolvable, { color: 'purple', message: `${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}` }).catch((err) => { console.error(err); });
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
		const goalProgress = eventSubListener.onChannelGoalProgress(info.id as UserIdResolvable, async (gp) => {
			const userInfo = await gp.getBroadcaster();
			setTimeout(() => {
				console.log(`${userInfo.displayName} ${gp.type} Goal, ${gp.currentAmount} - ${gp.targetAmount}`);
			}, 60000);
			await chatClient.say(userInfo.name, `${userInfo.displayName} ${gp.type} Goal, ${gp.currentAmount} - ${gp.targetAmount}`);
		});
		const goalEnded = eventSubListener.onChannelGoalEnd(info.id as UserIdResolvable, async (ge) => {
			const userInfo = await ge.getBroadcaster();
			console.log(`${userInfo.displayName}, ${ge.currentAmount} - ${ge.targetAmount} Goal Started:${ge.startDate} Goal Ended: ${ge.endDate}`);
			if (broadcasterInfo) { await chatClient.say(broadcasterInfo[0].name, `${userInfo.displayName}, ${ge.currentAmount} - ${ge.targetAmount} Goal Started:${ge.startDate} Goal Ended: ${ge.endDate}`); }
		});
		let previousTitle: string = '';
		let previousCategory: string = '';
	
		const channelUpdates = eventSubListener.onChannelUpdate(info.id as UserIdResolvable, async (event) => {
			const { streamTitle, categoryName } = event;
			const chatClient = await getChatClient();

			if (info.name === 'canadiendragon') {
			// Check if both title and category have changed
				if (streamTitle !== previousTitle && categoryName !== previousCategory) {
				// Display a chat message with both updated stream title and category
					await chatClient.say(event.broadcasterName, `Stream title has been updated: ${streamTitle}. Stream category has been updated: ${categoryName}`);
					previousTitle = streamTitle; // Update the previous title
					previousCategory = categoryName; // Update the previous category
				} else if (streamTitle !== previousTitle) {
				// Display a chat message with the updated stream title
					await chatClient.say(event.broadcasterName, `Stream title has been updated: ${streamTitle}`);
					previousTitle = streamTitle; // Update the previous title
				} else if (categoryName !== previousCategory) {
				// Display a chat message with the updated stream category
					await chatClient.say(event.broadcasterName, `Stream category has been updated: ${categoryName}`);
					previousCategory = categoryName; // Update the previous category
				}
			} else {
				return;
			}
		});
	}
	
	//#endregion
}

let eventSubListenerPromise: Promise<EventSubWsListener> | null = null;

async function createEventSubListener(): Promise<EventSubWsListener> {
	const userApiClient: ApiClient = await getUserApi();
	const eventSubListener = new EventSubWsListener({ apiClient: userApiClient, logger: { minLevel: 'ERROR' } });
    
	// Start the listener
	eventSubListener.start();

	// Set up the disconnect event listener only once
	eventSubListener.onUserSocketDisconnect(async (userId: string, error?: Error) => {
		if (error) {
			console.error(`Socket disconnected for user ${userId}`, error);
		}
        
		// Reset the promise to allow a new listener to be created
		eventSubListenerPromise = null;
        
		// Attempt to recreate EventSub listener
		try {
			await getEventSubs();
			console.log('EventSub listener reconnected successfully.');
		} catch (e) {
			console.error('Failed to reconnect EventSub listener:', e);
			process.exit(1);
		}
	});
	eventSubListener.onSubscriptionCreateSuccess(async (subscription) => {
		const Environment = process.env.Environment as string;
		
		try {
			if (Environment === 'debug' || Environment === 'dev') {
				console.log(`(SCS) SubscriptionID: ${subscription.id}, SubscriptionAuthUserId: ${subscription.authUserId}`);
				// await SubscriptionModel.deleteMany({});
				// console.log('All existing subscriptions deleted in dev environment.');
			}
			// Check if the subscription already exists in MongoDB
			const existingSubscription = await SubscriptionModel.findOne({
				subscriptionId: subscription.id,
				authUserId: subscription.authUserId,
			});
				
			if (existingSubscription) {
				if (process.env.Enviroment === 'dev' || process.env.Enviroment === 'debug') {
					// console.log(`Subscription already exists in database: SubscriptionID: ${subscription.id}, SubscriptionAuthUserId: ${subscription.authUserId}`);
				}
				return; // Exit early if subscription already exists
			}
				
			// Save subscription details to MongoDB
			const newSubscription = new SubscriptionModel({
				subscriptionId: subscription.id,
				authUserId: subscription.authUserId,
			});
			await newSubscription.save();
			console.log(`New subscription saved to database: SubscriptionID: ${subscription.id}, SubscriptionAuthUserId: ${subscription.authUserId}`);
		} catch (error) {
			console.error('Error saving subscription to database:', error);
		}
	});	
	eventSubListener.onSubscriptionCreateFailure((subscription, error) => {
		const Enviroment = process.env.Enviroment as string;
		if (Enviroment === 'debug' || Enviroment === 'dev') {
			console.error(`(SCF){SubscriptionID: ${subscription.id}, SubscriptionAuthUserId: ${subscription.authUserId}`, error);
			// process.exit(1);
		}
	});
	eventSubListener.onSubscriptionDeleteSuccess(async (subscription) => {
		const Enviroment = process.env.Enviroment as string;
		if (Enviroment === 'debug') {
			console.log(`(SDS){SubscriptionID: ${subscription.id}, SubscriptionAuthUserId: ${subscription.authUserId}`);
		}
		try {
			// Check if the subscription exists in MongoDB
			const existingSubscription = await SubscriptionModel.findOne({
				subscriptionId: subscription.id,
				authUserId: subscription.authUserId,
			});

			if (!existingSubscription) {
				console.log(`(DS) Subscription not found in database: SubscriptionID: ${subscription.id}, SubscriptionAuthUserId: ${subscription.authUserId}`);
				return; // Exit early if subscription not found
			}

			// Delete subscription from MongoDB
			const deletedSubscription = await SubscriptionModel.findOneAndDelete({
				subscriptionId: subscription.id,
				authUserId: subscription.authUserId,
			});

			if (deletedSubscription) {
				console.log(`(DS) Deleted Subscription: SubscriptionID: ${deletedSubscription.subscriptionId}, SubscriptionAuthUserId: ${deletedSubscription.authUserId}`);
			} else {
				console.log(`(DS) Subscription not found in database during delete operation: SubscriptionID: ${subscription.id}, SubscriptionAuthUserId: ${subscription.authUserId}`);
			}
		} catch (error) {
			console.error('Error deleting subscription from database:', error);
		}
	});
	eventSubListener.onSubscriptionDeleteFailure((subscription, error) => {
		const Enviroment = process.env.Enviroment as string;
		if (Enviroment === 'debug' || Enviroment === 'dev') {
			console.error(`(SDF){SubscriptionID: ${subscription.id}, SubscriptionAuthUserId: ${subscription.authUserId}`, error);
		}
	});

	return eventSubListener;
}

export async function getEventSubs(): Promise<EventSubWsListener> {
	if (!eventSubListenerPromise) {
		eventSubListenerPromise = createEventSubListener();
	}
	return eventSubListenerPromise;
}