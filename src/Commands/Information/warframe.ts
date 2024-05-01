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

const warframe: Command = {// needs more work
	name: 'warframe',
	description: 'get information about warframe the lore of warframe or my warframe MasteryRank(s)',
	usage: '!warframe [about|lore|mr|frames] <framename>',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();

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

					let prompted = false;

					chatClient.onMessage(async (channel, user, text, msg) => {
						let message;
						if (warframeData) {
							const components = warframeData.components
								.map((component) => {
									const drops = component.drops
										.map((drop) => {
											return `${drop.type} (Rarity: ${drop.rarity}, Chance: ${drop.chance.toFixed(3)}%, Location: ${drop.location}`;
										})
										.join('; ');
									return `${component.name} (Tradeable: ${component.tradable}) - Drops: ${drops}`;
								})
								.join(' - ');

							const buildTime = formatTime(warframeData.buildTime);
							message = `Warframe: ${warframeData.name},\n - Build Time: ${buildTime},\n Components: ${components},\n Tradable: ${warframeData.tradable},\n Masterable: ${warframeData.masterable},\n Mastery Requirement: ${warframeData.masteryReq},\n Wiki: ${warframeData.wikiaUrl}`;
						} else {
							message = 'No data found for that Warframe.';
						}

						await chatClient.say(channel, message);

						if (message.length > 500) {
							await chatClient.say(channel, 'The message is too long to be sent in chat. Do you want me to send it to you via twitch whisper? (yes|no)');
							prompted = true;
							await sleep(5000); // wait for 5 seconds for user response

							if (prompted && text.toLowerCase() === 'yes') {
								await userApiClient.whispers.sendWhisper(openDevBotID, msg.userInfo.userId, message);
								await chatClient.say(channel, `${user} check your whispers for response`);
							}
							prompted = false;
						} else {
							prompted = false;
						}
					});
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