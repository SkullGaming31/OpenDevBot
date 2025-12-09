/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChatClient } from '@twurple/chat';
import { ChatMessage } from '@twurple/chat/lib';

import { HelixChatChatter, UserIdResolvable, UserNameResolvable } from '@twurple/api/lib';
import fs from 'fs';
import path from 'path';
import { getUserApi } from './api/userApiClient';
import { getChatAuthProvider } from './auth/authProvider';
import { LurkMessageModel } from './database/models/LurkModel';
import knownBotsModel, { Bots } from './database/models/knownBotsModel';
import { Command } from './interfaces/Command';
import { TwitchActivityWebhookID, TwitchActivityWebhookToken, broadcasterInfo, openDevBotID } from './util/constants';
import { sleep } from './util/util';
import logger from './util/logger';
import { EmbedBuilder } from 'discord.js';
import { enqueueWebhook } from './Discord/webhookQueue';
import { UserModel } from './database/models/userModel';
import { creditWallet } from './services/balanceAdapter';
import { parseCommandText, getCooldownRemaining, checkCommandPermission } from './util/commandHelpers';
import { getUsernamesFromDatabase } from './database/tokenStore';

const viewerWatchTimes: Map<string, { joinedAt: number; watchTime: number; intervalId: NodeJS.Timeout }> = new Map();
const UPDATE_INTERVAL = 30000; // 30 seconds
// Ensure we only start the periodic social message once per process
let periodicSocialTimerStarted = false;
// Define your constants
let PERIODIC_SAVE_INTERVAL: number;

if (process.env.ENVIRONMENT === 'prod') {
	PERIODIC_SAVE_INTERVAL = 60000; // 1 minute in production
} else {
	PERIODIC_SAVE_INTERVAL = 30000; // 30 seconds in development or debug mode
}

export const commands: Set<string> = new Set<string>();
// Tracks channels the bot has joined in this process (best-effort cache)
export const joinedChannels: Set<string> = new Set<string>();
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
function isAllowedFileExtension(module: string): boolean { return process.env.ENVIRONMENT === 'prod' ? module.endsWith('.js') : module.endsWith('.ts'); }

function isDevelopment(): boolean { return process.env.ENVIRONMENT !== 'prod'; }

function isIndexFile(module: string): boolean { return module === 'index.ts' || module === 'index.js'; }

// ViewerWatchTime interface intentionally removed; inline type is used above

/**
 * Initializes the Twitch chat client and sets up event listeners for commands.
 *
 * The function loads commands from the Commands directory and sets up an event
 * listener for the onMessage event. The event listener checks if the message
 * starts with a valid command and executes the corresponding command if it does.
 * The function also checks if the user is a moderator or broadcaster and
 * restricts access to moderator-only commands.
 * Additionally, the function handles specific chat messages for lurk messages,
 */
export async function initializeChat(): Promise<void> {
	// Load commands
	const chatClient = await getChatClient();
	const commandsDir = path.join(__dirname, 'Commands');
	const commands: Record<string, Command> = {};
	await loadCommands(commandsDir, commands);
	const userApiClient = await getUserApi();
	const TWITCH_ACTIVITY_ID = TwitchActivityWebhookID;
	const TWITCH_ACTIVITY_TOKEN = TwitchActivityWebhookToken;
	const getSavedLurkMessage = async (displayName: string) => { return LurkMessageModel.findOne({ displayName }); };

	// Handle commands
	const commandCooldowns: Map<string, Map<string, number>> = new Map();
	const commandHandler = async (channel: string, user: string, text: string, msg: ChatMessage) => {
		// environment string is available via process.env when needed
		// (dev) verbose logging removed; errors are still logged

		try {
			const cursor = ''; // Initialize the cursor value
			let chatters: HelixChatChatter[] = [];
			try {
				const chattersResponse = await userApiClient.chat.getChatters(broadcasterInfo[0].id as UserIdResolvable, { after: cursor, limit: 100 });
				chatters = chattersResponse.data || chattersResponse || [];
			} catch (err: unknown) {
				// Handle missing moderator scope or other 401 Unauthorized errors gracefully
				const msgStr = err instanceof Error ? err.message : String(err);
				if (msgStr.includes('Missing scope') || msgStr.includes('401') || msgStr.includes('Unauthorized')) {
					logger.warn('getChatters failed due to missing scope or unauthorized access:', msgStr);
					if (process.env.ENVIRONMENT === 'debug') {
						await chatClient.say(channel, 'Chatters list unavailable - bot needs \'moderator:read:chatters\' scope. Skipping chatter processing.');
					}
					chatters = [];
				} else {
					logger.error('Error fetching chatters:', err);
					throw err; // rethrow unexpected errors
				}
			}
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
			// logger.debug('Broadcaster Channel ID: ', channelId);
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
							const existingUser = await UserModel.findOne({ id: chatter.userId, channelId });
							// logger.debug('existingUser:', existingUser);

							if (existingUser) {
								// Credit the legacy wallet (UserModel.balance) rather than the BankAccount
								try {
									await creditWallet(chatter.userId, 100, existingUser.username, channelId);
								} catch (err) {
									logger.error('Failed to credit wallet for existing user:', err);
								}
							} else {
								// Create the legacy user document but do not store canonical balance on UserModel
								try {
									await UserModel.create({ id: chatter.userId, username: chatter.userName, channelId, roles: 'User' });
									// New user created; no bank balance stored on UserModel
									// Seed the legacy wallet for the new user
									try {
										await creditWallet(chatter.userId, 100, chatter.userName, channelId);
									} catch (err) {
										logger.error('Failed to seed wallet for new user:', err);
									}
								} catch (err) {
									// creation may race with another process inserting user
									if (err instanceof Error && err.message.includes('E11000')) {
										logger.warn(`Duplicate user insert race for ${chatter.userName}:${channelId}`);
									} else {
										logger.error('Error creating new user:', err);
									}
								}
							}
						}
					} catch (error: unknown) {
						if (error instanceof Error) {
							if (error.message.includes('E11000')) {
								logger.error(`Duplicate key error for user ${chatter.userName}:${channelId}: for roles: User, Skipping insertion or update.`, error);
								// Handle or log the duplicate key error as needed
							} else {
								logger.error('Error processing chatter:', error);
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

			void setInterval(async () => {
				if (isIntervalRunning) {
					await intervalHandler();
				}
			}, intervalDuration);

		} catch (error: unknown) {
			if (error instanceof Error) {
				logger.error(error);
			}
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
				await enqueueWebhook(TWITCH_ACTIVITY_ID, TWITCH_ACTIVITY_TOKEN, { embeds: [banEmbed] });
			} catch (error: unknown) {
				if (error instanceof Error) {
					logger.error(error);
				}
			}
		}
		if (text.startsWith('!')) {
			// log the raw command parsing for debugging
			text.length > 200 ? text.slice(0, 200) + '...' : text;
			// logger.debug(`[chat:command] Raw: ${preview}`);
			const { args, commandName } = parseCommandText(text);
			if (commandName === undefined) return;
			const command = commands[commandName] || Object.values(commands).find(cmd => cmd.aliases?.includes(commandName));
			// logger.debug(`[chat:command] Found command? ${command ? 'yes' : 'no'}`);
			// const moderatorsResponse = await userApiClient.moderation.getModerators(broadcasterInfo[0].id as UserIdResolvable);
			// const moderatorsData = moderatorsResponse.data; // Access the moderator data

			const isModerator = msg.userInfo.isMod;
			const isBroadcaster = msg.userInfo.isBroadcaster;
			const channelEditor = await userApiClient.channels.getChannelEditors(broadcasterInfo[0].id as UserIdResolvable);
			// getChannelEditors returns an array of editor objects; use `some` to compute a boolean
			const isEditor = Array.isArray(channelEditor) ? channelEditor.some(editor => editor.userId === msg.userInfo.userId) : false;
			// staff check not currently used here

			if (command) {
				if (process.env.ENVIRONMENT === 'debug') { logger.info(command); }
				try {
					const currentTimestamp = Date.now();

					// Get the user's cooldown map for commands
					let userCooldowns = commandCooldowns.get(user);
					if (!userCooldowns) {
						userCooldowns = new Map<string, number>();
						commandCooldowns.set(user, userCooldowns);
					}

					// Cooldown check
					const lastExecuted = userCooldowns.get(commandName);
					const remaining = getCooldownRemaining(lastExecuted, command.cooldown || 0, currentTimestamp);
					if (remaining > 0) {
						return chatClient.say(channel, `@${user}, this command is on cooldown. Please wait ${remaining} seconds.`);
					}

					// Permission checks
					const editorFlag = isEditor; // computed earlier
					// temporary staff check removed to avoid unused variable
					const permission = checkCommandPermission(command, isModerator, isBroadcaster, editorFlag, msg.channelId);
					if (!permission.allowed) {
						if (permission.reason === 'devOnly') {
							return chatClient.say(channel, 'This command is a devOnly command and can only be used in skullgaminghq\'s Channel, https://twitch.tv/skullgaminghq');
						}
						// default to moderator-only messaging
						return chatClient.say(channel, `@${user}, you do not have permission to use this command.`);
					}

					// Execute the command (await in case command returns a promise)
					await command.execute(channel, user, args, text, msg);

					// Update the last executed timestamp of the command
					userCooldowns.set(commandName, currentTimestamp);
				} catch (error: unknown) {
					// Safely log error
					if (error instanceof Error) logger.error(error.message);
					else logger.error(String(error));
				}
			} else {
				if (text.includes('!join') || text.includes('!pokecatch') || text.includes('!pokestart')) return;
				if (process.env.ENVIRONMENT === 'dev' || process.env.ENVIRONMENT === 'debug') {
					await chatClient.say(channel, 'Command not recognized, please try again');
				}
			}
		}
		// this should run every 10 minutes but runs once right away then once every 1 minute
		// Schedule a single periodic social message runner (starts once per process)
		if (!periodicSocialTimerStarted) {
			periodicSocialTimerStarted = true;
			const SOCIAL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
			const socialChannel = 'skullgaminghq';
			const sendSocial = async () => {
				try {
					await chatClient.say(socialChannel, 'Check out all my social media by using the !social command, or check out the commands by executing the !help');
				} catch (err) {
					logger.error('Periodic social message failed', err as Error);
				}
			};

			// Start after an initial delay to avoid spamming on startup
			socialTimeoutId = setTimeout(() => {
				// send immediately once after delay, then every interval
				sendSocial().catch((e) => { logger.error('Error sending periodic social message', e); });
				socialIntervalId = setInterval(() => sendSocial().catch((e) => { logger.error('Error sending periodic social message', e); }), SOCIAL_INTERVAL_MS);
			}, SOCIAL_INTERVAL_MS);
		}
	};
	chatClient.onMessage(commandHandler);
	chatClient.onAuthenticationFailure((text: string, retryCount: number) => { logger.warn('Attempted to connect to a channel ', text, retryCount); });
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
	if (process.env.ENVIRONMENT === 'debug') {
		logger.debug(`Registered command: ${name}`);
	}
	if (newCommand.aliases) {
		newCommand.aliases.forEach((alias) => {
			commands.add(alias);
			if (process.env.ENVIRONMENT === 'debug') {
				logger.debug(`Registered alias for ${name}: ${alias}`);
			}
		});
	}
}

// command helpers have been moved to `src/util/commandHelpers.ts`

// holds the ChatClient
let chatClientInstance: ChatClient | undefined;
// IDs for timers started by this module so they can be cleared on shutdown
let periodicSaveIntervalId: NodeJS.Timeout | null = null;
let socialTimeoutId: NodeJS.Timeout | null = null;
let socialIntervalId: NodeJS.Timeout | null = null;
/**
 * Returns the ChatClient instance which is used to interact with the Twitch chat.
 * If the instance does not exist, it is created and connected to the channels
 * specified in the database.
 * @returns {Promise<ChatClient>} The ChatClient instance.
 */
export async function getChatClient(): Promise<ChatClient> {
	const userApiClient = await getUserApi();
	if (!chatClientInstance) {
		// Use the chat-specific provider so the ChatClient connects using the bot account
		const authProvider = await getChatAuthProvider();

		try {
			const inspect = authProvider as unknown as Record<string, unknown>;
			const intentMap = inspect._intentToUserId;
			if (intentMap instanceof Map) {
				logger.debug('Chat provider intentToUserId has chat ->', (intentMap as Map<string, unknown>).get('chat'));
			} else if (intentMap && typeof intentMap === 'object') {
				logger.debug('Chat provider intentToUserId has chat ->', (intentMap as Record<string, unknown>)['chat']);
			}
		} catch (e) {
			logger.error('Error inspecting authProvider internals:', e);
			// ignore
		}

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
					logger.info(`${user} has joined ${channel}'s channel`);
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
				if (process.env.ENVIRONMENT === 'dev' || process.env.ENVIRONMENT === 'debug') {
					logger.info(`User ${user} joined channel ${channel} (${channelId})`);
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

							await UserModel.findOneAndUpdate(filter, update, options);

							// if (updatedUser) {
							// 	if (process.env.ENVIRONMENT === 'dev' || process.env.ENVIRONMENT === 'debug') {
							// 		logger.debug(`Updated watch time for user ${user} on channel ${channelId}: Watchtime: ${totalWatchTime}`);
							// 	}
							// } else {
							// 	if (process.env.ENVIRONMENT === 'dev' || process.env.ENVIRONMENT === 'debug') {
							// 		logger.debug(`New user record created for user ${user} on channel ${channelId}: Watchtime: ${totalWatchTime}`);
							// 	}
							// }
						} catch (error: unknown) {
							if (error instanceof Error) {
								if (error.message.includes('11000')) {
									logger.error(`Duplicate key error for id ${userId.id}`);
									// Handle the duplicate key error appropriately
								} else {
									logger.error('Error updating watch time:', error);
								}
							}
						}
					}
				}, UPDATE_INTERVAL);

				// Store viewer's data in the map
				viewerWatchTimes.set(user, { joinedAt: Date.now(), watchTime: existingWatchTimesMap.get(channelId) || 0, intervalId });
				if (stream === null) clearInterval(intervalId);

				// Ensure bot is a moderator in the channel if required
				if (chatClientInstance && chatClientInstance.isConnected && broadcasterInfo && broadcasterInfo[0].id) {
					const isMod = await userApiClient.moderation.checkUserMod(broadcasterInfo[0].id as UserIdResolvable, openDevBotID as UserIdResolvable);
					if (!isMod) {
						await chatClientInstance.say(channel, 'Hello, I\'m now connected to your chat, don\'t forget to make me a mod', {}, { limitReachedBehavior: 'enqueue' });
						await sleep(1000);
						await chatClientInstance.action(channel, '/mod opendevbot');
					}
				} else {
					logger.info('The chatClient is not connected or broadcasterInfo is undefined');
				}
			} catch (error: unknown) {
				if (error instanceof Error) {
					logger.error('Error handling onJoin event:', error);
				}
			}
		});

		chatClientInstance.onPart(async (channel: string, user: string) => {
			if (process.env.Environment === 'dev' || process.env.Environment === 'debug') {
				logger.info(`${user} has left ${channel}'s channel`);
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
						// logger.debug('Updated User Record: ', userRecord);
					} else {
						const newUser = new UserModel({ id: userId.id, username: user, channelId, watchTime: totalWatchTime, roles: 'User' });
						await newUser.save();
						// logger.debug('New User Data Created: ', newUser);
					}
				} catch (error: unknown) {
					if (error instanceof Error) {
						logger.error('Error updating watch time:', error);
					}
				}
			}
		});

		// Connect the chat client
		chatClientInstance.connect();

		// capture a stable reference for use in timers/closures so TypeScript
		// can narrow the value and we avoid "possibly undefined" errors
		const clientRef = chatClientInstance;

		for (const username of usernames) {
			if (username.toLowerCase() === 'opendevbot') {
				continue;
			}
			setTimeout(() => {
				if (!clientRef) return;
				void (clientRef.join(username) as Promise<unknown>).catch(() => { /* ignore */ });
				// update in-memory joinedChannels cache (best-effort)
				try { joinedChannels.add(username); } catch { /* ignore */ }
				if (process.env.ENVIRONMENT === 'dev') {
					logger.info(`Joined channel: ${username}`);
				} else { return; }
			}, 2000);
			if (clientRef && typeof (clientRef as any).reconnect === 'function') (clientRef as any).reconnect();
		}
		logger.info('ChatClient instance initialized and connected.');
	}

	// Periodic check to ensure watch times are saved regularly
	periodicSaveIntervalId = setInterval(async () => {
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
					logger.error(`Streamer channel not found for user ${user}`);
					continue;
				}

				const channelId = streamerChannel.id;
				// logger.debug('Broadcaster Channel ID: ', channelId);

				// Update or create user record in the database for the current channel
				const userRecord = await UserModel.findOne({ id: userId.id, channelId });
				// logger.debug('ExistingUser:', userRecord);
				if (userRecord) {
					userRecord.watchTime = totalWatchTime;
					await userRecord.save();
					// logger.debug('Updated User Record: ', userRecord);
				} else {
					const newUser = new UserModel({ id: userId.id, username: user, channelId, watchTime: totalWatchTime, roles: 'User' });
					await newUser.save();
					// logger.debug('New User Data Created: ', newUser);
				}
			} catch (error: unknown) {
				if (error instanceof Error) {
					logger.error('Error updating watch time:', error);
				}
			}
		}
	}, PERIODIC_SAVE_INTERVAL);

	return chatClientInstance;
}

/**
 * Restart the chat subsystem: shutdown the existing client (if any), clear
 * module-level state, and recreate a fresh client. Useful for picking up
 * new tokens or updated channel list without restarting the process.
 */
export async function restartChat(): Promise<void> {
	try {
		await shutdownChat();
		// clear instance so getChatClient will create a new one
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore - assign undefined to allow recreation
		chatClientInstance = undefined;
		// warm up a new client
		await getChatClient();
		logger.info('Chat subsystem restarted');
	} catch (e) {
		logger.error('Failed to restart chat subsystem', e as Error);
		throw e;
	}
}
/**
 * Gracefully shutdown the chat client and clear timers started by this module.
 * Useful for tests and for clean process exit.
 */
export async function shutdownChat(): Promise<void> {
	try {
		if (socialTimeoutId) {
			clearTimeout(socialTimeoutId);
			socialTimeoutId = null;
		}
		if (socialIntervalId) {
			clearInterval(socialIntervalId);
			socialIntervalId = null;
		}
		if (periodicSaveIntervalId) {
			clearInterval(periodicSaveIntervalId);
			periodicSaveIntervalId = null;
		}

		// clear per-user watch time intervals
		for (const [, viewer] of viewerWatchTimes) {
			try { clearInterval(viewer.intervalId); } catch { /* ignore */ }
		}
		viewerWatchTimes.clear();
		periodicSocialTimerStarted = false;

		if (chatClientInstance) {
			// Twurple ChatClient exposes disconnect/quit depending on version — try both
			try {
				if (typeof (chatClientInstance as any).disconnect === 'function') {
					await (chatClientInstance as any).disconnect();
				} else if (typeof (chatClientInstance as any).quit === 'function') {
					await (chatClientInstance as any).quit();
				}
			} catch (e) {
				logger.error('Error disconnecting chat client during shutdown', e as Error);
			}
		}
	} catch (err) {
		logger.error('Error during shutdownChat', err as Error);
	}
}
/**
 * Join a single channel at runtime. Useful for onboarding a new user/token
 * so the bot starts listening to their chat without a restart.
 * @param username Twitch login name (without #)
 */
export async function joinChannel(username: string): Promise<void> {
	try {
		if (!username) return;
		const client = await getChatClient();
		if (!client) {
			logger.warn('joinChannel: chat client not available');
			return;
		}
		const normalized = username.startsWith('#') ? username.slice(1) : username;
		if (normalized.toLowerCase() === 'opendevbot') return;
		await client.join(normalized);
		// track joined channel locally
		try { joinedChannels.add(normalized); } catch { /* ignore */ }
		if (process.env.ENVIRONMENT === 'dev') logger.info(`Dynamically joined channel: ${normalized}`);
	} catch (err: unknown) {
		if (err instanceof Error) {
			if (err.message.includes('Already joined')) {
				logger.info('joinChannel: already joined', username);
				return;
			}
			// logger.error('joinChannel failed for', username, err as Error);
		}
	}
}

// Define a function to retrieve usernames from MongoDB
// username/token DB access lives in src/database/tokenStore.ts

// Re-export token store helper to preserve backwards compatibility for tests
export { getUsernamesFromDatabase } from './database/tokenStore';