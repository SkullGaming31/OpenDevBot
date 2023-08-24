import { ChatClient } from '@twurple/chat';
import { ChatMessage } from '@twurple/chat/lib';

import { HelixChatChatter, UserIdResolvable } from '@twurple/api/lib';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { getUserApi } from './api/userApiClient';
import { getAuthProvider } from './auth/authProvider';
import { LurkMessageModel } from './database/models/LurkModel';
import knownBotsModel, { Bots } from './database/models/knownBotsModel';
import { User, UserModel } from './database/models/userModel';
import { Command } from './interfaces/apiInterfaces';
import { TwitchActivityWebhookID, TwitchActivityWebhookToken, broadcasterInfo, openDevBotID, userID } from './util/constants';
import { sleep } from './util/util';

interface Chatter {
	userId: string;
	userName: string;
	getUser(): Promise<User>;
}

export const commands: Set<string> = new Set<string>();
async function loadCommands(commandsDir: string, commands: Record<string, Command>): Promise<void> {
	const commandModules = fs.readdirSync(commandsDir);

	for (const module of commandModules) {
		const modulePath = path.join(commandsDir, module);

		if (fs.statSync(modulePath).isDirectory()) {
			await loadCommands(modulePath, commands); // Recursively load commands in subdirectories
			continue;
		}

		if (
			(!module.endsWith('.ts') && process.env.NODE_ENV !== 'prod') ||
			(!module.endsWith('.js') && process.env.NODE_ENV === 'prod') ||
			module === 'index.ts' ||
			module === 'index.js'
		) {
			continue;
		}

		const { name } = path.parse(module);
		const command = (await import(modulePath)).default;
		commands[name] = command;
		registerCommand(command);
	}
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
						if (!user) {
							const newUser = new UserModel({
								id: chatter.userId,
								username: chatter.userName,
								roles: 'Bot',
								balance: 100,
							});
							// console.log(`Added ${newUser.username} to the database: Balance: ${newUser.balance}`);
							await newUser.save();
						} else {
							const updatedBalance = (user.balance || 0) + 100;
							await UserModel.updateOne(
								{ id: chatter.userId },
								{ $set: { username: chatter.userName, roles: 'Bot', balance: updatedBalance } },
								{ upsert: true }
							);
							// console.log('Updated ' + chatter.userName + ' and gave them ' + updatedBalance + ' coins');
							// console.log('User:', user);
							// console.log('Known Bots:', knownBots);
						}
						continue; // Skip the remaining checks since the user is a known bot
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

		if (text.startsWith('!')) {

			const args = text.slice(1).split(' ');
			const commandName = args.shift()?.toLowerCase();
			if (commandName === undefined) return;
			// console.log(commandName);
			const command = commands[commandName] || Object.values(commands).find(cmd => cmd.aliases?.includes(commandName));
			const moderatorsResponse = await userApiClient.moderation.getModerators(broadcasterInfo?.id as UserIdResolvable);
			const moderatorsData = moderatorsResponse.data; // Access the moderator data

			const isModerator = moderatorsData.some(moderator => moderator.userId === msg.userInfo.userId);
			const isBroadcaster = broadcasterInfo?.id === msg.userInfo.userId;
			const isStaff = isModerator || isBroadcaster;

			if (command) {
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

					// If the command is marked as devOnly and the user is not a moderator or broadcaster in the specific channel, restrict access
					if (command.devOnly && msg.channelId !== '31124455') {
						return chatClient.say(channel, 'This command is a devOnly command and can only be used in CanadienDragons Channel');
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
		if (text.includes('overlay expert') && channel === '#canadiendragon') {
			chatClient.say(channel, `Hey ${msg.userInfo.displayName}, are you tired of spending hours configuring your stream's overlays and alerts? Check out Overlay Expert! With our platform, you can create stunning visuals for your streams without any OBS or streaming software knowledge. Don't waste time on technical details - focus on creating amazing content. Visit https://overlay.expert/support for support and start creating today! 🎨🎥, For support, see https://overlay.expert/support`);
		}
		const savedLurkMessage = await getSavedLurkMessage(msg.userInfo.displayName);
		if (savedLurkMessage && text.includes(`@${savedLurkMessage.displayName}`)) {
			chatClient.say(channel, `${msg.userInfo.displayName}, ${user}'s lurk message: ${savedLurkMessage.message}`);
		}
		if (text.includes('overlay designer') && channel === '#canadiendragon') {
			chatClient.say(channel, `Hey ${msg.userInfo.displayName}, do you have an eye for design and a passion for creating unique overlays? Check out https://overlay.expert/designers to learn how you can start selling your designs and making money on Overlay Expert. Don't miss this opportunity to turn your creativity into cash!`);
		}
		if (text.includes('wl') && channel === '#canadiendragon') {
			const amazon = 'https://www.amazon.ca/hz/wishlist/ls/354MPD0EKWXZN?ref_=wl_share';
			setTimeout(() => { chatClient.say(channel, `check out the Wish List here if you would like to help out the stream ${amazon}`); }, 1800000);
		}
		if (text.includes('Want to become famous?') && channel === '#canadiendragon') {
			const mods = msg.userInfo.isMod;
			if (msg.userInfo.userId === userID || mods) return;
			await userApiClient.moderation.deleteChatMessages(userID, msg.id);
			await userApiClient.moderation.banUser(userID, { user: msg.userInfo.userId, reason: 'Promoting selling followers to a broadcaster for twitch' });
			chatClient.say(channel, `${msg.userInfo.displayName} bugger off with your scams and frauds, you have been removed from this channel, have a good day`);
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
		// TODO: send chat message every 10 minutes consistently in typescript.
		// const initialDelay = 600000; // Delay before the first execution in milliseconds (10 minutes)
		// const repeatDelay = 600000; // Delay between each execution in milliseconds (10 minutes)
		// const postMessage = async () => {
		// 	try {
		// 		await chatClient.say('#canadiendragon', 'Check out all my social media by using the !social command, or check out the commands by executing the !command command');
		// 	} catch (error) {
		// 		console.error(error);
		// 	}

		// 	setTimeout(postMessage, repeatDelay); // Schedule the next execution
		// };

		// setTimeout(postMessage, initialDelay); // Schedule the first execution
	};
	chatClient.onMessage(commandHandler);

	chatClient.onJoin(async (channel: string, user: string) => {
		try {
			if (chatClient.isConnected) {
				const isMod = await userApiClient.moderation.checkUserMod(broadcasterInfo?.id!, openDevBotID);
				if (!isMod) {
					await chatClient.say(channel, 'Hello, I\'m now connected to your chat, dont forget to make me a mod', {}, { limitReachedBehavior: 'enqueue' });
					await sleep(1000);
					await chatClient.action(channel, '/mod opendevbot');
				}
			} else {
				console.info('The chatClient is not connected');
			}
		} catch (error) {
			console.error(error);
		}
	});
	chatClient.onAuthenticationFailure((text: string, retryCount: number) => { console.warn('Attempted to connect to a channel ', text, retryCount); });
}

function registerCommand(newCommand: Command) {
	commands.add(newCommand.name);
	if (newCommand.aliases) {
		newCommand.aliases.forEach((alias) => {
			commands.add(alias);
			// console.log(alias);
		});
	}
}

// holds the ChatClient
let chatClientInstance: ChatClient;
export async function getChatClient(): Promise<ChatClient> {
	if (!chatClientInstance) {
		const authProvider = await getAuthProvider();

		chatClientInstance = new ChatClient({
			authProvider,
			channels: ['canadiendragon'],
			logger: { minLevel: 'ERROR' },
			authIntents: ['chat'],
			botLevel: 'none',
			isAlwaysMod: false,
			requestMembershipEvents: true,
		});
		chatClientInstance.connect();
	}
	return chatClientInstance;
}