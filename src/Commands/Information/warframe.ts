import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { openDevBotID } from '../../util/constants';
import { sleep } from '../../util/util';

interface WarframeData {
	uniqueName: string;
	name: string;
	health: number;
	shield: number;
	armor: number;
	power: number;
	masteryReq: number;
	buildTime: number;
	abilities: Abilities[];
	components: Components[];
	conclave: boolean;
	consumeOnBuild: boolean;
	description: string;
	exalted: string[];
	imageName: string;
	introduced: Introduced[];
	isPrime: boolean;
	marketCost: number;
	masterable: boolean;
	passiveDescription: string;
	patchLogs: PatchLogs[];
	polarities: string;
	productCategory: string;
	releaseDate: string;
	sex: string;
	skipBuildTimePrice: number;
	sprint: number;
	sprintSpeed: number;
	stamina: number;
	tradable: boolean;
	type: string;
	wikiaThumbnail: string;
	wikiaUrl: string;
}

interface PatchLogs {
	name: string;
	date: string;
	url: string;
	additions: string;
	changes: string;
	fixes: string;
}

interface Introduced {
	name: string;
	url: string;
	aliases: string[];
	parent: string;
	date: string;
}
interface Components {
	uniqueName: string;
	name: string;
	description: string;
	itemCount: number;
	imageName: string;
	tradable: boolean;
	masterable: boolean;
	drops: Drops[];
}

interface Drops {
	chance: number;
	location: string;
	rarity: string;
	type: string;
}

interface Abilities {
	name: string;
	description: string;
}

function formatTime(timeInSeconds: number) {
	const days = Math.floor(timeInSeconds / 86400);
	const hours = Math.floor((timeInSeconds % 86400) / 3600);
	const minutes = Math.floor(((timeInSeconds % 86400) % 3600) / 60);
	const seconds = Math.floor(((timeInSeconds % 86400) % 3600) % 60);

	const formattedDays = days > 0 ? `${days}d ` : '';
	const formattedHours = hours > 0 ? `${hours}h ` : '';
	const formattedMinutes = minutes > 0 ? `${minutes}m ` : '';
	const formattedSeconds = seconds > 0 ? `${seconds}s` : '';

	return `${formattedDays}${formattedHours}${formattedMinutes}${formattedSeconds}`;
}

const warframe: Command = {
	name: 'warframe',
	description: 'get information about warframe the lore of warframe or my warframe MasteryRank(s)',
	usage: '!warframe [about|lore|mr|frames] <framename>',
	/**
	 * Executes the warframe command based on the specified arguments.
	 * 
	 * @param {string} channel The channel where the command was triggered.
	 * @param {string} user The user who triggered the command.
	 * @param {string[]} args The arguments passed to the command.
	 * @param {string} text The full text of the message that triggered the command.
	 * @param {ChatMessage} msg The message instance that triggered the command.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();

		// --- Rate limiting / cooldowns for frames lookup ---
		// Per-user cooldown map (stores timestamp when user may query again)
		const userCooldownsKey = '__warframe_user_cooldowns';
		// Attach shared maps to module-level (via globalThis) to survive multiple calls in same process
		const globalRecord = globalThis as unknown as Record<string, unknown>;
		if (!globalRecord[userCooldownsKey]) globalRecord[userCooldownsKey] = new Map<string, number>();
		const userCooldowns: Map<string, number> = globalRecord[userCooldownsKey] as Map<string, number>;

		// Global sliding-window timestamps for requests
		const globalWindowKey = '__warframe_global_timestamps';
		if (!globalRecord[globalWindowKey]) globalRecord[globalWindowKey] = [] as number[];
		const globalTimestamps: number[] = globalRecord[globalWindowKey] as number[];

		const USER_COOLDOWN_MS = process.env.WARFRAME_USER_COOLDOWN_MS ? Number(process.env.WARFRAME_USER_COOLDOWN_MS) : 30 * 1000; // 30s default
		const GLOBAL_WINDOW_MS = process.env.WARFRAME_GLOBAL_WINDOW_MS ? Number(process.env.WARFRAME_GLOBAL_WINDOW_MS) : 60 * 1000; // 1 minute
		const GLOBAL_MAX_REQUESTS = process.env.WARFRAME_GLOBAL_MAX ? Number(process.env.WARFRAME_GLOBAL_MAX) : 30; // 30 requests per window


		if (channel !== '#skullgaminghq') return;

		const display = msg.userInfo.displayName;
		switch (args[0]) {
			case 'about':
				await chatClient.say(channel, 'Warframe is a free-to-play action role-playing third-person shooter multiplayer online game developed and published by Digital Extremes.');
				break;
			case 'lore':
				const warframeURL = 'https://warframe.com/landing';
				await chatClient.say(channel, `In Warframe, players control members of the Tenno, a race of ancient warriors who have awoken from centuries of suspended animation far into Earth's future to find themselves at war in the planetary system with different factions. The Tenno use their powered Warframes along with a variety of weapons and abilities to complete missions. ${warframeURL}`);
				break;
			case 'mr':
				const xblWFRank = 12;
				const ps4WFRank = 17;
				const pcWFRank = 1;
				await chatClient.say(channel, `Mastery Rank: XBOX: ${xblWFRank}, PS4: ${ps4WFRank}, PC: ${pcWFRank}`);
				break;
			case 'frames':
				if (args.length < 2) {
					await chatClient.say(channel, `Usage: ${warframe.usage}`);
					return;
				}

				const warframeName = args.slice(1).join(' ').toLowerCase();
				// Rate-limit checks before doing the lookup
				const now = Date.now();
				const userId = msg.userInfo?.userId || user.toLowerCase();

				// purge old global timestamps
				while (globalTimestamps.length > 0 && globalTimestamps[0] <= now - GLOBAL_WINDOW_MS) {
					globalTimestamps.shift();
				}

				if (globalTimestamps.length >= GLOBAL_MAX_REQUESTS) {
					return chatClient.say(channel, `@${user}, the Warframe lookup is temporarily rate-limited. Please try again in a moment.`);
				}

				const userAllowedAt = userCooldowns.get(userId) || 0;
				if (now < userAllowedAt) {
					const wait = Math.ceil((userAllowedAt - now) / 1000);
					return chatClient.say(channel, `@${user}, please wait ${wait}s before running another frames lookup.`);
				}

				// record this request
				globalTimestamps.push(now);
				userCooldowns.set(userId, now + USER_COOLDOWN_MS);

				const warframeUrl = `https://api.warframestat.us/warframes/search/${warframeName}`;

				try {
					const response = await fetch(warframeUrl);
					const data = await response.json();
					if (!data || !data[0]) {
						return chatClient.say(channel, `No Warframe found with the name "${warframeName}"`);
					}
					const warframeData: WarframeData = data[0];
					// console.log(warframeData.components[0]);
					if (warframeName.endsWith('Prime')) return chatClient.say(channel, 'I can not look up prime version of warframes yet');

					// Prepare a short summary for chat and a detailed message for whisper or chunked chat messages
					let shortMessage = '';
					let detailedMessage = '';
					if (warframeData) {
						shortMessage = `Warframe: ${warframeData.name} | Build: ${formatTime(warframeData.buildTime)} | Mastery: ${warframeData.masteryReq} | Tradable: ${warframeData.tradable}`;

						const components = warframeData.components
							.map((component) => {
								const drops = component.drops
									.map((drop) => {
										return `${drop.type} (Rarity: ${drop.rarity}, Chance: ${drop.chance.toFixed(3)}%, Location: ${drop.location})`;
									})
									.join('; ');
								return `${component.name} (Tradeable: ${component.tradable}) - Drops: ${drops}`;
							})
							.join(' | ');

						detailedMessage = `Warframe: ${warframeData.name}\nBuild Time: ${formatTime(warframeData.buildTime)}\nComponents: ${components}\nTradable: ${warframeData.tradable}\nMasterable: ${warframeData.masterable}\nMastery Requirement: ${warframeData.masteryReq}\nWiki: ${warframeData.wikiaUrl}`;
					} else {
						shortMessage = 'No data found for that Warframe.';
						detailedMessage = shortMessage;
					}

					// Send a short summary to chat first
					await chatClient.say(channel, shortMessage.length > 0 ? shortMessage : 'No data found for that Warframe.');

					// If the detailed message is long, try whispering it to the user. If whisper fails, fall back to chunked chat messages.
					try {
						if (detailedMessage.length > 500) {
							// Send via whisper
							await userApiClient.whispers.sendWhisper(openDevBotID, msg.userInfo.userId, detailedMessage);
							await chatClient.say(channel, `${display}, I've sent the full details to you via whisper.`);
						} else {
							await chatClient.say(channel, detailedMessage);
						}
					} catch (err) {
						console.error('Failed to send whisper - falling back to chunked chat messages:', err);
						// Chunk into <=500 char pieces and send with brief delays
						const maxLen = 400; // leave buffer
						for (let i = 0; i < detailedMessage.length; i += maxLen) {
							const part = detailedMessage.slice(i, i + maxLen);
							await chatClient.say(channel, part);
							await sleep(700); // brief pause to avoid rate limits
						}
					}
				} catch (e) {
					console.error(`Error fetching Warframe data: ${e}`);
					await chatClient.say(channel, `An error occurred while fetching data for "${warframeName}"`);
				}
				break;
			default:
				await chatClient.say(channel, `${display}, Usage: ${warframe.usage}`);
				break;
		}
	}
};
export default warframe;