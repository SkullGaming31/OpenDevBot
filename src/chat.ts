import { ChatClient } from '@twurple/chat';
import { ChatMessage } from '@twurple/chat/lib';

import { HelixChatChatter, UserIdResolvable, UserNameResolvable } from '@twurple/api/lib';
import fs, { existsSync } from 'fs';
import path from 'path';
import { getUserApi } from './api/userApiClient';
import { getAuthProvider } from './auth/authProvider';
import { LurkMessageModel } from './database/models/LurkModel';
import knownBotsModel, { Bots } from './database/models/knownBotsModel';
import { ITwitchToken, TokenModel } from './database/models/tokenModel';
import { Command } from './interfaces/Command';
import { TwitchActivityWebhookID, TwitchActivityWebhookToken, broadcasterInfo, openDevBotID } from './util/constants';
import { sleep } from './util/util';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { IUser, UserModel } from './database/models/userModel';

const viewerWatchTimes: Map<string, { joinedAt: number; watchTime: number; intervalId: NodeJS.Timeout }> = new Map();
const UPDATE_INTERVAL = 30000; // 30 seconds
// Define your constants
let PERIODIC_SAVE_INTERVAL: number;

if (process.env.Enviroment === 'prod') {
	PERIODIC_SAVE_INTERVAL = 60000; // 1 minute in production
} else {
	PERIODIC_SAVE_INTERVAL = 30000; // 30 seconds in development or debug mode
}

export const commands: Set<string> = new Set<string>();
/**
 * Recursively loads all commands in a given directory and its subdirectories.
 * @param commandsDir The directory to load commands from
 * @param commands The object to store the loaded commands in
 */
async function loadCommands(commandsDir: string, commands: Record<string, Command>): Promise<void> {
	const commandModules = fs.readdirSync(commandsDir);

	for (const module of commandModules) {
		const modulePath = path.join(commandsDir, module);

		if (fs.statSync(modulePath).isDirectory()) {
			await loadCommands(modulePath, commands); // Recursively load commands in subdirectories
			continue;
		}

		if ((!isAllowedFileExtension(module) && isDevelopment()) || isIndexFile(module)) { continue; }

		// const { name } = path.parse(module);
		// const command = (await import(modulePath)).default;
		// commands[name] = command;
		// registerCommand(command);
		const { name } = path.parse(module);
		const command = (await import(modulePath)).default;
		// Set the name property within the command object if it's not already set
		command.name = command.name || name;
		commands[command.name] = command; // Register the command with its name
		registerCommand(command, name);
	}
}
function isAllowedFileExtension(module: string): boolean { return process.env.Enviroment === 'prod' ? module.endsWith('.js') : module.endsWith('.ts'); }

function isDevelopment(): boolean { return process.env.Enviroment !== 'prod'; }

function isIndexFile(module: string): boolean { return module === 'index.ts' || module === 'index.js'; }

interface ViewerWatchTime {
	joinedAt: number;
	watchTime: number;
	intervalId: NodeJS.Timeout;
}

/**
 * Initializes the Twitch chat client and sets up event listeners for commands.
 *
 * The function loads commands from the Commands directory and sets up an event
 * listener for the onMessage event. The event listener checks if the message
 * starts with a valid command and executes the corresponding command if it does.
 * The function also checks if the user is a moderator or broadcaster and
 * restricts access to moderator-only commands.
 *
 * The function also sets up an interval to send a message every 10 minutes with
 * a link to the social media profiles.
 *
 * @returns {Promise<void>} A promise that resolves when the chat client is
 * initialized and the event listeners are set up.
 */
export async function initializeChat(): Promise<void> {
	// Load commands
	const chatClient = await getChatClient();
	const commandsDir = path.join(__dirname, 'Commands');
	const commands: Record<string, Command> = {};
	await loadCommands(commandsDir, commands);
	console.log(`Loaded ${Object.keys(commands).length} Commands.`);
	const userApiClient = await getUserApi();
	const twitchActivity = new WebhookClient({ id: TwitchActivityWebhookID, token: TwitchActivityWebhookToken });
	const getSavedLurkMessage = async (displayName: string) => { return LurkMessageModel.findOne({ displayName }); };

	// Handle commands
	const commandCooldowns: Map<string, Map<string, number>> = new Map();
	const commandHandler = async (channel: string, user: string, text: string, msg: ChatMessage) => {
		const Enviroment = process.env.Enviroment as string;
		if (Enviroment === 'dev' || Enviroment === 'debug') {
			console.log(`${msg.userInfo.displayName} Said: ${text} in ${channel}, Time: ${msg.date.toLocaleDateString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
		}

		try {
			const cursor = ''; // Initialize the cursor value
			const chattersResponse = await userApiClient.chat.getChatters(broadcasterInfo[0].id as UserIdResolvable, { after: cursor, limit: 100 });
			const chatters = chattersResponse.data; // Retrieve the array of chatters
			const chunkSize = 100; // Desired number of chatters per chunk

			let intervalDuration: number;
			if (process.env.Env === 'dev' || process.env.Env === 'debug') {
				intervalDuration = 30 * 1000; // 30 seconds in milliseconds
			} else {
				intervalDuration = 60 * 1000; // 1 minutes in milliseconds
			}

			const requestsPerInterval = 800; // Maximum number of requests allowed per interval

			const totalChunks = Math.ceil(chatters.length / chunkSize); // Total number of chunks

			let chunkIndex = 0; // Counter for tracking the current chunk index
			let requestIndex = 0; // Counter for tracking the current request index

			const channelId = msg.channelId;
			// console.log('Broadcaster Channel ID: ', channelId);
			const processChatters = async (chatters: HelixChatChatter[]) => {// TODO: Only allow points/gold/coins to be collected while the stream is live
				const start = chunkIndex * chunkSize;
				const end = (chunkIndex + 1) * chunkSize;
				const chattersChunk = chatters.slice(start, end);

				for (const chatter of chattersChunk) {
					try {
						const knownBots = await knownBotsModel.findOne<Bots>({ username: chatter.userName });

						const isBot = knownBots && chatter.userName.toLowerCase() === knownBots.username.toLowerCase();
						const isIgnoredUser = ['opendevbot', 'streamelements', 'streamlabs'].includes(chatter.userName.toLowerCase());

						if (isBot || !isIgnoredUser) {
							const roles = isBot ? 'Bot' : 'User';
							const existingUser = await UserModel.findOne({ id: chatter.userId, channelId });
							// console.log('existingUser:', existingUser);

							if (existingUser) {
								const result = await UserModel.updateOne(
									{ id: chatter.userId, channelId },
									{ $inc: { balance: 100 } }
								);
								if (process.env.Environment === 'dev' || process.env.Environment === 'debug') {
									console.log(result.modifiedCount ? `Updated user ${existingUser.username} with data: ${JSON.stringify(result)}` : `User ${existingUser.username} already up to date`);
								}
							} else {
								const result = await UserModel.create({ id: chatter.userId, username: chatter.userName, channelId, roles: 'User', balance: 100 });
								if (process.env.Environment === 'dev' || process.env.Environment === 'debug') {
									console.log(`New user added: ${JSON.stringify(result)}`);
								}
							}
						}
					} catch (error: unknown) {
						if (error instanceof Error) {
							if (error.message.includes('E11000')) {
								console.error(`Duplicate key error for user ${chatter.userName}:${channelId}: for roles: User, Skipping insertion or update.`, error);
								// Handle or log the duplicate key error as needed
							} else {
								console.error('Error processing chatter:', error);
								// Handle other errors accordingly
							}
						}
					}
				}

				requestIndex++;
				chunkIndex++;

				if (chunkIndex === totalChunks) {
					chunkIndex = 0;
				}
			};

			const isIntervalRunning = true;

			/**
			 * This function is the interval handler for the periodic updating of viewers in the database.
			 * It checks if the number of requests made is less than the maximum allowed per interval.
			 * If so, it gets the stream of the given channel and fetches the chatters for that channel.
			 * The chatters are then processed and added to the database.
			 * If the number of requests made reaches the maximum allowed per interval, the request index is reset.
			 */
			const intervalHandler = async () => {
				if (requestIndex < requestsPerInterval) {
					const stream = await userApiClient.streams.getStreamByUserId(broadcasterInfo[0].id as UserIdResolvable);
					if (stream !== null) {
						const chatters = await userApiClient.chat.getChatters(broadcasterInfo[0].id as UserIdResolvable, { after: cursor, limit: chunkSize });
						await processChatters(chatters.data);
						requestIndex++;
					}
				} else {
					requestIndex = 0; // Reset the request index when the maximum number of requests per interval is reached
				}
			};

			const interval = setInterval(async () => {
				if (isIntervalRunning) {
					await intervalHandler();
				}
			}, intervalDuration);

		} catch (error) {
			console.error(error);
		}

		if (text.includes('overlay expert') && channel === '#skullgaminghq') {
			await chatClient.say(channel, `Hey ${msg.userInfo.displayName}, are you tired of spending hours configuring your stream's overlays and alerts? Check out Overlay Expert! With our platform, you can create stunning visuals for your streams without any OBS or streaming software knowledge. Don't waste time on technical details - focus on creating amazing content. Visit https://overlay.expert/support for support and start creating today! 🎨🎥, For support, see https://overlay.expert/support`);
		}
		const savedLurkMessage = await getSavedLurkMessage(msg.userInfo.displayName);
		if (savedLurkMessage && text.includes(`@${savedLurkMessage.displayName}`)) {
			await chatClient.say(channel, `${msg.userInfo.displayName}, ${user}'s lurk message: ${savedLurkMessage.message}`);
		}
		if (text.includes('overlay designer') && channel === '#skullgaminghq') {
			await chatClient.say(channel, `Hey ${msg.userInfo.displayName}, do you have an eye for design and a passion for creating unique overlays? Check out https://overlay.expert/designers to learn how you can start selling your designs and making money on Overlay Expert. Don't miss this opportunity to turn your creativity into cash!`);
		}
		if (text.includes('wl') && channel === '#skullgaminghq') {
			const amazon = 'https://www.amazon.ca/hz/wishlist/ls/354MPD0EKWXZN?ref_=wl_share';
			setTimeout(async () => { await chatClient.say(channel, `check out the Wish List here if you would like to help out the stream ${amazon}`); }, 1800000);
		}
		if (text.includes('Want to become famous?')) {

			// Check if user is staff (moderator, broadcaster, or editor)
			const isStaff = msg.userInfo.isMod || msg.userInfo.isBroadcaster ||
				(await userApiClient.channels.getChannelEditors(broadcasterInfo[0].id as UserIdResolvable)).some(editor => editor.userId === msg.userInfo.userId);

			// Don't ban staff members
			if (isStaff) return;

			// Create embed for ban message
			const displayName = msg.userInfo.displayName;

			const banEmbed: EmbedBuilder = new EmbedBuilder()
				.setTitle('TwitchBan[Automated Ban]')
				.setAuthor({ name: displayName })
				.setColor('Red')
				.addFields([
					{ name: 'User:', value: displayName, inline: true },
					{ name: 'Reason:', value: 'Promoting/Selling followers (violates Twitch TOS)', inline: true },
				])
				.setFooter({ text: `Someone just got BANNED from ${channel}'s channel` })
				.setTimestamp();

			try {
				// Perform moderation actions:
				// - Delete user's message
				await userApiClient.moderation.deleteChatMessages(broadcasterInfo[0].id as UserIdResolvable, msg.id);
				// - Sleep for 1 second (optional delay)
				await sleep(1000);
				// - Ban user
				await userApiClient.moderation.banUser(broadcasterInfo[0].id as UserIdResolvable, {
					user: msg.userInfo.userId,
					reason: 'Promoting selling followers (violates Twitch TOS)',
				});
				// - Sleep for 1 second (optional delay)
				await sleep(1000);
				// - Send chat message notifying ban
				await chatClient.say(channel, `${msg.userInfo.displayName} bugger off with your scams and frauds, you have been removed from this channel, have a good day`);
				// - Send embed to activity feed
				await twitchActivity.send({ embeds: [banEmbed] });
			} catch (error) {
				console.error(error);
			}
		}
		if (text.startsWith('!')) {
			const args = text.slice(1).split(' ');
			const commandName = args.shift()?.toLowerCase();
			if (commandName === undefined) return;
			const command = commands[commandName] || Object.values(commands).find(cmd => cmd.aliases?.includes(commandName));
			// const moderatorsResponse = await userApiClient.moderation.getModerators(broadcasterInfo[0].id as UserIdResolvable);
			// const moderatorsData = moderatorsResponse.data; // Access the moderator data

			const isModerator = msg.userInfo.isMod;
			const isBroadcaster = msg.userInfo.isBroadcaster;
			const channelEditor = await userApiClient.channels.getChannelEditors(broadcasterInfo[0].id as UserIdResolvable);
			const isEditor = channelEditor.map(editor => editor.userId === msg.userInfo.userId);
			const isStaff = isModerator || isBroadcaster || isEditor;

			if (command) {
				if (process.env.Enviroment === 'debug') { console.log(command); }
				try {
					const currentTimestamp = Date.now();

					// Get the user's cooldown map for commands
					let userCooldowns = commandCooldowns.get(user);
					if (!userCooldowns) {
						userCooldowns = new Map<string, number>();
						commandCooldowns.set(user, userCooldowns);
					}

					// Check if the command has a cooldown and if enough time has passed since the last execution
					const lastExecuted = userCooldowns.get(commandName);
					if (lastExecuted && currentTimestamp - lastExecuted < (command.cooldown || 0)) {
						const remainingTime = Math.ceil((lastExecuted + command.cooldown! - currentTimestamp) / 1000);
						return chatClient.say(channel, `@${user}, this command is on cooldown. Please wait ${remainingTime} seconds.`);
					}

					// If the command is marked as moderator-only and the user is not a moderator, restrict access
					if (command.moderator && !isStaff) {
						return chatClient.say(channel, `@${user}, you do not have permission to use this command.`);
					}

					// If the command is marked as devOnly and the user is NOT a moderator or broadcaster in the specific channel, restrict access
					if (command.devOnly && msg.channelId !== '1155035316' && !(msg.userInfo.isBroadcaster || msg.userInfo.isMod)) {
						return chatClient.say(channel, 'This command is a devOnly command and can only be used in skullgaminghq\'s Channel, https://twitch.tv/skullgaminghq');
					}

					// If the command is restricted to the broadcaster and moderators, enforce the restriction
					if (msg.channelId === '1155035316' && (command.moderator && !isStaff)) {
						return chatClient.say(channel, `@${user}, you do not have permission to use this command.`);
					}

					// Execute the command
					command.execute(channel, user, args, text, msg);

					// Update the last executed timestamp of the command
					userCooldowns.set(commandName, currentTimestamp);
				} catch (error: any) {
					console.error(error.message);
				}
			} else {
				if (text.includes('!join') || text.includes('!pokecatch') || text.includes('!pokestart')) return;
				if (process.env.Enviroment === 'dev' || process.env.Enviroment === 'debug') {
					await chatClient.say(channel, 'Command not recognized, please try again');
				}
			}
		}

		// const sendMessageEvery10Minutes = async () => {
		// 	try {
		// 		await chatClient.say('skullgaminghq', 'Check out all my social media by using the !social command, or check out the commands by executing the !help');
		// 	} catch (error) {
		// 		console.error(error);
		// 	} finally {
		// 		// Schedule the next call 10 minutes from now
		// 		setTimeout(sendMessageEvery10Minutes, 600000); // 600000 milliseconds = 10 minutes
		// 	}
		// };

		// // Initiate the first call with a delay
		// setTimeout(sendMessageEvery10Minutes, 600000); // 600000 milliseconds = 10 minutes
	};
	chatClient.onMessage(commandHandler);
	chatClient.onAuthenticationFailure((text: string, retryCount: number) => { console.warn('Attempted to connect to a channel ', text, retryCount); });
}

/**
 * Registers a command with the given name and optional aliases.
 * The command will be available to be executed by users in the chat.
 * @param newCommand The command to be registered.
 * @param name The name of the command.
 */
function registerCommand(newCommand: Command, name: string) {
	// Register the command with the provided name
	commands.add(name);
	if (process.env.Enviroment === 'debug') {
		console.log(`Registered command: ${name}`);
	}
	if (newCommand.aliases) {
		newCommand.aliases.forEach((alias) => {
			commands.add(alias);
			if (process.env.Enviroment === 'debug') {
				console.log(`Registered alias for ${name}: ${alias}`);
			}
		});
	}
}

// holds the ChatClient
let chatClientInstance: ChatClient;
/**
 * Returns the ChatClient instance which is used to interact with the Twitch chat.
 * If the instance does not exist, it is created and connected to the channels
 * specified in the database.
 * @returns {Promise<ChatClient>} The ChatClient instance.
 */
export async function getChatClient(): Promise<ChatClient> {
	// const TBD = await UserModel.deleteMany({});
	// console.log('User Collection: ', TBD.deletedCount);
	const userApiClient = await getUserApi();
	if (!chatClientInstance) {
		const authProvider = await getAuthProvider();

		// Fetch usernames from the database
		const usernames = await getUsernamesFromDatabase();

		chatClientInstance = new ChatClient({
			authProvider,
			botLevel: 'none',
			rejoinChannelsOnReconnect: true,
			channels: [], // Initialize with an empty array
			logger: { minLevel: 'ERROR' },
			requestMembershipEvents: true,
		});

		chatClientInstance.onJoin(async (channel: string, user: string) => {
			try {
				if (process.env.Environment === 'dev' || process.env.Environment === 'debug') {
					console.log(`${user} has joined ${channel}'s channel`);
				}

				// Check if the channel is currently streaming
				const stream = await userApiClient.streams.getStreamByUserId(broadcasterInfo[0].id as UserIdResolvable);
				if (stream === null) return; // Exit if the channel is not live

				// Fetch user ID by their username
				const userId = await userApiClient.users.getUserByName(user as UserNameResolvable);
				if (!userId) {
					throw new Error(`User ID for ${user} not found`);
				}

				// Fetch existing watch times from the database for all channels
				const userRecords = await UserModel.find({ id: userId.id });
				const existingWatchTimesMap = new Map<string, number>(); // Map to store watch times by channelId
				userRecords.forEach(record => {
					existingWatchTimesMap.set(record.channelId, record.watchTime || 0);
				});

				// Initialize or update watch time tracking for the current channel
				const channelInfo = await userApiClient.channels.getChannelInfoById(broadcasterInfo[0].id as UserIdResolvable);
				if (!channelInfo || channelInfo.id === undefined) return;

				const channelId = channelInfo.id as string;
				if (process.env.Enviroment === 'dev' || process.env.Enviroment === 'debug') {
					console.log(`User ${user} joined channel ${channel} (${channelId})`);
				}

				// Initialize the map with existing watch time and start an interval to update it
				const intervalId = setInterval(async () => {
					const viewer = viewerWatchTimes.get(user);
					if (viewer) {
						const watchTime = Date.now() - viewer.joinedAt;
						const totalWatchTime = viewer.watchTime + watchTime;
						viewer.joinedAt = Date.now();
						viewer.watchTime = totalWatchTime;

						try {
							// Update or create user record in the database for the current channel
							const filter = { id: userId.id, channelId };
							const update = { $set: { watchTime: totalWatchTime } };
							const options = { upsert: true, new: true, setDefaultsOnInsert: true };

							const updatedUser = await UserModel.findOneAndUpdate(filter, update, options);

							// if (updatedUser) {
							// 	if (process.env.Enviroment === 'dev' || process.env.Enviroment === 'debug') {
							// 		console.log(`Updated watch time for user ${user} on channel ${channelId}: Watchtime: ${totalWatchTime}`);
							// 	}
							// } else {
							// 	if (process.env.Enviroment === 'dev' || process.env.Enviroment === 'debug') {
							// 		console.log(`New user record created for user ${user} on channel ${channelId}: Watchtime: ${totalWatchTime}`);
							// 	}
							// }
						} catch (error: unknown) {
							if (error instanceof Error) {
								if (error.message.includes('11000')) {
									console.error(`Duplicate key error for id ${userId.id}`);
									// Handle the duplicate key error appropriately
								} else {
									console.error('Error updating watch time:', error);
								}
							}
						}
					}
				}, UPDATE_INTERVAL);

				// Store viewer's data in the map
				viewerWatchTimes.set(user, { joinedAt: Date.now(), watchTime: existingWatchTimesMap.get(channelId) || 0, intervalId });
				if (stream === null) clearInterval(intervalId);

				// Ensure bot is a moderator in the channel if required
				if (chatClientInstance.isConnected && broadcasterInfo && broadcasterInfo[0].id) {
					const isMod = await userApiClient.moderation.checkUserMod(broadcasterInfo[0].id as UserIdResolvable, openDevBotID as UserIdResolvable);
					if (!isMod) {
						await chatClientInstance.say(channel, 'Hello, I\'m now connected to your chat, don\'t forget to make me a mod', {}, { limitReachedBehavior: 'enqueue' });
						await sleep(1000);
						await chatClientInstance.action(channel, '/mod opendevbot');
					}
				} else {
					console.info('The chatClient is not connected or broadcasterInfo is undefined');
				}
			} catch (error) {
				console.error('Error handling onJoin event:', error);
			}
		});

		chatClientInstance.onPart(async (channel: string, user: string) => {
			if (process.env.Environment === 'dev' || process.env.Environment === 'debug') {
				console.log(`${user} has left ${channel}'s channel`);
			}

			const viewer = viewerWatchTimes.get(user);

			if (viewer) {
				clearInterval(viewer.intervalId); // Clear the interval to stop periodic updates
				const watchTime = Date.now() - viewer.joinedAt;
				const totalWatchTime = viewer.watchTime + watchTime;
				viewerWatchTimes.delete(user); // Remove user from the map once their watch time is updated

				try {
					const streamerChannel = await userApiClient.channels.getChannelInfoById(broadcasterInfo[0].id as UserIdResolvable);
					const userId = await userApiClient.users.getUserByName(user as UserNameResolvable);
					if (!userId) {
						throw new Error(`User ID for ${user} not found`);
					}

					const channelId = streamerChannel?.id;

					const userRecord = await UserModel.findOne({ id: userId.id, channelId });
					if (userRecord) {
						userRecord.watchTime = totalWatchTime;
						if (channelId) {
							userRecord.channelId = channelId;
						}
						await userRecord.save();
						// console.log('Updated User Record: ', userRecord);
					} else {
						const newUser = new UserModel({ id: userId.id, username: user, channelId, watchTime: totalWatchTime, roles: 'User' });
						await newUser.save();
						// console.log('New User Data Created: ', newUser);
					}
				} catch (error) {
					console.error('Error updating watch time:', error);
				}
			}
		});

		// Connect the chat client
		chatClientInstance.connect();

		for (const username of usernames) {
			if (username.toLowerCase() === 'opendevbot') {
				continue;
			}
			setTimeout(() => {
				chatClientInstance.join(username);
				if (process.env.Enviroment === 'dev') {
					console.log(`Joined channel: ${username}`);
				} else { return; }
			}, 2000);
			chatClientInstance.reconnect();
		}
		console.log('ChatClient instance initialized and connected.');
	}

	// Periodic check to ensure watch times are saved regularly
	setInterval(async () => {
		for (const [user, viewer] of viewerWatchTimes) {
			const watchTime = Date.now() - viewer.joinedAt;
			const totalWatchTime = viewer.watchTime + watchTime;
			viewer.joinedAt = Date.now();
			viewer.watchTime = totalWatchTime;

			try {
				const userId = await userApiClient.users.getUserByName(user as UserNameResolvable);
				if (!userId) {
					throw new Error(`User ID for ${user} not found`);
				}

				// Fetch the channel info for the specific broadcaster ID
				const broadcasterId = broadcasterInfo[0].id as UserIdResolvable; // Assuming you want the first broadcaster in the array
				const streamerChannel = await userApiClient.channels.getChannelInfoById(broadcasterId);

				if (!streamerChannel || !streamerChannel.id) {
					console.error(`Streamer channel not found for user ${user}`);
					continue;
				}

				const channelId = streamerChannel.id;
				// console.log('Broadcaster Channel ID: ', channelId);

				// Update or create user record in the database for the current channel
				const userRecord = await UserModel.findOne({ id: userId.id, channelId });
				// console.log('ExistingUser:', userRecord);
				if (userRecord) {
					userRecord.watchTime = totalWatchTime;
					await userRecord.save();
					// console.log('Updated User Record: ', userRecord);
				} else {
					const newUser = new UserModel({ id: userId.id, username: user, channelId, watchTime: totalWatchTime, roles: 'User' });
					await newUser.save();
					// console.log('New User Data Created: ', newUser);
				}
			} catch (error) {
				console.error('Error updating watch time:', error);
			}
		}
	}, PERIODIC_SAVE_INTERVAL);

	return chatClientInstance;
}
// Define a function to retrieve usernames from MongoDB
export async function getUsernamesFromDatabase(): Promise<string[]> {
	try {
		// Use Mongoose to query the database and fetch user documents
		const tokens: ITwitchToken[] = await TokenModel.find({}, 'login'); // Assuming 'login' field contains usernames

		// Extract usernames from the fetched documents
		const usernames: string[] = tokens.map((token) => token.login);

		return usernames;
	} catch (error) {
		// Handle any potential errors here
		console.error('Error fetching usernames from MongoDB:', error);
		throw error;
	}
}