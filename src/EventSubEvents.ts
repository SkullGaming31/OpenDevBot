import { EventSubWsListener } from '@twurple/eventsub-ws';
import { config } from 'dotenv';
import { EmbedBuilder } from 'discord.js';
import { enqueueWebhook } from './Discord/webhookQueue';
config();

import {
	ApiClient,
	HelixPaginatedEventSubSubscriptionsResult,
	HelixPagination,
	UserIdResolvable,
} from '@twurple/api';
import { StaticAuthProvider } from '@twurple/auth';
import { lurkingUsers } from './Commands/Information/lurk';
import { getUserApi } from './api/userApiClient';
import { getChatClient } from './chat';
import { LurkMessageModel } from './database/models/LurkModel';
import {
	broadcasterInfo,
	moderatorIDs,
	PromoteWebhookID,
	PromoteWebhookToken,
	TwitchActivityWebhookID,
	TwitchActivityWebhookToken,
} from './util/constants';
import { sleep } from './util/util';
import { SubscriptionModel } from './database/models/eventSubscriptions';
import retryManager from './EventSub/retryManager';
import FollowMessage from './database/models/followMessages';

export async function initializeTwitchEventSub(): Promise<void> {
	const userApiClient = await getUserApi();
	const eventSubListener = await getEventSubs();
	const chatClient = await getChatClient();

	//#region DiscordWebhooks
	const LIVE_ID = PromoteWebhookID;
	const LIVE_TOKEN = PromoteWebhookToken;
	const TWITCH_ACTIVITY_ID = TwitchActivityWebhookID;
	const TWITCH_ACTIVITY_TOKEN = TwitchActivityWebhookToken;
	//#endregion

	// eventSub Stuff
	if (broadcasterInfo === undefined || moderatorIDs === undefined) return;

	//#region EventSub
	for (const info of broadcasterInfo) {


		let streamStartTime: Date | undefined;// testing for stream end message for discord when stream goes offline and shows how long the stream was live
		const online = eventSubListener.onStreamOnline(
			info.id as UserIdResolvable,
			async (o) => {
				streamStartTime = new Date();
				const userApiClient = await getUserApi();
				const stream = await o.getStream();
				const userInfo = await o.getBroadcaster();

				try {
					const game = await userApiClient.games.getGameById(
						stream?.gameId as string,
					);

					const liveEmbed = new EmbedBuilder()
						.setTitle('Twitch Event[NOW LIVE]')
						.setAuthor({
							name: `${o.broadcasterName}`,
							iconURL: `${userInfo.profilePictureUrl}`,
						})
						.addFields([
							{
								name: 'Stream Title',
								value: `${stream?.title || 'No Title Set'}`,
								inline: true,
							},
							{
								name: 'game: ',
								value: `${stream?.gameName || 'No Game Set'}`,
								inline: true,
							},
							{
								name: 'Viewers: ',
								value: `${stream?.viewers || 0}`,
								inline: true,
							},
						])
						.setURL(`https://twitch.tv/${userInfo.name}`)
						.setImage(`${game?.boxArtUrl}`)
						.setColor('Green')
						.setTimestamp();

					if (stream?.thumbnailUrl) {
						liveEmbed.setImage(`${stream.thumbnailUrl}`);
					}
					if (userInfo.profilePictureUrl) {
						liveEmbed.setThumbnail(userInfo.profilePictureUrl);
					}

					await sleep(60000);
					await userApiClient.chat.sendAnnouncement(
						info.id as UserIdResolvable,
						{
							color: 'green',
							message:
								`${o.broadcasterDisplayName} has just gone live playing ${broadcasterInfo[0].gameName} - (${stream?.title})`,
						},
					);
					if (info.id === '1155035316') {
						await sleep(60000);
						await enqueueWebhook(LIVE_ID, LIVE_TOKEN, { content: '@everyone', embeds: [liveEmbed] });
					}
				} catch (err: unknown) {
					console.error('Error sending going live post', err);
				}
			},
		);

		const offline = eventSubListener.onStreamOffline(
			info.id as UserIdResolvable,
			async (stream) => {
				if (!streamStartTime) return;
				const caster = await stream.getBroadcaster();
				const duration = new Date().getTime() - streamStartTime.getTime();
				const hours = Math.floor(duration / (1000 * 60 * 60));
				const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
				const seconds = Math.floor((duration % (1000 * 60)) / 1000);

				const offlineEmbed = new EmbedBuilder()
					.setAuthor({ name: caster.displayName, iconURL: caster.profilePictureUrl })
					.setDescription(`${stream.broadcasterDisplayName} has gone offline, thank you for stopping by!`)
					.setColor('Red')
					.setFooter({ text: `Ended Stream at ${new Date().toLocaleTimeString()} after ${hours}h ${minutes}m ${seconds}s` })
					.setTimestamp();

				try {
					await sleep(2000);
					await userApiClient.chat.sendAnnouncement(info.id as UserIdResolvable, {
						color: 'primary',
						message: `${stream.broadcasterDisplayName} has gone offline, thank you for stopping by!`,
					});
					await sleep(2000);
					if (info.id === '1155035316') {
						await enqueueWebhook(LIVE_ID, LIVE_TOKEN, { embeds: [offlineEmbed] });
						await sleep(2000);
						if (info.name === 'skullgaminghq') {
							await chatClient.say(info.name, 'dont forget you can join the Discord Server too, https://discord.com/invite/6TGV75sDjW');
						}
					}
					lurkingUsers.length = 0;
					await LurkMessageModel.deleteMany({});
				} catch (error) {
					console.error(error);
				}
			},
		);
		const hypeEventStart = eventSubListener.onChannelHypeTrainBegin(
			info.id as UserIdResolvable,
			async (hts) => {
				const userInfo = await hts.getBroadcaster();
				console.log(
					`Listening but no messages setup, ${hts.goal} to reach the next level of the Hype Train`,
				);
				chatClient.say(
					userInfo.name,
					`${hts.goal} to reach the next level of the Hype Train, Last Contributer: ${hts.lastContribution}`,
				);
			},
		);
		const hypeEventEnd = eventSubListener.onChannelHypeTrainEnd(
			info.id as UserIdResolvable,
			async (hte) => { // needs to be tested, progress and start to be done after end has been tested and it works!
				const userInfo = await hte.getBroadcaster();
				console.log(
					`HypeTrain End Event Ending, Total Contrubtion:${hte.total}, Total Level:${hte.level}`,
				);
				chatClient.say(
					userInfo.name,
					`${hte.topContributors} have contributed to the HypeTrain`,
				);

				const hypeeventendEmbed = new EmbedBuilder()
					.setTitle('Twitch Event[HypeTrainEND]')
					.setAuthor({
						name: `${userInfo.displayName}`,
						iconURL: `${userInfo.profilePictureUrl}`,
					})
					// .setColor('Random')
					.addFields([
						{
							name: 'Broadcaster Name',
							value: `${userInfo.displayName},\n Start Date: ${hte.startDate}`,
							inline: true,
						},
						{
							name: 'Hype Event Level',
							value: `${hte.level}`,
							inline: true,
						},
						{
							name: 'Hype Train Event Top Contributers',
							value: `${[
								hte.topContributors,
							]},\nTotal Contributers: ${hte.total}`,
							inline: true,
						},
					])
					.setThumbnail(`${userInfo.profilePictureUrl}`)
					.setFooter({
						text: 'DragonFire Lair',
						iconURL: `${userInfo.profilePictureUrl}`,
					})
					.setTimestamp();
				await enqueueWebhook(TWITCH_ACTIVITY_ID, TWITCH_ACTIVITY_TOKEN, { embeds: [hypeeventendEmbed] });
			},
		);
		const hypeTrainProgress = eventSubListener.onChannelHypeTrainProgress(
			info.id as UserIdResolvable,
			async (htp) => {
				const userInfo = await htp.getBroadcaster();
				chatClient.say(
					userInfo.name,
					`HypeTrain Level:${htp.level}, Latest Contributer:${htp.lastContribution}, HypeTrain Progress:${htp.progress}`,
				);
			},
		);
		const giftedSubs = eventSubListener.onChannelSubscriptionGift(
			info.id as UserIdResolvable,
			async (gift) => {
				// console.log(info.name, `${gift.gifterDisplayName} has just gifted ${gift.amount} ${gift.tier} subs to ${gift.broadcasterName}, they have given a total of ${gift.cumulativeAmount} Subs to the channel`);
				const userInfo = await gift.getGifter();
				const broadcasterInfoResult = await gift.getBroadcaster();
				if (broadcasterInfoResult.broadcasterType === '') return;
				chatClient.say(
					userInfo.name,
					`${gift.gifterDisplayName} has just gifted ${gift.amount} ${gift.tier} subs to ${gift.broadcasterName}, they have given a total of ${gift.cumulativeAmount} Subs to the channel`,
				);

				const giftedSubs = new EmbedBuilder()
					.setTitle('Twitch Event[GIFTED SUB]')
					.setDescription(`gifted to ${gift.broadcasterDisplayName}`)
					.setAuthor({
						name: `${gift.gifterDisplayName}`,
						iconURL: `${userInfo.profilePictureUrl}`,
					})
					.addFields([
						{
							name: 'Username: ',
							value: `${gift.gifterDisplayName}`,
							inline: true,
						},
						{
							name: 'Amount: ',
							value: `Gifted ${gift.amount}`,
							inline: true,
						},
						{
							name: 'Gifted Tier: ',
							value: `${parseFloat(gift.tier)}`,
							inline: true,
						},
					])
					.setThumbnail(`${userInfo.profilePictureUrl}`)
					// .setColor('Random')
					.setFooter({
						text: 'DragonFire Lair',
						iconURL: `${userInfo.profilePictureUrl}`,
					})
					.setTimestamp();
				await enqueueWebhook(TWITCH_ACTIVITY_ID, TWITCH_ACTIVITY_TOKEN, { embeds: [giftedSubs] });
			},
		);
		const resub = eventSubListener.onChannelSubscriptionMessage(
			info.id as UserIdResolvable,
			async (s) => {
				const userInfo = await s.getUser();
				const broadcasterInfoResult = await s.getBroadcaster();
				if (broadcasterInfoResult.broadcasterType === '') return;
				const resubEmbed = new EmbedBuilder()
					.setTitle('Twitch Event[RESUB]')
					.setAuthor({
						name: `${s.userDisplayName}`,
						iconURL: `${userInfo.profilePictureUrl}`,
					})
					.addFields([
						{
							name: 'Twitch User: ',
							value: `${userInfo.displayName} just re-subscribed`,
							inline: true,
						},
						{
							name: 'Resub: ',
							value: `${s.cumulativeMonths} in a row`,
							inline: true,
						},
						{
							name: 'Message: ',
							value: `${s.messageText}`,
							inline: true,
						},
					])
					.setThumbnail(`${userInfo.profilePictureUrl}`)
					.setColor('Random')
					.setFooter({
						text: 'DragonFire Lair',
						iconURL: `${userInfo.profilePictureUrl}`,
					})
					.setTimestamp();
				try {
					// await enqueueWebhook(TWITCH_ACTIVITY_ID, TWITCH_ACTIVITY_TOKEN, { embeds: [resubEmbed] });
					await chatClient.say(
						userInfo.name,
						`${s.userDisplayName} has resubbed to the channel for ${s.cumulativeMonths} Months, currently on a ${s.streakMonths} streak, ${s.messageText}`,
					);
				} catch (error) {
					console.error(error);
				}
			},
		);
		const follow = eventSubListener.onChannelFollow(
			info.id as UserIdResolvable,
			info.id as UserIdResolvable,
			async (e) => {
				try {
					const defaultMessages: string[] = [
						'@${e.userDisplayName} has followed the channel',
						'@${e.userDisplayName} has joined the army and entered the barracks',
						'Brace yourself, @${e.userDisplayName} has followed',
						'HEY! LISTEN! @${e.userDisplayName} has followed',
						'We\'ve been expecting you @${e.userDisplayName}',
						'@${e.userDisplayName} just followed, quick everyone look busy',
						'Challenger Approaching - @${e.userDisplayName} has followed',
						'Welcome @${e.userDisplayName}, stay awhile and listen',
						'@${e.userDisplayName} has followed, it\'s super effective',
						'@${e.userDisplayName} has joined the party! Let\'s rock and roll!',
						'Looks like @${e.userDisplayName} is ready for an adventure! Welcome to…',
						'The hero we need has arrived! Welcome, @${e.userDisplayName}!',
						'@${e.userDisplayName} has leveled up! Welcome to the next stage of the…',
						'It\'s dangerous to go alone, @${e.userDisplayName}. Take this warm welc…',
						'Welcome to the battlefield, @${e.userDisplayName}. Let\'s conquer toget…',
					];
					const userInfo = await e.getUser();
					if (!broadcasterInfo) {
						return console.error('broadcasterInfo is undefined');
					}

					const stream = await userApiClient.channels.getChannelInfoById(
						info.id as UserIdResolvable,
					);
					const isDescriptionEmpty = userInfo.description === '';
					const gameId = stream?.gameId;
					if (!gameId) {
						console.error('No gameId found for the current stream.');
						return;
					}
					let followMessage = await FollowMessage.findOne({ gameId });

					if (!followMessage) {
						console.error(`No follow messages found for gameId: ${gameId}`);
						followMessage = await FollowMessage.findOne({ name: 'default' });
						if (!followMessage) {
							console.error('No default follow messages found.');
							return;
						}
					}

					const messages = followMessage.messages.length > 0
						? followMessage.messages
						: defaultMessages;
					const randomIndex = Math.floor(Math.random() * messages.length);
					const randomMessage = messages[randomIndex].replace(
						'${e.userDisplayName}',
						e.userDisplayName,
					);

					const followEmbed = new EmbedBuilder()
						.setTitle('Twitch Event[Follow]')
						.setAuthor({
							name: `${e.userDisplayName}`,
							iconURL: `${userInfo.profilePictureUrl}`,
						})
						.setDescription(`${randomMessage}`)
						.addFields([
							{
								name: 'Twitch User: ',
								value:
									`${userInfo.displayName} just Followed ${info.name}'s channel`,
								inline: true,
							},
						])
						.setThumbnail(`${userInfo.profilePictureUrl}`)
						.setFooter({
							text: `Channel: ${info.name}`,
							iconURL: `${userInfo.profilePictureUrl}`,
						})
						.setTimestamp();

					if (!isDescriptionEmpty) {
						console.log(`Users Channel Description: ${userInfo.description}`);
					}

					await chatClient.say(info.name, `${randomMessage}`);
					await enqueueWebhook(TWITCH_ACTIVITY_ID, TWITCH_ACTIVITY_TOKEN, { embeds: [followEmbed] });
				} catch (error) {
					console.error(
						'An error occurred in the follower event handler:',
						error,
					);
				}
			},
		);
		const subs = eventSubListener.onChannelSubscription(
			info.id as UserIdResolvable,
			async (s) => {
				const userInfo = await s.getUser();
				const broadcasterInfoResult = await s.getBroadcaster();
				if (broadcasterInfoResult.broadcasterType === '') return;
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
					.setAuthor({
						name: userInfo.name,
						iconURL: userInfo.profilePictureUrl,
					})
					.addFields([
						{ name: 'Sub Tier ', value: s.tier },
						{ name: 'Gifted ', value: `${s.isGift}` },
					])
					.setURL(`https://twitch.tv/${userInfo.name.toLowerCase()}`)
					.setTimestamp();
				try {
					await chatClient.say(
						info.id,
						`${s.userName} has Subscribed to the channel with a tier ${s.tier} Subscription`,
					);
					// await twitchActivity.send({ embeds: [subEmbed] });
				} catch (error) {
					console.error(error);
				}
			},
		);
		const cheer = eventSubListener.onChannelCheer(
			info.id as UserIdResolvable,
			async (cheer) => {
				const userInfo = await cheer.getUser();
				const broadcasterInfoResult = await cheer.getBroadcaster();
				if (broadcasterInfoResult.broadcasterType === '') return;
				if (cheer.bits >= 50) {
					const cheerEmbed = new EmbedBuilder()
						.setTitle('Twitch Event[CHEER]')
						.setAuthor({
							name: `${userInfo?.displayName}`,
							iconURL: `${userInfo?.profilePictureUrl}`,
						})
						.addFields([
							{
								name: 'Username: ',
								value: `${userInfo?.displayName}`,
								inline: true,
							},
							{
								name: 'Bits Amount: ',
								value: `${cheer.bits}`,
								inline: true,
							},
							{
								name: 'Message: ',
								value: `${cheer.message}`,
								inline: true,
							},
						])
						.setThumbnail(`${userInfo?.profilePictureUrl}`)
						.setColor('Random')
						.setFooter({
							text: `Channel ${info.name}`,
							iconURL: `${userInfo?.profilePictureUrl}`,
						})
						.setTimestamp();
					try {
						await chatClient.say(
							info.name,
							`${cheer.userDisplayName} has cheered ${cheer.bits} bits in ${info.name}`,
						);
						await enqueueWebhook(TWITCH_ACTIVITY_ID, TWITCH_ACTIVITY_TOKEN, { embeds: [cheerEmbed] });
					} catch (error) {
						console.error(error);
					}
				}
			},
		);
		const raidToListener = eventSubListener.onChannelRaidTo(
			info.id as UserIdResolvable,
			async (raidToEvent) => { // raided by another streamer
				try {
					const raidedBroadcaster = await raidToEvent.getRaidedBroadcaster(); // You (the broadcaster)
					const raidingBroadcaster = await raidToEvent.getRaidingBroadcaster(); // User raiding you

					const raidEmbed = new EmbedBuilder()
						.setTitle('Twitch Event [RAID]')
						.setAuthor({
							name: `${raidedBroadcaster.displayName}`,
							iconURL: `${raidedBroadcaster.profilePictureUrl}`,
						})
						.addFields([
							{
								name: 'Raided By: ',
								value: `${raidingBroadcaster.displayName}`,
								inline: true,
							},
							{
								name: 'Viewer Count: ',
								value: `${raidToEvent.viewers} Viewers`,
								inline: true,
							},
						])
						.setURL(
							`https://twitch.tv/${raidingBroadcaster.displayName.toLowerCase()}`,
						)
						.setThumbnail(`${raidingBroadcaster.profilePictureUrl}`)
						.setFooter({
							text: `Channel ${info.name}`,
							iconURL: `${raidingBroadcaster.offlinePlaceholderUrl}`,
						})
						.setTimestamp();

					const raidMessage =
						`${raidingBroadcaster.displayName} has raided ${raidedBroadcaster.displayName}'s channel with ${raidToEvent.viewers} viewers!`;
					await chatClient.say(info.name, raidMessage);
					await enqueueWebhook(TWITCH_ACTIVITY_ID, TWITCH_ACTIVITY_TOKEN, { embeds: [raidEmbed] });

					await sleep(1000);

					await userApiClient.chat.shoutoutUser(info.id, raidingBroadcaster.id);
				} catch (error) {
					console.error('Error sending raid notification to Discord:', error);
				}
			},
		);
		const raidFromListener = eventSubListener.onChannelRaidFrom(
			info.id as UserIdResolvable,
			async (raidEvent) => { // raiding another streamer
				try {
					console.log('Raid To Event:', raidEvent);
					const raidedBroadcaster = await raidEvent.getRaidedBroadcaster();
					const raidingBroadcaster = await raidEvent.getRaidingBroadcaster();

					const raidEmbed = new EmbedBuilder()
						.setTitle('Raid Initiated!')
						.setColor('Purple') // Adjust color as needed
						.setAuthor({
							name: `You (as ${raidingBroadcaster.displayName})`,
							iconURL: raidingBroadcaster.profilePictureUrl,
						})
						.addFields([
							{
								name: 'Raided Channel:',
								value:
									`[${raidedBroadcaster.displayName}](https://twitch.tv/${raidedBroadcaster.displayName.toLowerCase()})`,
								inline: false,
							},
							{
								name: 'Viewers:',
								value: `${raidEvent.viewers} viewers`,
								inline: false,
							},
						])
						.setTimestamp();

					await enqueueWebhook(TWITCH_ACTIVITY_ID, TWITCH_ACTIVITY_TOKEN, { embeds: [raidEmbed] });
				} catch (error) {
					console.error(error);
				}
			},
		);
		const goalBeginning = eventSubListener.onChannelGoalBegin(
			info.id as UserIdResolvable,
			async (gb) => {
				const userInfo = await gb.getBroadcaster();
				console.log(
					`${userInfo.displayName}, current ${gb.type} goal: ${gb.currentAmount} - ${gb.targetAmount}`,
				);
				// if (moderatorID?.id === undefined) return;
				// if (info.id  as UserIdResolvable === undefined) return;
				switch (gb.type) {
					case 'follow':
						console.log(
							`${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`,
						);
						await chatClient.say(
							userInfo.name,
							`${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`,
						);
						await userApiClient.chat.sendAnnouncement(
							info.id as UserIdResolvable as UserIdResolvable,
							{
								color: 'purple',
								message:
									`${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`,
							},
						).catch((err) => {
							console.error(err);
						});
						break;
					case 'subscription':
						console.log(
							`${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`,
						);
						await chatClient.say(
							userInfo.name,
							`${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`,
						);
						await userApiClient.chat.sendAnnouncement(
							info.id as UserIdResolvable as UserIdResolvable,
							{
								color: 'purple',
								message:
									`${gb.type} goal started: ${gb.currentAmount} - ${gb.targetAmount}`,
							},
						).catch((err) => {
							console.error(err);
						});
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
			},
		);
		const goalProgress = eventSubListener.onChannelGoalProgress(
			info.id as UserIdResolvable,
			async (gp) => {
				const userInfo = await gp.getBroadcaster();
				setTimeout(() => {
					console.log(
						`${userInfo.displayName} ${gp.type} Goal, ${gp.currentAmount} - ${gp.targetAmount}`,
					);
				}, 60000);
				await chatClient.say(
					userInfo.name,
					`${userInfo.displayName} ${gp.type} Goal, ${gp.currentAmount} - ${gp.targetAmount}`,
				);
			},
		);
		const goalEnded = eventSubListener.onChannelGoalEnd(
			info.id as UserIdResolvable,
			async (ge) => {
				const userInfo = await ge.getBroadcaster();
				console.log(
					`${userInfo.displayName}, ${ge.currentAmount} - ${ge.targetAmount} Goal Started:${ge.startDate} Goal Ended: ${ge.endDate}`,
				);
				if (broadcasterInfo) {
					await chatClient.say(
						'1155035316',
						`${userInfo.displayName}, ${ge.currentAmount} - ${ge.targetAmount} Goal Started:${ge.startDate} Goal Ended: ${ge.endDate}`,
					);
				}
			},
		);
		let previousTitle: string = '';
		let previousCategory: string = '';

		const channelUpdates = eventSubListener.onChannelUpdate(
			info.id as UserIdResolvable,
			async (event) => {
				const { streamTitle, categoryName } = event;
				const chatClient = await getChatClient();

				if (info.name === 'skullgaminghq') {
					// Check if both title and category have changed
					if (
						streamTitle !== previousTitle && categoryName !== previousCategory
					) {
						// Display a chat message with both updated stream title and category
						await chatClient.say(
							event.broadcasterName,
							`Stream title has been updated: ${streamTitle}. Stream category has been updated: ${categoryName}`,
						);
						previousTitle = streamTitle; // Update the previous title
						previousCategory = categoryName; // Update the previous category
					} else if (streamTitle !== previousTitle) {
						// Display a chat message with the updated stream title
						await chatClient.say(
							event.broadcasterName,
							`Stream title has been updated: ${streamTitle}`,
						);
						previousTitle = streamTitle; // Update the previous title
					} else if (categoryName !== previousCategory) {
						// Display a chat message with the updated stream category
						await chatClient.say(
							event.broadcasterName,
							`Stream category has been updated: ${categoryName}`,
						);
						previousCategory = categoryName; // Update the previous category
					}
				} else {
					return;
				}
			},
		);
	}

	//#endregion
}

let eventSubListenerPromise: Promise<EventSubWsListener> | null = null;
/**
 * Creates a new EventSub listener and sets up the necessary event listeners
 * The listener is started immediately and will reconnect if the socket is disconnected
 * @returns {Promise<EventSubWsListener>} A promise that resolves with the created EventSub listener
 */
async function createEventSubListener(): Promise<EventSubWsListener> {
	const userApiClient: ApiClient = await getUserApi();
	const eventSubListener = new EventSubWsListener({
		apiClient: userApiClient,
		logger: { minLevel: 'ERROR' },
	});

	// Start the listener
	eventSubListener.start();

	// Set up the disconnect event listener only once
	let isReconnecting = false;

	eventSubListener.onUserSocketDisconnect(async (userId: string, error?: Error) => {
		if (isReconnecting) {
			console.log('Reconnection attempt already in progress.');
			return;
		}

		isReconnecting = true;

		if (error) {
			console.error(`Socket disconnected for user ${userId}`, error);
		}

		try {
			// Reset the promise to allow a new listener to be created
			eventSubListenerPromise = null;

			// Attempt to recreate EventSub listener
			await getEventSubs();
			console.log('EventSub listener reconnected successfully.');
		} catch (e) {
			console.error('Failed to reconnect EventSub listener:', e);
			process.exit(1);
		} finally {
			isReconnecting = false; // Reset reconnection flag
		}
	});
	eventSubListener.onUserSocketConnect(async (userId: string) => {
		console.log(`Socket connected for user ${userId}`);
	});
	eventSubListener.onSubscriptionCreateSuccess(async (subscription) => {
		const Enviroment = process.env.Enviroment as string;

		try {
			if (Enviroment === 'debug') {
				console.log(
					`(SCS) SubscriptionID: ${subscription.id}, SubscriptionAuthUserId: ${subscription.authUserId}`,
				);
				// await SubscriptionModel.deleteMany({});
				console.log('All existing subscriptions deleted in dev environment.');
			}
			// Check if the subscription already exists in MongoDB
			const existingSubscription = await SubscriptionModel.findOne({
				subscriptionId: subscription.id,
				authUserId: subscription.authUserId,
			});

			if (existingSubscription) {
				if (process.env.Enviroment === 'debug') {
					console.log(
						`Subscription already exists in database: SubscriptionID: ${subscription.id}, SubscriptionAuthUserId: ${subscription.authUserId}`,
					);
				}
				return; // Exit early if subscription already exists
			}

			// Save subscription details to MongoDB
			const newSubscription = new SubscriptionModel({
				subscriptionId: subscription.id,
				authUserId: subscription.authUserId,
			});
			await newSubscription.save();
			console.log(
				`New subscription saved to database: SubscriptionID: ${subscription.id}, SubscriptionAuthUserId: ${subscription.authUserId}`,
			);
			// mark any retry record as succeeded
			try {
				await retryManager.markSucceeded(subscription.id, String(subscription.authUserId ?? ''));
			} catch (e) {
				console.warn('Failed to clear retry record on subscription success', e);
			}
		} catch (error) {
			console.error('Error saving subscription to database:', error);
		}
	});
	eventSubListener.onSubscriptionCreateFailure(async (subscription, error) => {
		const Enviroment = process.env.Enviroment as string;
		if (Enviroment === 'debug') {
			console.error(
				`(SCF){SubscriptionID: ${subscription.id}, SubscriptionAuthUserId: ${subscription.authUserId}`,
				error,
			);
			// process.exit(1);
		}
		if (error instanceof Error && error.message.includes('409')) {
			console.log('Handling duplicate subscription conflict.');
			// Here, you could attempt to delete the existing subscription and retry the creation
			const tbd = await SubscriptionModel.findOneAndDelete({
				subscriptionId: subscription.id,
				authUserId: subscription.authUserId,
			});
			// Optionally, attempt to re-create the subscription if necessary
			// await recreateSubscription(subscription);
		}

		// Record failure in retry manager so it can be retried later
		try {
			await retryManager.markFailed(subscription.id, String(subscription.authUserId ?? ''), error?.toString?.() ?? String(error));
			console.log('Recorded subscription create failure for retry:', subscription.id);
		} catch (e) {
			console.warn('Failed to record subscription retry state', e);
		}
	});
	eventSubListener.onSubscriptionDeleteSuccess(async (subscription) => {
		try {
			const Enviroment = process.env.Enviroment as string;
			if (Enviroment === 'debug') {
				console.log(
					`(SDS){SubscriptionID: ${subscription.id}, SubscriptionAuthUserId: ${subscription.authUserId}`,
				);
			}
			// Check if the subscription exists in MongoDB
			const existingSubscription = await SubscriptionModel.findOne({
				subscriptionId: subscription.id,
				authUserId: subscription.authUserId,
			});

			if (!existingSubscription) {
				console.log(
					`(DS) Subscription not found in database: SubscriptionID: ${subscription.id}, SubscriptionAuthUserId: ${subscription.authUserId}`,
				);
				return; // Exit early if subscription not found
			}

			// Delete subscription from MongoDB
			const deletedSubscription = await SubscriptionModel.findOneAndDelete({
				subscriptionId: subscription.id,
				authUserId: subscription.authUserId,
			});

			if (deletedSubscription) {
				console.log(
					`(DS) Deleted Subscription: SubscriptionID: ${deletedSubscription.subscriptionId}, SubscriptionAuthUserId: ${deletedSubscription.authUserId}`,
				);
			} else {
				console.log(
					`(DS) Subscription not found in database during delete operation: SubscriptionID: ${subscription.id}, SubscriptionAuthUserId: ${subscription.authUserId}`,
				);
			}
		} catch (error) {
			console.error('Error deleting subscription from database:', error);
		}
	});
	eventSubListener.onSubscriptionDeleteFailure((subscription, error) => {
		try {
			const Enviroment = process.env.Enviroment as string;
			if (Enviroment === 'debug') {
				console.error(
					`(SDF){SubscriptionID: ${subscription.id}, SubscriptionAuthUserId: ${subscription.authUserId}`,
					error,
				);
			}
		} catch (error) {
			console.error(error);
		}
	});

	return eventSubListener;
}

/**
 * Gets the EventSubWsListener instance, creating it if it doesn't already exist.
 * @returns A Promise resolving to the EventSubWsListener instance.
 */
export async function getEventSubs(): Promise<EventSubWsListener> {
	if (!eventSubListenerPromise) {
		eventSubListenerPromise = createEventSubListener();
	}
	return eventSubListenerPromise;
}

/**
 * Force recreation of the EventSub listener. This clears the cached listener
 * promise and creates a fresh listener which will re-register subscriptions.
 * Used by the retry worker to trigger re-subscription attempts.
 */
export async function recreateEventSubs(): Promise<void> {
	// Reset the promise so getEventSubs will create a new listener
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore - eventSubListenerPromise is module scoped above
	eventSubListenerPromise = null;
	await getEventSubs();
}

/**
 * Create subscriptions for a single broadcaster using their access token.
 * This creates a short-lived EventSubWsListener using a StaticAuthProvider
 * built from the broadcaster's token and registers minimal handlers so the
 * listener will create EventSub subscriptions for that broadcaster.
 */
export async function createSubscriptionsForAuthUser(authUserId: string, accessToken: string): Promise<void> {
	if (!accessToken) throw new Error('No access token provided for resubscribe');
	const clientId = process.env.TWITCH_CLIENT_ID as string;
	if (!clientId) throw new Error('TWITCH_CLIENT_ID not set');

	// subscription types we want to ensure exist
	const subs = [
		{ type: 'stream.online', version: '1' },
		{ type: 'stream.offline', version: '1' },
		{ type: 'channel.follow', version: '1' },
		{ type: 'channel.subscribe', version: '1' },
		{ type: 'channel.subscription.message', version: '1' },
		{ type: 'channel.cheer', version: '1' },
	];

	const apiClient = new ApiClient({ authProvider: new StaticAuthProvider(clientId, accessToken), logger: { minLevel: 'ERROR' } });

	// Twurple exposes EventSub helpers on the ApiClient in recent versions. Prefer that.
	type EventSubHelper = { createSubscription: (body: unknown) => Promise<unknown> };
	const eventSubHelper: EventSubHelper | null = (apiClient as unknown as Record<string, unknown>).eventSub as EventSubHelper
		|| (apiClient as unknown as Record<string, unknown>).eventsub as EventSubHelper
		|| null;

	if (eventSubHelper && typeof eventSubHelper.createSubscription === 'function') {
		// use Twurple helper to create subscriptions
		for (const s of subs) {
			const body = {
				type: s.type,
				version: s.version,
				condition: { broadcaster_user_id: authUserId },
				transport: { method: 'websocket' },
			};
			try {
				await eventSubHelper.createSubscription(body);
				console.log(`Created EventSub ${s.type} for ${authUserId} via Twurple`);
			} catch (err) {
				// Attempt to read HTTP status code from several possible shapes without using `any`
				const getStatus = (e: unknown): number | undefined => {
					if (!e || typeof e !== 'object') return undefined;
					const rec = e as Record<string, unknown>;
					if (typeof rec.status === 'number') return rec.status;
					const resp = rec.response as Record<string, unknown> | undefined;
					if (resp && typeof resp.status === 'number') return resp.status;
					return undefined;
				};
				const status = getStatus(err);
				const errStr = String(err);
				if (status === 409 || errStr.includes('409')) {
					console.log(`EventSub ${s.type} for ${authUserId} already exists (409) via Twurple`);
				} else {
					console.warn(`Twurple EventSub create failed for ${s.type}:`, err);
					throw err;
				}
			}

			// small delay to reduce chance of rate-limit bursts
			// eslint-disable-next-line no-await-in-loop
			await sleep(250);
		}
		return;
	}

	// Fallback: if helper not available, create a short-lived listener to register handlers
	const tempListener = new EventSubWsListener({ apiClient, logger: { minLevel: 'ERROR' } });
	try {
		tempListener.start();
		// register minimal no-op handlers so the listener creates subscriptions
		tempListener.onStreamOnline(authUserId as UserIdResolvable, async () => undefined);
		tempListener.onStreamOffline(authUserId as UserIdResolvable, async () => undefined);
		tempListener.onChannelFollow(authUserId as UserIdResolvable, authUserId as UserIdResolvable, async () => undefined);
		tempListener.onChannelSubscription(authUserId as UserIdResolvable, async () => undefined);
		tempListener.onChannelSubscriptionMessage(authUserId as UserIdResolvable, async () => undefined);
		tempListener.onChannelCheer(authUserId as UserIdResolvable, async () => undefined);

		// allow some time for subscriptions to be created
		await sleep(2000);
	} finally {
		try {
			const stopProp = (tempListener as unknown as Record<string, unknown>)['stop'];
			if (typeof stopProp === 'function') {
				const fn = stopProp as (...args: unknown[]) => unknown;
				const res = fn.call(tempListener);
				if (res && typeof (res as Promise<unknown>).then === 'function') await res as Promise<unknown>;
			}
		} catch (e) {
			// log unexpected stop errors at debug level
			// eslint-disable-next-line no-console
			console.debug('Failed to stop temp EventSub listener', (e as Error).message);
		}
	}
}
