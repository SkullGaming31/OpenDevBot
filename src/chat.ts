import { EmbedBuilder, WebhookClient } from 'discord.js';
import { ChatClient } from '@twurple/chat';
import { PrivateMessage } from '@twurple/chat/lib';
import countdown from 'countdown';

import { getAuthProvider } from './auth/authProvider';
import QuoteModel, { IQuote } from './database/models/Quote';
import { getUserApi } from './api/userApiClient';
import axios from 'axios';
import { TwitchActivityWebhookID, TwitchActivityWebhookToken } from './util/constants';

// Holds All Twitch Chat Stuff
export async function initializeChat(): Promise<void> {
	const chatClient = await getChatClient();
	const commandHandler = async (channel: string, user: string, text: string, msg: PrivateMessage) => {
		console.log(`${msg.userInfo.displayName} Said: ${text} in ${channel}`);
		
		const userApiClient = await getUserApi();

		const twitchActivity = new WebhookClient({ id: TwitchActivityWebhookID, token: TwitchActivityWebhookToken });

		const userID = '31124455';// get twitchId from database
		const broadcasterID = await userApiClient.channels.getChannelInfoById(userID);
		if (broadcasterID?.id === undefined) return;
	
		const display = msg.userInfo.displayName;
		const staff = msg.userInfo.isMod || msg.userInfo.isBroadcaster;
		const canadiendragon = await userApiClient.channels.getChannelInfoById(userID);
		// eslint-disable-next-line prefer-const
		let lurkingUsers = [];
	
		if (text.includes('overlay expert') && channel === '#canadiendragon') {
			chatClient.say(channel, `${display}, Create overlays and alerts for your Twitch streams without OBS or any streaming software. For support, see https://overlay.expert/support`);
		}
		else if (text.includes('overlay designer') && channel === '#canadiendragon') {
			chatClient.say(channel, `${display}, are you an overlay designer and want to make money from them check out https://overlay.expert/designers, all information should be listed on that page for you to get started.`);
		}
		else if (text.includes('wl') && channel === '#canadiendragon') {
			const amazon = 'https://www.amazon.ca/hz/wishlist/ls/354MPD0EKWXZN?ref_=wl_share';
			setTimeout(() => {
				chatClient.say(channel, `check out the Wish List here if you would like to help out the stream ${amazon}`);
			}, 1800000);
		}
		else if (text.includes('Want to become famous?') && channel === '#canadiendragon') {
			const mods = msg.userInfo.isMod;
			if (msg.userInfo.userId === userID || mods) return;
			await userApiClient.moderation.deleteChatMessages(userID, userID, msg.id);
			await userApiClient.moderation.banUser(userID, userID, { user: msg.userInfo.userId, reason: 'Promoting selling followers to a broadcaster for twitch' });
			chatClient.say(channel, `${display} bugger off with your scams and frauds, you have been removed from this channel, have a good day`);
			const banEmbed = new EmbedBuilder()
				.setTitle('Automated Ban')
				.setAuthor({ name: `${msg.userInfo.displayName}` })
				.setColor('Red')
				.addFields([
					{
						name: 'User: ',
						value: `${msg.userInfo.displayName}`,
						inline: true
					},
					{
						name: 'Reason',
						value: 'Promoting of selling followers to a broadcaster for twitch',
						inline: true
					}
				])
				.setFooter({ text: `Someone just got BANNED from ${channel}'s channel` })
				.setTimestamp();
	
			await twitchActivity.send({ embeds: [banEmbed] });
		}
		else if (text.startsWith('!')) {
			const args = text.slice(1).split(' ');
			const command = args.shift()?.toLowerCase();
	
			switch (command) {
			case 'ping':
				await chatClient.say(channel, `${display}, Im online and working correctly`);
				break;
			case 'quote':
				switch (args[0]) {
				case 'add':
					if (!args[1]) return chatClient.say(channel, '!quote add [quote]');
					const content = args.slice(1).join(' '); // extract the quote content from the arguments
					const quote = new QuoteModel({ content }); // create a new Quote document with the content
					quote.save((err: any, savedQuote: IQuote) => {
						if (err) {
							console.error(err);
							// handle error
						} else {
							console.log(`Quote added: "${savedQuote.content}"`);
							chatClient.say(channel, 'Quote Added to database');
							// handle success
						}
					});
					break;
				case 'remove':
					const quoteId = args[1]; // extract the quote ID from the arguments
					QuoteModel.findByIdAndRemove(quoteId, (err: any, removedQuote: IQuote | null) => {
						if (err) {
							console.error(err);
							// handle error
						} else if (!removedQuote) {
							console.log(`Quote with ID ${quoteId} not found`);
							// handle not found
						} else {
							console.log(`Quote removed: "${removedQuote.content}"`);
							chatClient.say(channel, 'Quote Removed to database');
							// handle success
						}
					});
					break;
				case 'list':
					if (args[1]) {
						// list specific quote by ID
						const quoteId = args[1];
						QuoteModel.findById(quoteId, (err: any, quote: IQuote | null) => {
							if (err) {
								console.error(err);
								// handle error
							} else if (!quote) {
								chatClient.say(channel, `Quote with ID ${quoteId} not found`);
								// handle not found
							} else {
								chatClient.say(channel, `#${quote._id}: "${quote.content}"`);
								// handle success
							}
						});
					} else {
						// list a random quote
						QuoteModel.countDocuments().exec((err: any, count: number) => {
							if (err) {
								console.error(err);
								// handle error
							} else {
								const randomIndex = Math.floor(Math.random() * count);
								QuoteModel.findOne().skip(randomIndex).exec((err: any, quote: IQuote | null) => {
									if (err) {
										console.error(err);
										// handle error
									} else if (!quote) {
										chatClient.say(channel, 'No quotes found');
										// handle no quotes
									} else {
										chatClient.say(channel, `#${quote._id}: "${quote.content}"`);
										// handle success
									}
								});
							}
						});
					}
					break;
				}
				break;
			case 'settitle':
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
				break;
			case 'setgame':
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
				break;
			case 'game':
				switch (channel) {
				case '#canadiendragon':
					chatClient.say(channel, `${display}, ${broadcasterID?.displayName} is currently playing ${broadcasterID?.gameName}`);
					break;
				}
				break;
			case 'lurk':
				const [lurkMessage] = args;
				
				if (lurkMessage) {
					lurkingUsers.push(user);
					chatClient.say(channel, `${user} is now lurking with the message: ${lurkMessage}`);
				} else {
					lurkingUsers.push(user);
					chatClient.say(channel, `${user} is now lurking`);
				}
				chatClient.say(channel, `Currently ${lurkingUsers.length} people are lurking`);
				break;
			case 'id':
				const userLookup = await userApiClient.users.getUserByName(args[0].replace('@', ''));
				try {
					if (userLookup) {
						chatClient.say(channel, `${display} your TwitchId is ${userLookup.id}`);
					} else {
						chatClient.say(channel, `${display} you must tag yourself or someone else to use this command`);
					}
				} catch (error) {
					console.error(error);
					return;
				}
				break;
			case 'followage':
				const broadcasterId = msg.channelId!;
				const { data: [follow] } = await userApiClient.channels.getChannelFollowers(broadcasterId, broadcasterId, msg.userInfo.userId);
				if (follow) {
					const followStartTimestamp = follow.followDate.getTime();
					chatClient.say(channel, `@${display} You have been following for ${countdown(new Date(followStartTimestamp))}!`);
				}
				else {
					chatClient.say(channel, `@${display} You are not following!`);
				}
				break;
			case 'accountage':
				const account = await userApiClient.users.getUserByName(args[0] || msg.userInfo.userName);
				if (account) {
					chatClient.say(channel, `${account.creationDate}`);
				} else {
					chatClient.say(channel, `${user}, that name could not be found`);
				}
				break;
			case 'uptime':
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
				break;
			case 'dadjoke':
				const response = await axios.get('https://icanhazdadjoke.com/', {
					headers: {
						'Accept': 'application/json',
						'User-Agent': 'Personal Twitch ChatBot (https://github.com/canadiendragon/skulledbotTwitch)'
					}
				});
				chatClient.say(channel, `${response.data.joke}`);
				break;
			case 'games':
				switch (args[0]) {
				case 'dice':// 2 player + game highest roll wins, if more then 2 players get the same number they go into sudden death highest number wins
					const result = Math.floor(Math.random() * 12) + 1;
					chatClient.say(channel, `@${display}, you rolled a ${result}.`);
					break;
				case 'dig':// have a % chance to dig up the correct Hole and win currency prize Failed means you lose currency. -dig [amount] isFollower * 1.5 isSubscriber * 2
					/**
						* Total: 5 holes
						*  random number between 1-3 desides how many bombs are in play out of 5 holes
						*/
					const choice = ['Succedded', 'Failed'];
					const results = choice[Math.floor(Math.random() * choice.length)];
					if (results === 'Succedded') {
						console.log('successful');
					} else {
						console.log('failed');
					}
					chatClient.say(channel, `@${display} you have ${results}`);
					break;
				case 'duel': // duel someone else for points winner takes all
					if (!args[1]) return chatClient.say(channel, 'you must tag someone to duel');
					if (!args[2]) return chatClient.say(channel, 'you must specify an amount to bet');
					break;
				default:
					chatClient.say(channel, 'you must specify which game you want to play, Usage: !games dice|dig|duel');
					break;
				}
				break;
			case 'warframe':
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
					const pcWFRank = 1;
					chatClient.say(channel, `Mastery Rank: XBOX: ${xblWFRank}, PS4: ${ps4WFRank}, PC: ${pcWFRank}`);
					break;
				default:
					chatClient.say(channel, `${display}, Usage: -warframe [about, lore, rank]`);
					break;
				}
				break;
			case 'vigor':
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
				break;
			case 'commands':
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
				break;
			case 'me':
				const target = args[0];
				const action = ['slaps', 'kisses', 'hugs', 'punches', 'suckerPunches', 'kicks', 'pinches', 'uppercuts', 'licks'];
				const randomNumber = action[Math.floor(Math.random() * action.length)];
	
				if (!args[0]) return chatClient.say(channel, `${display}, you must tag someone to use this command`);
				chatClient.say(channel, `${display}, ${randomNumber} ${target}`);
				break;
			case 'mod':
				if (staff) {
					switch (args[0]) {
					case 'vip':
						// if (await apiClient.moderation.getModerators(channel) === args[1]) return console.log(channel, 'that person is a higer rank then VIP and can not be assigned this role');
						// if (await chatClient.getVips(channel) === args[1]) return chatClient.say(channel, 'this user is already a vip or higher');
						if (!args[1]) return await chatClient.say(channel, `${display}, Usage: -mod vip @name`);
						try {
							await userApiClient.channels.addVip(userID, args[1]);
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
							await userApiClient.channels.removeVip(userID, args[1].replace('@', ''));
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
							await userApiClient.moderation.addModerator(userID, args[1].replace('@', ''));
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
							await userApiClient.moderation.removeModerator(userID, args[1].replace('@', ''));
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
							await userApiClient.moderation.banUser(userID, userID, {
								user: args[1],
								duration: Number(args[2]),
								reason: args[3],
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
							await twitchActivity.send({ embeds: [purgeEmbed] });
						} catch (error) {
							console.error(error);
						}
						break;
					case 'ban':
						try {
							if (!args[1]) return chatClient.say(channel, `${display}, Usage: -mod ban @name (reason)`);
							if (!args[2]) args[2] = 'No Reason Provided';
							if (args[2]) args.join(' ');
							const search = await userApiClient.users.getUserByName(args[1].replace('@', ''));
							const user = await userApiClient.users.getUserById(search?.id!);
							
							try {
								await userApiClient.moderation.banUser(userID, userID, {
									user: user?.id!,
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
	
								await twitchActivity.send({ embeds: [banEmbed] });
							} catch (err) {
								console.error(err);
							}
						} catch (error) { console.error(error); }
						break;
					case 'shoutout':
					case 'so':
						if (!args[1]) return chatClient.say(channel, 'you must specify a person to shotout, Usage: !mod shoutout|so @name');
						const user = await userApiClient.users.getUserByName(args[1].replace('@', ''));
						const gameLastPlayed = await userApiClient.channels.getChannelInfoById(user?.id!);
						await chatClient.say(channel, `go check out @${args[1].replace('@', '')}, there an awesome streamer Check them out here: https://twitch.tv/${args[1].replace('@', '').toLowerCase()} last seen playing ${gameLastPlayed?.gameName}`);
						break;
					default:
						chatClient.say(channel, 'you must specify which mod action you want to do, Usage: !mod vip|unvip|purge|shoutout|ban|unban');
						break;
					}
				} else {
					chatClient.say(channel, `${display} you must be a mod or the broadcastor to use this command`);
				}
				break;
			case 'socials':
				switch (args[0]) {
				case 'instagram':
					await chatClient.say(channel, `${display}, canadiendragon's Instagram: https://instagram.com/canadiendragon`);
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
					chatClient.say(channel, `${display}, canadiendragon's Discord: https://discord.gg/dHpehkD6M3`);
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
				break;
			default:
				chatClient.say(channel, 'Command not recignized, please try again');
				break;
			}
		}
	};
	chatClient.onMessage(commandHandler);
}

// holds the ChatClient
let chatClientInstance: ChatClient;
export async function getChatClient(): Promise<ChatClient> {
	if (!chatClientInstance) {
		const authProvider = await getAuthProvider();

		chatClientInstance = new ChatClient({ 
			authProvider, 
			channels: ['canadiendragon'], 
			logger: { minLevel: 'error' },
			authIntents: ['chat'],
			botLevel: 'none',
			isAlwaysMod: true,
		});
		await chatClientInstance.connect();
		console.log('The ChatClient has started');
	}
	
	return chatClientInstance;
}