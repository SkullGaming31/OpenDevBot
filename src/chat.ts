import { ChatClient } from '@twurple/chat';
import { PrivateMessage } from '@twurple/chat/lib';
import axios from 'axios';
import countdown from 'countdown';
import { EmbedBuilder, WebhookClient } from 'discord.js';

import { getUserApi } from './api/userApiClient';
import { getAuthProvider } from './auth/authProvider';
import LurkMessageModel from './database/models/LurkModel';
import QuoteModel, { IQuote } from './database/models/Quote';
import { IDadJoke } from './interfaces/apiInterfaces';
import { CommandUssageWebhookTOKEN, TwitchActivityWebhookID, TwitchActivityWebhookToken, commandUsageWebhookID } from './util/constants';

const commands = new Set<string>(['ping', 'game']); // initialize with the commands you've already implemented
// registerCommand('newCommand');// single Command or multiple commands, works same to remove commands instead you use RemoveCommands()
// registerCommand(['setTitle', 'setgame']);// add name of command for the commands list when someone runs !commands it will give them all the commands in the list
// removeCommand('newCommand');// single Command or multiple commands, works same to remove commands instead you use RemoveCommands()
// removeCommand(['setTitle', 'setgame']);// add name of command for the commands list when someone runs !commands it will give them all the commands in the list

// Function to add new commands to the set
function registerCommand(newCommands: string | string[]) {
	if (!Array.isArray(newCommands)) {
		newCommands = [newCommands]; // convert single command to array
	}
	newCommands.forEach((command) => {
		commands.add(command);
	});
}
// Function to remove commands from the set
function removeCommands(commandsToRemove: string[]): void {
	if (!Array.isArray(commandsToRemove)) {
		commandsToRemove = [commandsToRemove]; // convert single command to array
	}
	commandsToRemove.forEach((command) => {
		// Check if the command is in the set before deleting it
		if (commands.has(command)) {
			commands.delete(command);
		} else {
			console.warn(`Command "${command}" not found`);
		}
	});
}

// Function to generate the list of available commands
function generateCommandList(): string { return 'Available commands: !' + Array.from(commands).join(', !'); }

// load commands

// Holds All Twitch Chat Stuff
export async function initializeChat(): Promise<void> {
	const chatClient = await getChatClient();

	const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });

	const commandHandler = async (channel: string, user: string, text: string, msg: PrivateMessage) => {
		console.log(`${msg.userInfo.displayName} Said: ${text} in ${channel}`);

		registerCommand(['settitle', 'setgame', 'lurk', 'id', 'followage', 'accountage', 'uptime', 'dadjoke', 'games', 'warframe', 'vigor', 'me', 'mod', 'socials', 'array']);
		
		const userApiClient = await getUserApi();

		const twitchActivity = new WebhookClient({ id: TwitchActivityWebhookID, token: TwitchActivityWebhookToken });

		
		const userID = '31124455';// get twitchId from database 31124455

		const broadcasterID = await userApiClient.channels.getChannelInfoById(userID);
		if (broadcasterID?.id === undefined) return;
	
		const display = msg.userInfo.displayName;
		const staff = msg.userInfo.isMod || msg.userInfo.isBroadcaster;
		const canadiendragon = await userApiClient.channels.getChannelInfoById(userID);
		
		let lurkingUsers: string[] = [];
		const savedLurkMessage = await LurkMessageModel.findOne({ displayName: msg.userInfo.displayName });

		if (savedLurkMessage && text.includes(`@${savedLurkMessage.displayName}`)) {
			chatClient.say(channel, `${msg.userInfo.displayName}, ${user}'s lurk message: ${savedLurkMessage.message}`);
		}
	
		if (text.includes('overlay expert') && channel === '#canadiendragon') {
			chatClient.say(channel, `Hey ${display}, are you tired of spending hours configuring your stream's overlays and alerts? Check out Overlay Expert! With our platform, you can create stunning visuals for your streams without any OBS or streaming software knowledge. Don't waste time on technical details - focus on creating amazing content. Visit https://overlay.expert/support for support and start creating today! 🎨🎥, For support, see https://overlay.expert/support`);
		}
		else if (text.includes('overlay designer') && channel === '#canadiendragon') {
			chatClient.say(channel, `Hey ${display}, do you have an eye for design and a passion for creating unique overlays? Check out https://overlay.expert/designers to learn how you can start selling your designs and making money on Overlay Expert. Don't miss this opportunity to turn your creativity into cash!`);
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
			case 'array':
				lurkingUsers = [];
				chatClient.say(channel, 'Lurking Array set back to empty');
				break;
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
							console.error(err.message);
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
										chatClient.say(channel, `QuoteID:${quote._id}: "${quote.content}"`);
										// handle success
									}
								});
							}
						});
					}
					break;
				default:
					chatClient.say(channel, 'Usage: !quote [add|remove|list] [quote]');
					break;
				}
				break;
			case 'settitle':
				switch (channel) {
				case '#canadiendragon':
					try {
						if (staff) {
							const setTitle = await userApiClient.channels.updateChannelInfo(canadiendragon?.id!, { 'title': `${args.join(' ')}` }); // Channel ID:'31124455'
							chatClient.say(channel, `${msg.userInfo.displayName}, has updated the channel title to ${canadiendragon?.title}`);
							const helixUser = await userApiClient.users.getUserByName(args[0].replace('@', ''));
							const commandEmbed = new EmbedBuilder()
								.setTitle('Command Used[settitle]')
								.setAuthor({ name: msg.userInfo.displayName, iconURL: helixUser?.profilePictureUrl })
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
								.setFooter({ text: `Channel: ${channel.replace('#', '')}, TwitchID: ${msg.userInfo.userId}` })
								.setTimestamp();
						} else {
							chatClient.say(channel, `${display}, you are not a moderator or the broadcaster you do not have access to these commands, please run /help to find out what commands you can use.`);
						}
					} catch (error: any) {
						console.error(error.message);
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
						const helixUser = await userApiClient.users.getUserByName(args[0].replace('@', ''));
						chatClient.say(channel, `${display}, has changed the channel category to ${gamename?.name}`);

						const commandEmbed = new EmbedBuilder()
							.setTitle('Command Used')
							.setAuthor({ name: msg.userInfo.displayName, iconURL: helixUser?.profilePictureUrl })
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

						await commandUsage.send({ embeds: [commandEmbed] });
						// console.log(`${gamename?.name}: ${gamename?.id}`);
					} else {
						chatClient.say(channel, `${display}, you are not a moderator or the broadcaster you do not have access to this command`);
					}
					break;
				}
				break;
			case 'game':
				switch (channel) {
				case '#canadiendragon':
					chatClient.say(channel, `${display}, ${broadcasterID?.displayName} is currently playing ${broadcasterID?.gameName} GameID: ${broadcasterID?.gameId}`);
					break;
				}
				break;
			case 'lurk':
				const toggle = args.shift();
				const message = args.join(' ');
				const savedLurkMessage = await LurkMessageModel.findOne({ userId: msg.userInfo.userId });
				
				if (toggle === 'on') {
					if (message) {
						if (savedLurkMessage) {
							savedLurkMessage.message = message;
							await savedLurkMessage.save();
						} else {
							await LurkMessageModel.create({ userId: msg.userInfo.userId, displayName: msg.userInfo.displayName, message });
						}
						lurkingUsers.push(user);
						chatClient.say(channel, `${user} is now lurking with the message: ${message}`);
					} else {
						const lurkMessage = savedLurkMessage ? savedLurkMessage.message : '';
						lurkingUsers.push(user);
						chatClient.say(channel, `${msg.userInfo.displayName} is now lurking ${lurkMessage ? `with the message: ${lurkMessage}` : 'No Lurk Message was Provided'}`);
					}
				} else if (toggle === 'off') {
					const index = lurkingUsers.indexOf(user);
					if (index > -1) {
						lurkingUsers.splice(index, 1);
						chatClient.say(channel, `${msg.userInfo.displayName} is no longer lurking`);
					}
					if (savedLurkMessage) {
						await savedLurkMessage.remove();
					}
				}
				
				const numLurkers = await LurkMessageModel.countDocuments();
				chatClient.say(channel, `Currently ${numLurkers} people are lurking`);
				// Display lurk message if @mentioned
				if (savedLurkMessage && message.includes('@')) {
					chatClient.say(channel, `${msg.userInfo.displayName}, ${user}'s lurk message: ${savedLurkMessage.message}`);
				}
				break;
			case 'id':
				const userToLookup = args[0] ? args[0].replace('@', '') : msg.userInfo.userId;
				const userLookup = await userApiClient.users.getUserByName(userToLookup);
				try {
					if (userLookup) {
						chatClient.say(channel, `${display} your TwitchId is ${userLookup.id}`);
					} else {
						chatClient.say(channel, `${display} could not find user ${userToLookup}`);
					}
				} catch (err: any) {
					console.error(err.message);
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
				const response = await axios.get<IDadJoke>('https://icanhazdadjoke.com/', {
					headers: {
						'Accept': 'application/json',
						'User-Agent': 'Personal Twitch ChatBot (https://github.com/canadiendragon/skulledbotTwitch)'
					}
				});
				console.log(response.data);
				try {
					if (response.data.status === 200) {
						chatClient.say(channel, `${response.data.joke}`);
					} else {
						console.info(response.data.status);
					}
				} catch (error) {
					console.error(error);
				}
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
				chatClient.say(channel, generateCommandList());
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
						try {
							const userSearch = await userApiClient.users.getUserByName(args[1].replace('@', ''));
							if (userSearch?.id === undefined) return;
							const modLookup = await userApiClient.moderation.getModerators(channel); // (channel, 'that person is a higer rank then VIP and can not be assigned this role');
							if (modLookup.data[1].userId === userSearch?.id) return chatClient.say(channel, `${args[1]} has a higer rank then VIP and can not be assigned this role`);
							const vipLookup = await userApiClient.channels.getVips(broadcasterID.id, { limit: 10 });
							if (vipLookup.data[1].id === userSearch?.id) return await chatClient.say(channel, 'this user is already a vip');
							if (!args[1]) return await chatClient.say(channel, `${display}, Usage: -mod vip @name`);
							await userApiClient.channels.addVip(broadcasterID?.id, userSearch?.id).then(async () => { await chatClient.say(channel, `@${args[1]} has been added as VIP`); });

							const vipEmbed = new EmbedBuilder()
								.setTitle('Twitch Channel Purge Event')
								.setAuthor({ name: `${userSearch.displayName}`, iconURL: `${userSearch.profilePictureUrl}` })
								.setColor('Red')
								.addFields([
									{
										name: 'Executer',
										value: `${msg.userInfo.displayName}`,
										inline: true
									},
									{
										name: 'Mod',
										value: `${msg.userInfo.isMod}`,
										inline: true
									},
									{
										name: 'broadcaster',
										value: `${msg.userInfo.isBroadcaster}`,
										inline: true
									}
								])
								.setFooter({ text: `${msg.userInfo.displayName} just viped ${args[1].replace('@', '')} in ${channel}'s twitch channel` })
								.setTimestamp();
							await twitchActivity.send({ embeds: [vipEmbed] });
						} catch (error) { console.error(error); }
						break;
					case 'unvip':
						try {
							const userSearch = await userApiClient.users.getUserByName(args[1].replace('@', ''));
							if (userSearch?.id === undefined) return;
							if (!args[1]) return chatClient.say(channel, `${display}, Usage: -mod unvip @name`);
							// const vipLookup = await userApiClient.channels.getVips(broadcasterID.id, { limit: 20 });
							// if (vipLookup.data[1].id === userSearch?.id) return await chatClient.say(channel, 'this user is already a vip');
							if (userSearch) {
								await userApiClient.channels.removeVip(broadcasterID.id, userSearch?.id).then(async () => { await chatClient.say(channel, `@${args[1].replace('@', '')} has been removed from VIP status`); });
							} else {
								console.error('Something happened while searching for user');
							}

							const unVIPEmbed = new EmbedBuilder()
								.setTitle('Twitch Channel Purge Event')
								.setAuthor({ name: `${userSearch.displayName}`, iconURL: `${userSearch.profilePictureUrl}` })
								.setColor('Red')
								.addFields([
									{
										name: 'Executer',
										value: `${msg.userInfo.displayName}`,
										inline: true
									},
									{
										name: 'Mod',
										value: `${msg.userInfo.isMod}`,
										inline: true
									},
									{
										name: 'broadcaster',
										value: `${msg.userInfo.isBroadcaster}`,
										inline: true
									}
								])
								.setFooter({ text: `${msg.userInfo.displayName} just Unviped ${args[1].replace('@', '')} in ${channel}'s twitch channel` })
								.setTimestamp();
							await twitchActivity.send({ embeds: [unVIPEmbed] });
						} catch (error) { console.error(error); }
						break;
					case 'mod':
						try {
							if (!args[1]) return chatClient.say(channel, `${display}, Usage: -mod mod @name`);
							const userSearch = await userApiClient.users.getUserByName(args[1].replace('@', ''));
							if (userSearch?.id === undefined) return;
							await userApiClient.moderation.addModerator(userID, userSearch?.id).then(async () => { await chatClient.say(channel, `${args[1]} has been givin the Moderator Powers`); });
	
							const moderatorEmbed = new EmbedBuilder()
								.setTitle('Twitch Channel MOD Event')
								.setAuthor({ name: `${userSearch.displayName}`, iconURL: `${userSearch.profilePictureUrl}` })
								.setColor('Blue')
								.addFields([
									{
										name: 'Executer',
										value: `${msg.userInfo.displayName}`,
										inline: true
									},
									{
										name: 'Mod',
										value: `${msg.userInfo.isMod}`,
										inline: true
									},
									{
										name: 'broadcaster',
										value: `${msg.userInfo.isBroadcaster}`,
										inline: true
									}
								])
								.setFooter({ text: `${msg.userInfo.displayName} just modded ${args[1].replace('@', '')} in ${channel}'s twitch channel` })
								.setTimestamp();
							await twitchActivity.send({ embeds: [moderatorEmbed] });
						} catch (error) { console.error(error); }
						break;
					case 'unmod':
						if (!args[1]) return chatClient.say(channel, `${display}, Usage: -mod unmod @name`);
						try {
							const userSearch = await userApiClient.users.getUserByName(args[1].replace('@', ''));
							if (userSearch?.id === undefined) return;
							await userApiClient.moderation.removeModerator(userID, userSearch?.id).then(async () => { await chatClient.say(channel, `${args[1]} has had there moderator powers removed`); });
	
							const unModeratorEmbed = new EmbedBuilder()
								.setTitle('Twitch Channel Purge Event')
								.setAuthor({ name: `${userSearch.displayName}`, iconURL: `${userSearch.profilePictureUrl}` })
								.setColor('Red')
								.addFields([
									{
										name: 'Executer',
										value: `${msg.userInfo.displayName}`,
										inline: true
									},
									{
										name: 'Mod',
										value: `${msg.userInfo.isMod}`,
										inline: true
									},
									{
										name: 'broadcaster',
										value: `${msg.userInfo.isBroadcaster}`,
										inline: true
									}
								])
								.setFooter({ text: `${msg.userInfo.displayName} just unmodded ${args[1].replace('@', '')} in ${channel}'s twitch channel` })
								.setTimestamp();
							await twitchActivity.send({ embeds: [unModeratorEmbed] });
						} catch (error) {
							console.error(error);
						}
						break;
					case 'purge':
						if (!args[1]) return chatClient.say(channel, `${display}, Usage: -mod purge @name (duration[seconds]) (reason)`);
						if (!args[2]) return chatClient.say(channel, `${display}, please specify a duration in seconds to purge texts`);
						if (!args[3]) args[3] = 'No Reason Provided';
						try {
							const userSearch = await userApiClient.users.getUserByName(args[1].replace('@', ''));
							if (userSearch?.id === undefined || null) return;
							if (userSearch.id === broadcasterID.id) return chatClient.say(channel, 'You can\'t ban/purge this user');
							await userApiClient.moderation.banUser(broadcasterID.id, broadcasterID.id, {
								user: userSearch.id,
								duration: Number(args[2]),
								reason: args[3],
							});
							const purgeEmbed = new EmbedBuilder()
								.setTitle('Twitch Channel Purge Event')
								.setAuthor({ name: `${userSearch.displayName}`, iconURL: `${userSearch.profilePictureUrl}` })
								.setColor('Red')
								.addFields([
									{
										name: 'Executer',
										value: `${msg.userInfo.displayName}`,
										inline: true
									},
									{
										name: 'Mod',
										value: `${msg.userInfo.isMod}`,
										inline: true
									},
									{
										name: 'broadcaster',
										value: `${msg.userInfo.isBroadcaster}`,
										inline: true
									}
								])
								.setFooter({ text: `${msg.userInfo.displayName} just purged ${args[1].replace('@', '')} in ${channel}'s twitch channel` })
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
							const userSearch = await userApiClient.users.getUserByName(args[1].replace('@', ''));
							if (userSearch?.id === undefined) return;
							try {
								await userApiClient.moderation.banUser(userID, userID, { user: userSearch?.id, reason: args[2] }).then(async () => { await chatClient.say(channel, `@${args[1].replace('@', '')} has been banned for Reason: ${args[2]}`); });
								await chatClient.say(channel, `@${args[1].replace('@', '')} has been banned for Reason: ${args[2]}`);

								const banEmbed = new EmbedBuilder()
									.setTitle('Twitch Channel Purge Event')
									.setAuthor({ name: `${userSearch.displayName}`, iconURL: `${userSearch.profilePictureUrl}` })
									.setColor('Red')
									.addFields([
										{
											name: 'Executer',
											value: `${msg.userInfo.displayName}`,
											inline: true
										},
										{
											name: 'Mod',
											value: `${msg.userInfo.isMod}`,
											inline: true
										},
										{
											name: 'broadcaster',
											value: `${msg.userInfo.isBroadcaster}`,
											inline: true
										},
										{
											name: 'Reason',
											value: `${args[2]}`,
											inline: true
										}
									])
									.setFooter({ text: `${msg.userInfo.displayName} just Banned ${args[1].replace('@', '')} in ${channel}'s twitch channel` })
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
						const userSearch = await userApiClient.users.getUserByName(args[1].replace('@', ''));
						if (userSearch?.id === undefined) return;
						const userInfo = await userApiClient.channels.getChannelInfoById(userSearch?.id);
						const stream = await userApiClient.streams.getStreamByUserName(broadcasterID.name);
						if (stream !== null) { userApiClient.chat.shoutoutUser(broadcasterID.id, userSearch?.id, broadcasterID.id); }

						await chatClient.say(channel, `Yay! Look who's here! @${userInfo?.displayName} just got mentioned! Let's all head over to their awesome Twitch channel at https://twitch.tv/${userInfo?.name.toLowerCase()} and show them some love! By the way, if you're wondering what game they were last playing, it was ${userInfo?.gameName}. So go check them out and join in on the fun!`);
						const banEmbed = new EmbedBuilder()
							.setTitle('Twitch Shoutout')
							.setAuthor({ name: `${userSearch.displayName}`, iconURL: `${userSearch.profilePictureUrl}` })
							.setColor('Yellow')
							.addFields([
								{
									name: 'Executer',
									value: `${msg.userInfo.displayName}`,
									inline: true
								},
								{
									name: 'Mod',
									value: `${msg.userInfo.isMod}`,
									inline: true
								},
								{
									name: 'broadcaster',
									value: `${msg.userInfo.isBroadcaster}`,
									inline: true
								}
							])
							.setThumbnail(userSearch.profilePictureUrl)
							.setURL(`https://twitch.tv/${userInfo?.name.toLowerCase()}`)
							.setFooter({ text: `${msg.userInfo.displayName} just shouted out ${userInfo?.displayName} in ${channel}'s twitch channel` })
							.setTimestamp();
						await twitchActivity.send({ embeds: [banEmbed] });
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
					chatClient.say(channel, `${display}, canadiendragon's Snapchat: https://snapchat.com/add/skullgaming31`);
					break;
				case 'facebook':
					chatClient.say(channel, `${display}, canadiendragon's Facebook: canadiendragon Entertainment`);
					break;
				case 'tiktok':
					chatClient.say(channel, `${display}, canadiendragon's Tik-Tok: https://tiktok.com/@canadiendragon`);
					break;
				case 'discord':
					chatClient.say(channel, `${display}, canadiendragon's Discord: https://discord.com/invite/dHpehkD6M3`);
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
				case 'website':
					const website_URL = 'https://canadiendragon.com';
					chatClient.say(channel, `${display}, website is ${website_URL}`);
					break;
				default:
					chatClient.say(channel, 'Which social are you looking for?, Usage: -socials twitter|instagram|snapchat|facebook|tictok|discord|merch|tip|website');
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
		chatClientInstance.connect();
		console.log('The ChatClient has started');
	}
	
	return chatClientInstance;
}