import { config } from 'dotenv';
config();
import { WebhookClient, EmbedBuilder } from 'discord.js';
import { EventSubWsListener } from '@twurple/eventsub-ws';

// import { createChannelPointsRewards } from './misc/channelPoints';
import { getUserApi } from './api/userApiClient';
import { PromoteWebhookID, PromoteWebhookToken, TwitchActivityWebhookID, TwitchActivityWebhookToken } from './util/constants';
import { getChatClient } from './chat';

export async function EventSubEvents(): Promise<void> {
	const userApiClient = await getUserApi();
	const eventSubListener = await getEventSubs();
	const chatClient = await getChatClient();

	//#region Webhooks
	const LIVE = new WebhookClient({ id: PromoteWebhookID, token: PromoteWebhookToken });
	const twitchActivity = new WebhookClient({ id: TwitchActivityWebhookID, token: TwitchActivityWebhookToken });
	//#endregion

	if (process.env.NODE_ENV === 'dev') { await userApiClient.eventSub.deleteAllSubscriptions().then(() => { console.log('All Subscriptions Deleted!'); } ).catch((err) => { console.error(err); }); }

	// await createChannelPointsRewards();

	// eventSub Stuff
	const userID = '31124455';// get twitchId from database
	const broadcasterID = await userApiClient.channels.getChannelInfoById(userID);
	if (broadcasterID?.id === undefined) return;
	
	//#region ChannelPoints
	const shoutoutUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID?.id, 'ad2a5d3f-b3fa-47a6-a362-95e19329b6ca', {
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
	const Hydrate = await userApiClient.channelPoints.updateCustomReward(broadcasterID?.id, '3a8c6180-965d-4a07-8719-e9841d1b66c7', {
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
	const DropController = await userApiClient.channelPoints.updateCustomReward(broadcasterID?.id, '3c706427-d088-4b86-a8ed-cad3ee74c90f', {
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
	const IRLVoiceBan = await userApiClient.channelPoints.updateCustomReward(broadcasterID?.id, '9db39854-3315-4ff2-b100-0cac8cefef90', {
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
	const IRLWordBan = await userApiClient.channelPoints.updateCustomReward(broadcasterID?.id, 'b6cdd5d8-6eff-4d06-8069-233bc63927a5', {
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
	const MUTEHeadset = await userApiClient.channelPoints.updateCustomReward(broadcasterID?.id, 'c7d64563-b5c0-40ea-abcd-76c8846d0a7b', {
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
	const twitterUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID?.id, 'e80f9746-d183-47cb-933e-bdf9d3be5241', {
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
	const instagramUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID?.id, 'c8ca7ccf-9e2f-4313-8e28-35eecdcda685', {
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
	const tiktokUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID?.id, '144837ed-514a-436c-95cf-d9491efad240', {
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
	const discordUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID?.id, '9aa5fab9-2648-4875-b9c8-ebfb9dee7019', {
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
	const facebookUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID?.id, 'df73bcbd-a01c-4453-8ae3-987078ced3ab', {
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
	const youtubeUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID?.id, '993abcd3-613b-4e7a-ab0c-ae0705a707bd', {
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
	const snapchatUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID?.id, 'ad16d5e3-b88c-43d3-9349-0203cbaf88cc', {
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
	const merchUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID?.id, 'f7ed2b68-35d5-4b57-bf54-704274d89670', {
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
	const tipUpdate = await userApiClient.channelPoints.updateCustomReward(broadcasterID?.id, '64c19c30-5560-4b68-8716-be508de12d3d', {
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
	const Baningameaction = await userApiClient.channelPoints.updateCustomReward(broadcasterID?.id, '2e6f1447-3129-4fe1-acbc-6737c1ff3cde', {
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
	const online = eventSubListener.onStreamOnline(userID, async (o) => {
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
			if (stream?.thumbnailUrl) {
				liveEmbed.setImage(`${stream.thumbnailUrl}`);
			}
			if (userInfo.profilePictureUrl) {
				liveEmbed.setThumbnail(userInfo.profilePictureUrl);
			}
			chatClient.say(broadcasterID.name, `${o.broadcasterDisplayName} has just gone live playing ${broadcasterID?.gameName} with ${stream?.viewers} viewers.`);
			await LIVE.send({ content: '@everyone', embeds: [liveEmbed] });
		} catch (err: any) {
			console.error(err.message);
		}
	});
	const offline = eventSubListener.onStreamOffline(userID, async (stream) => {
		const userInfo = await stream.getBroadcaster();
		const offlineEmbed = new EmbedBuilder()
			.setAuthor({ name: `${userInfo.displayName}`, iconURL: `${userInfo.profilePictureUrl}` })
			.setDescription(`${stream.broadcasterDisplayName} has gone offline, thank you for stopping by!`)
			.setColor('Red')
			.setFooter({ text: 'Ended Stream at ' })
			.setTimestamp();
		try {
			chatClient.say(broadcasterID.name, `${stream.broadcasterDisplayName} has gone offline, thank you for stopping by!`);
			await LIVE.send({ embeds: [offlineEmbed] });
		} catch (error) {
			console.error(error);
		}
	});
	const redeem = eventSubListener.onChannelRedemptionAdd(userID, async (cp) => {
		const userInfo = await cp.getUser();
		const streamer = await cp.getBroadcaster();
		// console.log(`${cp.userDisplayName}: Reward Name: ${cp.rewardTitle}, rewardId: ${cp.rewardId}, BroadcasterId: ${cp.id}`);
		// const reward = await userApiClient.channelPoints.getRedemptionById(broadcasterID, `${cp.rewardId}`, `${cp.id}`);
		switch (cp.rewardTitle || cp.rewardId) {
		case 'Shoutout':
			const user = await userApiClient.users.getUserByName(cp.userName);
			const gameLastPlayed = await userApiClient.channels.getChannelInfoById(user?.id!);
			chatClient.say(broadcasterID.name, `@${cp.userDisplayName} has redeemed a shoutout, help them out by giving them a follow here: https://twitch.tv/${cp.userName}, last seen playing: ${gameLastPlayed?.gameName}`);

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
			await twitchActivity.send({ embeds: [shoutoutEmbed] });
			break;
		case 'Tip':
			chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName}'s Tipping Page: https://overlay.expert/celebrate/canadiendragon`);

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
			chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName}'s Twitter: https://twitter.com/canadiendragon`);

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
			await twitchActivity.send({ embeds: [twitterEmbed] });
			break;
		case 'Instagram':
			console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
			chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName}'s Instagram: https://instagram.com/canadiendragon`);

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
			await twitchActivity.send({ embeds: [instagramEmbed] });
			break;
		case 'YouTube':
			console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
			await chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName}'s YouTube: https://youtube.com/channel/UCUHnQESlc-cPkp_0KvbVK6g`);

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
			await twitchActivity.send({ embeds: [youtubeEmbed] });
			break;
		case 'TicTok':
			console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
			chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName}'s Tic-Tok: https://tiktok.com/@canadiendragon`);

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
			await twitchActivity.send({ embeds: [tiktokEmbed] });
			break;
		case 'Snapchat':
			console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
			chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName}'s Snapchat: https://snapchat.com/add/canadiendragon`);

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
			await twitchActivity.send({ embeds: [snapchatEmbed] });
			break;
		case 'Facebook':
			console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
			chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName}'s Facebook: https://facebook.com/gaming/SkullGaming8461`);

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
			await twitchActivity.send({ embeds: [facebookEmbed] });
			break;
		case 'Discord':
			console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
			chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName}'s Discord: https://discord.com/invite/dHpehkD6M3`);

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
			await twitchActivity.send({ embeds: [discordEmbed] });
			break;
		case 'Merch':
			console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
			chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName}'s Merch: https://canadiendragon-merch.creator-spring.com`);

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
			await twitchActivity.send({ embeds: [merchEmbed] });
			break;
		case 'Hydrate!':
			console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
			chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName}'s, you must stay hydrated, take a sip of whatever your drinking.`);

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
			await twitchActivity.send({ embeds: [hydrateEmbed] });
			break;
		case 'DropController':
			// console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
			chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName} Put down that controller for 30 seconds`);

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
			await twitchActivity.send({ embeds: [dropcontrollerEmbed] });
			break;
		case 'MUTEHeadset':
			console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
			chatClient.say(broadcasterID.name, `${cp.broadcasterDisplayName} you should not be listening to game sounds right now`);

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
			await twitchActivity.send({ embeds: [muteheadsetEmbed] });
			break;
		case 'IRLWordBan':
			console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
			chatClient.say(broadcasterID.name, `@${cp.userDisplayName} has redeemed ${cp.rewardTitle} and has ban the word ${cp.input.toUpperCase()}`);

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
			await twitchActivity.send({ embeds: [irlwordbanEmbed] });
			break;
		case 'IRLVoiceBan':
			console.log(`${cp.rewardTitle} has been redeemed by ${cp.userName}`);
			chatClient.say(broadcasterID.name, `@${cp.broadcasterDisplayName} SHHHHHH why are you still talking right now`);

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
			await twitchActivity.send({ embeds: [irlvoicebanEmbed] });
			break;
		case 'Ban an in-game action':
			console.log(`${cp.rewardTitle} has been redeemed by ${cp.userDisplayName}, ${cp.input}`);
			const tbd = await cp.getReward();
			chatClient.say(broadcasterID.name, `${cp.userDisplayName} has redeemed Ban an In-Game Action, Action:${cp.input}`);

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
			await twitchActivity.send({ embeds: [baningameactionEmbed] });
			break;
		default:
			console.log(`${cp.userName} has attempted to redeem ${cp.rewardTitle} thats not coded in yet`);
			await chatClient.say(userInfo.name, `@${cp.userName} has activated a channel points item and it hasnt been coded in yet`);
			break;
		}
	});
	// const title = eventSubListener.onChannelUpdate(userID, async (update) => {
	// 	const userInfo = await update.getBroadcaster();
	// 	const game = await update.getGame();
		
	// 	if (update.streamTitle) {
	// 		chatClient.say(broadcasterID.name, `Title updated to ${update.streamTitle}`);
	// 	} else if (update.categoryName) {
	// 		chatClient.say(broadcasterID.name, `Category updated to ${game?.name}`);
	// 	}

	// 	// console.log(userInfo.name, `updated title to ${update.streamTitle}, categoryName: ${update.categoryName}`);
	// });
	const hypeEventStart = eventSubListener.onChannelHypeTrainBegin(userID, async (hts) => {
		const userInfo = await hts.getBroadcaster();
		console.log(`Listening but no messages setup, ${hts.goal} to reach the next level of the Hype Train`);
		chatClient.say(userInfo.name, `${hts.goal} to reach the next level of the Hype Train, Last Contributer: ${hts.lastContribution}`);
	});
	const hypeEventEnd = eventSubListener.onChannelHypeTrainEnd(userID, async (hte) => { // needs to be tested, progress and start to be done after end has been tested and it works!
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
	const hypeTrainProgress = eventSubListener.onChannelHypeTrainProgress(userID, async (htp) => {
		const userInfo = await htp.getBroadcaster();
		chatClient.say(userInfo.name, `HypeTrain Level:${htp.level}, Latest Contributer:${htp.lastContribution}, HypeTrain Progress:${htp.progress}`);
	});
	const giftedSubs = eventSubListener.onChannelSubscriptionGift(userID, async (gift) => {
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
		await twitchActivity.send({ embeds: [giftedSubs] });
	});
	const resub = eventSubListener.onChannelSubscriptionMessage(userID, async (s) => {
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
		await twitchActivity.send({ embeds: [resubEmbed] });
	});
	const follow = eventSubListener.onChannelFollow(userID, userID, async (e) => {
		const randomFollowMessage = [
			`@${e.userDisplayName} has followed the channel`,
			`@${e.userDisplayName} has joined the army and entered the barracks`,
			`Brace yourself, @${e.userDisplayName} has followed`,
			`HEY! LISTEN! @${e.userDisplayName} has followed`,
			`We've been expecting you @${e.userDisplayName}`,
			`@${e.userDisplayName} just followed, quick everyone look busy`,
			`Challenger Approaching - @${e.userDisplayName} has followed`,
			`Welcome @${e.userDisplayName}, stay awhile and listen`,
			`@${e.userDisplayName} has followed, it's super effective`
		];
	
		const randomString = randomFollowMessage[Math.floor(Math.random() * randomFollowMessage.length)];
	
		const userInfo = await e.getUser();
		const isDescriptionEmpty = userInfo.description === '';
	
		chatClient.say(broadcasterID.name, `${randomString}`);
	
		if (!isDescriptionEmpty) {
			console.log(`Users Channel Description: ${userInfo.description}`);
		}
	
		const subed = await userInfo.isSubscribedTo(userID) ? 'yes' : 'no';
	
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
					inline: false
				}
			])
			.setThumbnail(userInfo.profilePictureUrl)
			.setFooter({ text: 'Click Title to check out their channel', iconURL: userInfo.profilePictureUrl })
			.setTimestamp();
	
		await twitchActivity.send({ embeds: [followEmbed] });
	});
	const subs = eventSubListener.onChannelSubscription(userID, async (s) => {
		const userInfo = await s.getUser();
		chatClient.say(userInfo.name, `${s.userName} has Subscribed to the channel with a tier ${s.tier} Subscription`);
		switch (s.tier) {
		case '1000':
			return '1';
		case '2000':
			return '2';
		case '3000':
			return '3';
		}

		const subEmbed = new EmbedBuilder()
			.setTitle('SUBSCRIBER EVENT')
			.setAuthor({ name: `${s.userDisplayName}`, iconURL: `${userInfo.profilePictureUrl}` })
			.setURL(`https://twitch.tv/${s.userName}`)
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
			.setColor('Green')
			.setFooter({ text: 'SkulledArmy', iconURL: `${userInfo.profilePictureUrl}` })
			.setTimestamp();
		await twitchActivity.send({ embeds: [subEmbed] });
	});
	const cheer = eventSubListener.onChannelCheer(userID, async (cheer) => {
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
			await twitchActivity.send({ embeds: [cheerEmbed] });
		}
	});
	const raid = eventSubListener.onChannelRaidFrom(userID, async (raid) => {
		const raidFrom = await raid.getRaidedBroadcaster();
		const userInfo = await raid.getRaidingBroadcaster();
	
		const message = `${raid.raidedBroadcasterDisplayName} has raided the channel with ${raid.viewers} viewers!`;
		chatClient.say(userInfo?.name, message);
	
		const raidEmbed = new EmbedBuilder()
			.setTitle('CHANNEL RAID EVENT')
			.setColor('Random')
			.setAuthor({ name: raid.raidedBroadcasterDisplayName, iconURL: raidFrom.profilePictureUrl })
			.addFields([
				{
					name: 'Raider: ',
					value: raid.raidedBroadcasterDisplayName,
					inline: true,
				},
				{
					name: 'Viewer Count: ',
					value: `${raid.viewers} Viewers`,
					inline: true,
				},
			])
			.setURL(`https://twitch.tv/${raid.raidedBroadcasterName}`)
			.setThumbnail(raidFrom.profilePictureUrl)
			.setFooter({ text: 'SkulledArmy', iconURL: raidFrom.profilePictureUrl })
			.setTimestamp();
	
		await twitchActivity.send({ embeds: [raidEmbed] });
	});
	const goalBeginning = eventSubListener.onChannelGoalBegin(userID, async (gb) => {
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
	const goalProgress = eventSubListener.onChannelGoalProgress(userID, async (gp) => {
		const userInfo = await gp.getBroadcaster();
		setTimeout(() => {
			console.log(`${userInfo.displayName} ${gp.type} Goal, ${gp.currentAmount} - ${gp.targetAmount}`);
		}, 60000);
		chatClient.say(userInfo.name, `${userInfo.displayName} ${gp.type} Goal, ${gp.currentAmount} - ${gp.targetAmount}`);
	});
	const goalEnded = eventSubListener.onChannelGoalEnd(userID, async (ge) => {
		const userInfo = await ge.getBroadcaster();
		console.log(`${userInfo.displayName}, ${ge.currentAmount} - ${ge.targetAmount} Goal Started:${ge.startDate} Goal Ended: ${ge.endDate}`);
		chatClient.say(userInfo.name, `${userInfo.displayName}, ${ge.currentAmount} - ${ge.targetAmount} Goal Started:${ge.startDate} Goal Ended: ${ge.endDate}`);
	});
		//#endregion
}

export async function getEventSubs(): Promise<EventSubWsListener> {
	const userApiClient = await getUserApi();
	const eventSubListener = new EventSubWsListener({ apiClient: userApiClient, logger: { minLevel: 'error' } });
	eventSubListener.start();

	return eventSubListener;
}