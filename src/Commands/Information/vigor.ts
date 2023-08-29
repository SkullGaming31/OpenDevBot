import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import * as fs from 'fs';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { broadcasterInfo, moderatorID } from '../../util/constants';
import { sleep } from '../../util/util';

interface Weapon {
	name: string;
	description: string;
	type: string;
	slot: string;
	quality: string;
	basedamage: number;
	rateoffire: number;
	muzzleSpeed: number;
	magsize: number;
	weight: number;
	firemode: string[];
	Misc: string[];
}

interface Consumable {
	name: string;
	description: string;
	quality: string;
	health: number;
	stamina: number;
	weight: number;
	carry: number;
}

interface Trap {
	name: string;
	description: string;
	quality: string;
	carry: number;
}
interface Melee {
	name: string;
	type: string;
	slot: string;
	quality: string;
	basedamage: number;
	weight: number;
}

interface Tools {
	name: string;
	description: string;
	quality: string;
	carry: number;
}

interface Throwable {
	name: string;
	description: string;
	quality: string;
	carry: number;
}

interface Item {
	weapon?: Weapon[];
	consumables?: Consumable[];
	tools: Tools[];
	traps?: Trap[];
	throwable: Throwable[];
	melee?: Melee[];
}

const vigor: Command = {
	name: 'vigor',
	description: 'Show information about vigor items',
	usage: '!vigor [about, lore, item <item name>]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		try {
			const chatClient = await getChatClient();
			const userApiClient = await getUserApi();
			const items: Item = JSON.parse(fs.readFileSync('./src/Item_Data.json', 'utf8'));

			switch (args[0]) {
				case 'about':
					const vigorURL = 'https://vigorgame.com/about';
					await chatClient.say(channel, `Outlive the apocalypse. Vigor is a free-to-play looter shooter set in post-war Norway. LOOT, SHOOT BUILD Shoot and loot in tense encounters Build your shelter and vital equipment Challenge others in various game modes Play on your own or fight together with 2 of your other friends, check out vigor here: ${vigorURL}`);
					break;
				case 'lore':
					await chatClient.say(channel, 'theres no written lore for the game, its all recorded on tapes in the game itself, i will eventually, listen to them and write out what i can do describe the lore of the game as twitch messages can only be a max of 500 characters.');
					break;
				case 'item':// Guess of health data for healing consumables
					if (args.length < 2) return chatClient.say(channel, `Please specify a weapon name. Usage: ${vigor.usage}`);

					const itemName = args.slice(1).join(' '); // combine all remaining args into a single string
					// const items: Item = JSON.parse(fs.readFileSync('./src/Item_Data.json', 'utf8'));

					const weapons: Weapon[] = items.weapon || [];
					const consumables: Consumable[] = items.consumables || [];
					const traps: Trap[] = items.traps || [];
					const melees: Melee[] = items.melee || [];
					const tools: Tools[] = items.tools || [];
					const throwns: Throwable[] = items.throwable || [];

					const weapon = weapons.find((w: Weapon) => w.name.toLowerCase() === itemName.toLowerCase());
					const tool = tools.find((t: Tools) => t.name.toLowerCase() === itemName.toLowerCase());
					const trap = traps.find((tr: Trap) => tr.name.toLowerCase() === itemName.toLowerCase());
					const consumable = consumables.find((c: Consumable) => c.name.toLowerCase() === itemName.toLowerCase());
					const thrown = throwns.find((th: Throwable) => th.name.toLowerCase() === itemName.toLowerCase());
					const melee = melees.find((m: Melee) => m.name.toLowerCase() === itemName.toLowerCase());
					if (!moderatorID?.id) return;

					if (consumable) {
						const consum = [
							`Description: ${consumable.description}`,
							`Quality: ${consumable.quality || ''}`,
							`${consumable.health !== undefined ? `Healing: ${consumable.health}` : `Stamina: ${consumable.stamina || 0}`}`,
							`Carry: ${consumable.carry || 0}`
						];

						await chatClient.say(channel, `Hold on 1 second, i will check the Data for ${consumable.name}`);
						await sleep(3000);
						if (msg.userInfo.userId !== broadcasterInfo?.id) {
							// needs to be deleted by a moderator
							await userApiClient.moderation.deleteChatMessages(broadcasterInfo?.id as UserIdResolvable, msg.id);
						} else {
							await userApiClient.moderation.deleteChatMessages(broadcasterInfo?.id, msg.id);
						}
						await sleep(1000);
						await chatClient.say(channel, `@${user}, Item stats for ${consumable.name}, ${consum.join(', ')}`);
					}
					else if (melee) {
						const mel = [
							`Type: ${melee.type || ''}`,
							`Slot: ${melee.slot || ''}`,
							`Quality: ${melee.quality || ''}`,
							`Based Damage: ${melee.basedamage || ''}`,
							`Weight: ${melee.weight || ''}`
						];
						await chatClient.say(channel, `Hold on 1 second, i will check the Data for ${melee.name}`);
						await sleep(3000);
						if (msg.userInfo.userId !== broadcasterInfo?.id as UserIdResolvable) {
							// needs to be deleted by a moderator
							await userApiClient.moderation.deleteChatMessages(broadcasterInfo?.id as UserIdResolvable, msg.id);
						} else {
							await userApiClient.moderation.deleteChatMessages(broadcasterInfo?.id as UserIdResolvable, msg.id);
						}
						await sleep(1000);
						await chatClient.say(channel, `@${user}, Item stats for ${melee.name}, ${mel.join(', ')}`);
					}
					else if (tool) {
						const tol = [
							`Description: ${tool.description || ''}`,
							`Quality: ${tool.quality || ''}`,
							`Carry: ${tool.carry || 0}`
						];
						await chatClient.say(channel, `Hold on 1 second, i will check the Data for ${tool.name}`);
						await sleep(3000);
						if (msg.userInfo.userId !== broadcasterInfo?.id as UserIdResolvable) {
							// needs to be deleted by a moderator
							await userApiClient.moderation.deleteChatMessages(broadcasterInfo?.id as UserIdResolvable, msg.id);
						} else {
							await userApiClient.moderation.deleteChatMessages(broadcasterInfo?.id as UserIdResolvable, msg.id);
						}
						await sleep(1000);
						await chatClient.say(channel, `@${user}, Item stats for ${tool.name}, ${tol.join(', ')}`);
					}
					else if (trap) {
						const tra = [
							`Description: ${trap.description || ''}`,
							`Quality: ${trap.quality || ''}`,
							`Carry: ${trap.carry || 0}`
						];
						await chatClient.say(channel, `Hold on 1 second, i will check the Data for ${trap.name}`);
						await sleep(3000);
						if (msg.userInfo.userId !== broadcasterInfo?.id as UserIdResolvable) {
							// needs to be deleted by a moderator
							await userApiClient.moderation.deleteChatMessages(broadcasterInfo?.id as UserIdResolvable, msg.id);
						} else {
							await userApiClient.moderation.deleteChatMessages(broadcasterInfo?.id as UserIdResolvable, msg.id);
						}
						await sleep(1000);
						await chatClient.say(channel, `@${user}, Item stats for ${trap.name}, ${tra.join(', ')}`);
					}
					else if (thrown) {
						const thr = [
							`Description: ${thrown.description || ''}`,
							`Quality: ${thrown.quality || ''}`,
							`Carry: ${thrown.carry || ''}`
						];
						await chatClient.say(channel, `Hold on 1 second, i will check the Data for ${thrown.name}`);
						await sleep(3000);
						if (msg.userInfo.userId !== broadcasterInfo?.id as UserIdResolvable) {
							// needs to be deleted by a moderator
							await userApiClient.moderation.deleteChatMessages(broadcasterInfo?.id as UserIdResolvable, msg.id);
						} else {
							await userApiClient.moderation.deleteChatMessages(broadcasterInfo?.id as UserIdResolvable, msg.id);
						}
						await sleep(1000);
						await chatClient.say(channel, `@${user}, Item stats for ${thrown.name}, ${thr.join(', ')}`);
					}
					else if (weapon) {
						const guns = [
							`Type: ${weapon.type || ''}`,
							`Slot: ${weapon.slot || ''}`,
							`Quality: ${weapon.quality || ''}`,
							`Damage: ${weapon.basedamage || ''}`,
							`Muzzle Speed: ${weapon.muzzleSpeed || ''}`,
							`Fire Rate: ${weapon.rateoffire || ''}`,
							`Magazine Size: ${weapon.magsize || ''}`,
							`Fire Mode: ${weapon.firemode?.join(' ') || ''}`,
							`Misc: ${weapon.Misc?.join(' ') || ''}`
						];

						await chatClient.say(channel, `Hold on 1 second, i will check the Data for ${weapon.name}`);
						await sleep(3000);
						if (msg.userInfo.userId !== broadcasterInfo?.id as UserIdResolvable) {
							// needs to be deleted by a moderator
							await userApiClient.moderation.deleteChatMessages(broadcasterInfo?.id as UserIdResolvable, msg.id);
						} else {
							await userApiClient.moderation.deleteChatMessages(broadcasterInfo?.id as UserIdResolvable, msg.id);
						}
						await sleep(1000);
						await chatClient.say(channel, `@${user}, Item stats for ${weapon.name}, ${guns.join(', ')}`);
					} else {
						await chatClient.say(channel, `Sorry, I could not find an item named "${itemName}".`);
					}
					break;
				default:
					await chatClient.say(channel, `${user}, Usage: ${vigor.usage}`);
					break;
			}
		} catch (error: any) {
			console.error(error.message);
		}
	}
};
export default vigor;