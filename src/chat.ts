import { ChatClient } from '@twurple/chat';
import { ChatMessage } from '@twurple/chat/lib';

import { HelixChatChatter, UserIdResolvable } from '@twurple/api/lib';
import fs from 'fs';
import path from 'path';
import { getUserApi } from './api/userApiClient';
import { getAuthProvider } from './auth/authProvider';
import { LurkMessageModel } from './database/models/LurkModel';
import knownBotsModel, { Bots } from './database/models/knownBotsModel';
import { ITwitchToken, TokenModel } from './database/models/tokenModel';
import { User, UserModel } from './database/models/userModel';
import { Command } from './interfaces/Command';
import { TwitchActivityWebhookID, TwitchActivityWebhookToken, broadcasterInfo, openDevBotID } from './util/constants';
import { sleep } from './util/util';
import { EmbedBuilder, WebhookClient } from 'discord.js';

interface Chatter {
	userId: string;
	userName: string;
	getUser(): Promise<User>;
}

const viewerWatchTimes: Map<string, { joinedAt: number; watchTime: number; intervalId: NodeJS.Timeout }> = new Map();
const UPDATE_INTERVAL = 30000; // 30 seconds
const PERIODIC_SAVE_INTERVAL = 60000; // 1 minute

export const commands: Set<string> = new Set<string>();
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
		console.log(`${msg.userInfo.displayName} Said: ${text} in ${channel}, Time: ${msg.date.toLocaleDateString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);

		try {
			const cursor = ''; // Initialize the cursor value
			const chattersResponse = await userApiClient.chat.getChatters(broadcasterInfo?.id as UserIdResolvable, { after: cursor, limit: 100 });
			const chatters = chattersResponse.data; // Retrieve the array of chatters
			const chunkSize = 100; // Desired number of chatters per chunk
			const intervalDuration = 5 * 60 * 1000; // Interval duration in milliseconds (5 minutes)
			const requestsPerInterval = 800; // Maximum number of requests allowed per interval

			const totalChunks = Math.ceil(chatters.length / chunkSize); // Total number of chunks

			let chunkIndex = 0; // Counter for tracking the current chunk index
			let requestIndex = 0; // Counter for tracking the current request index

			const maxIterations = 1000;
			let iterationCount = 0;

			const processChatters = async (chatters: HelixChatChatter[]) => {
				const start = chunkIndex * chunkSize;
				const end = (chunkIndex + 1) * chunkSize;
				const chattersChunk = chatters.slice(start, end);

				for (const chatter of chattersChunk) {
					const user = await UserModel.findOne<User>({ id: chatter.userId }).lean();
					const knownBots = await knownBotsModel.findOne<Bots>({ username: chatter.userName });

					if (knownBots && chatter.userName.toLowerCase() === knownBots.username.toLowerCase()) {
						const updatedBalance = (user?.balance || 0) + 100;
						if (!user) {
							const newUser = new UserModel({
								id: chatter.userId,
								username: chatter.userName,
								roles: 'Bot',
								balance: updatedBalance,
							});
							await newUser.save();
						} else {
							await UserModel.updateOne(
								{ id: chatter.userId },
								{ $set: { username: chatter.userName, roles: 'Bot', balance: updatedBalance } }
							);
						}
						continue;
					}
					if (chatter.userName.toLowerCase() === 'opendevbot' || chatter.userName.toLowerCase() === 'streamelements' || chatter.userName.toLowerCase() === 'streamlabs') {
						continue; // Skip giving coins to specific usernames
					}
					if (iterationCount >= maxIterations) {
						console.log('Maximum iteration count reached. Exiting the loop.');
						break;
					}
					let newUser: User;
					if (!user) {
						newUser = new UserModel({
							id: chatter.userId,
							username: chatter.userName,
							roles: 'User',
							balance: 100,
						});
						// console.log(`Added ${newUser.username} to the database: Balance: ${newUser.balance}`);
						await newUser.save();
					} else {
						const updatedBalance = (user.balance || 0) + 100;
						await UserModel.updateOne(
							{ id: chatter.userId },
							{ $set: { username: chatter.userName, roles: 'User', balance: updatedBalance } },
							{ upsert: true }
						);
						// console.log('Updated ' + chatter.userName + ' and gave them ' + updatedBalance + ' coins');
					}
				}

				requestIndex++;
				chunkIndex++;

				if (chunkIndex === totalChunks) {
					chunkIndex = 0;
				}
			};

			let isIntervalRunning = true;

			const intervalHandler = async () => {
				if (iterationCount >= maxIterations) {
					console.log('Maximum iteration count reached. Exiting the loop.');
					clearInterval(interval);
					isIntervalRunning = false;
					return;
				}

				if (requestIndex < requestsPerInterval) {
					const chatters = await userApiClient.chat.getChatters(broadcasterInfo?.id as UserIdResolvable, { after: cursor, limit: chunkSize });
					await processChatters(chatters.data);
					requestIndex++;
				} else {
					requestIndex = 0; // Reset the request index when the maximum number of requests per interval is reached
					iterationCount++;
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

		if (text.includes('overlay expert') && channel === '#canadiendragon') {
			await chatClient.say(channel, `Hey ${msg.userInfo.displayName}, are you tired of spending hours configuring your stream's overlays and alerts? Check out Overlay Expert! With our platform, you can create stunning visuals for your streams without any OBS or streaming software knowledge. Don't waste time on technical details - focus on creating amazing content. Visit https://overlay.expert/support for support and start creating today! 🎨🎥, For support, see https://overlay.expert/support`);
		}
		const savedLurkMessage = await getSavedLurkMessage(msg.userInfo.displayName);
		if (savedLurkMessage && text.includes(`@${savedLurkMessage.displayName}`)) {
			await chatClient.say(channel, `${msg.userInfo.displayName}, ${user}'s lurk message: ${savedLurkMessage.message}`);
		}
		if (text.includes('overlay designer') && channel === '#canadiendragon') {
			await chatClient.say(channel, `Hey ${msg.userInfo.displayName}, do you have an eye for design and a passion for creating unique overlays? Check out https://overlay.expert/designers to learn how you can start selling your designs and making money on Overlay Expert. Don't miss this opportunity to turn your creativity into cash!`);
		}
		if (text.includes('wl') && channel === '#canadiendragon') {
			const amazon = 'https://www.amazon.ca/hz/wishlist/ls/354MPD0EKWXZN?ref_=wl_share';
			setTimeout(async () => { await chatClient.say(channel, `check out the Wish List here if you would like to help out the stream ${amazon}`); }, 1800000);
		}
		if (text.includes('Want to become famous?') && channel === '#canadiendragon') {

			// Check if user is staff (moderator, broadcaster, or editor)
			const isStaff = msg.userInfo.isMod || msg.userInfo.isBroadcaster ||
				(await userApiClient.channels.getChannelEditors(broadcasterInfo?.id as UserIdResolvable)).some(editor => editor.userId === msg.userInfo.userId);

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
				await userApiClient.moderation.deleteChatMessages(broadcasterInfo?.id as UserIdResolvable, msg.id);
				// - Sleep for 1 second (optional delay)
				await sleep(1000);
				// - Ban user
				await userApiClient.moderation.banUser(broadcasterInfo?.id as UserIdResolvable, {
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
			// const moderatorsResponse = await userApiClient.moderation.getModerators(broadcasterInfo?.id as UserIdResolvable);
			// const moderatorsData = moderatorsResponse.data; // Access the moderator data

			const isModerator = msg.userInfo.isMod;
			const isBroadcaster = msg.userInfo.isBroadcaster;
			const channelEditor = await userApiClient.channels.getChannelEditors(broadcasterInfo?.id as UserIdResolvable);
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
					if (command.devOnly && msg.channelId !== '31124455' && !(msg.userInfo.isBroadcaster || msg.userInfo.isMod)) {
						return chatClient.say(channel, 'This command is a devOnly command and can only be used in CanadienDragon\'s Channel');
					}

					// If the command is restricted to the broadcaster and moderators, enforce the restriction
					if (msg.channelId === '31124455' && (command.moderator && !isStaff)) {
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
				if (text.includes('!join')) return;
				await chatClient.say(channel, 'Command not recognized, please try again');
			}
		}

		// TODO: send chat message every 10 minutes consistently in typescript.
		// const sendMessageEvery10Minutes = async () => {
		// 	try {
		// 		await chatClient.say('canadiendragon', 'Check out all my social media by using the !social command, or check out the commands by executing the !help');
		// 	} catch (error) {
		// 		console.error(error);
		// 	} finally {
		// Schedule the next call 10 minutes from now
		// 		setTimeout(sendMessageEvery10Minutes, 600000); // 600000 milliseconds = 10 minutes
		// 	}
		// };

		// Initiate the first call
		// sendMessageEvery10Minutes();
	};
	chatClient.onMessage(commandHandler);
	chatClient.onAuthenticationFailure((text: string, retryCount: number) => { console.warn('Attempted to connect to a channel ', text, retryCount); });
}

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
export async function getChatClient(): Promise<ChatClient> {
	const userApiClient = await getUserApi();
	if (!chatClientInstance) {
		const authProvider = await getAuthProvider();

		// Fetch usernames from the database
		const usernames = await getUsernamesFromDatabase();

		chatClientInstance = new ChatClient({
			authProvider,
			channels: [], // Initialize with an empty array
			logger: { minLevel: 'ERROR' },
			requestMembershipEvents: true,
		});

		chatClientInstance.onJoin(async (channel: string, user: string) => {
			try {
				console.log(`${user} has joined ${channel}'s channel`);
				
				const stream = await userApiClient.streams.getStreamByUserName('canadiendragon');
				if (stream === null) return;
				const userId = await userApiClient.users.getUserByName(user);
				if (!userId) {
					throw new Error(`User ID for ${user} not found`);
				}


				// Fetch existing watch time from the database
				const userRecord = await UserModel.findOne({ id: userId.id });
				const existingWatchTime = userRecord ? userRecord.watchTime || 0 : 0;

				// Initialize the map with existing watch time and start an interval to update it
				const intervalId = setInterval(async () => {
					const viewer = viewerWatchTimes.get(user);
					if (viewer) {
						const watchTime = Date.now() - viewer.joinedAt;
						const totalWatchTime = viewer.watchTime + watchTime;
						viewer.joinedAt = Date.now();
						viewer.watchTime = totalWatchTime;

						try {
							const userRecord = await UserModel.findOne({ id: userId.id });
							if (userRecord) {
								userRecord.watchTime = totalWatchTime;
								await userRecord.save();
							} else {
								const newUser = new UserModel({ id: userId.id, username: user, watchTime: totalWatchTime, roles: 'USER' });
								await newUser.save();
							}
						} catch (error) {
							console.error('Error updating watch time:', error);
						}
					}
				}, UPDATE_INTERVAL);

				viewerWatchTimes.set(user, { joinedAt: Date.now(), watchTime: existingWatchTime, intervalId });

				if (chatClientInstance.isConnected) {
					if (broadcasterInfo && broadcasterInfo.id) {
						const isMod = await userApiClient.moderation.checkUserMod(broadcasterInfo.id as UserIdResolvable, openDevBotID as UserIdResolvable);
						if (!isMod) {
							await chatClientInstance.say(channel, 'Hello, I\'m now connected to your chat, don\'t forget to make me a mod', {}, { limitReachedBehavior: 'enqueue' });
							await sleep(1000);
							await chatClientInstance.action(channel, '/mod opendevbot');
						}
					} else {
						console.info('broadcasterInfo or broadcasterInfo.id is undefined');
					}
				} else {
					console.info('The chatClient is not connected');
				}
			} catch (error) {
				console.error(error);
			}
		});
		
		chatClientInstance.onPart(async (channel: string, user: string) => {
			console.log(`${user} has left ${channel}'s channel`);
			const viewer = viewerWatchTimes.get(user);

			if (viewer) {
				clearInterval(viewer.intervalId); // Clear the interval to stop periodic updates
				const watchTime = Date.now() - viewer.joinedAt;
				const totalWatchTime = viewer.watchTime + watchTime;
				viewerWatchTimes.delete(user); // Remove user from the map once their watch time is updated

				try {
					const userId = await userApiClient.users.getUserByName(user);
					if (!userId) {
						throw new Error(`User ID for ${user} not found`);
					}

					const userRecord = await UserModel.findOne({ id: userId.id });
					if (userRecord) {
						userRecord.watchTime = totalWatchTime;
						await userRecord.save();
					} else {
						const newUser = new UserModel({ id: userId.id, username: user, watchTime: totalWatchTime, roles: 'USER' });
						await newUser.save();
					}
				} catch (error) {
					console.error('Error updating watch time:', error);
				}
			}
		});

		// Connect the chat client
		chatClientInstance.connect();

		// Delay between joining channels
		for (const username of usernames) {
			// Skip joining the "opendevbot" channel
			if (username.toLowerCase() === 'opendevbot') {
				continue;
			}
			setTimeout(() => {
				chatClientInstance.join(username);
				if (process.env.Enviroment === 'dev') {
					console.log(`Joined channel: ${username}`);
				} else { return; }
			}, 2000); // 2000 milliseconds (2 seconds) delay
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
				const userId = await userApiClient.users.getUserByName(user);
				if (!userId) {
					throw new Error(`User ID for ${user} not found`);
				}

				const userRecord = await UserModel.findOne({ id: userId.id });
				if (userRecord) {
					userRecord.watchTime = totalWatchTime;
					await userRecord.save();
				} else {
					const newUser = new UserModel({ id: userId.id, username: user, watchTime: totalWatchTime, roles: 'USER' });
					await newUser.save();
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
