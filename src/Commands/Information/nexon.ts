import { ChatClient, ChatMessage } from '@twurple/chat/lib';
import axios, { AxiosInstance } from 'axios';
import path from 'path';
import fs from 'fs';

import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import tfd from '../../database/models/tfd_ouid';

// Load the JSON files
const moduleDataPath = path.join(__dirname, '../../TFD_metadata', 'nexon_module.json');
const moduleData = JSON.parse(fs.readFileSync(moduleDataPath, 'utf-8'));

const descendantDataPath = path.join(__dirname, '../../TFD_metadata', 'nexon_decendents.json');
const descendantData = JSON.parse(fs.readFileSync(descendantDataPath, 'utf-8'));

const weaponDataPath = path.join(__dirname, '../../TFD_metadata', 'nexon_weapon.json');
const weaponData = JSON.parse(fs.readFileSync(weaponDataPath, 'utf-8'));

const reactorDataPath = path.join(__dirname, '../../TFD_metadata', 'nexon_reactor.json');
const reactorData = JSON.parse(fs.readFileSync(reactorDataPath, 'utf-8'));

const externalComponentDataPath = path.join(__dirname, '../../TFD_metadata', 'nexon_external-component.json');
const externalComponentData = JSON.parse(fs.readFileSync(externalComponentDataPath, 'utf-8'));

const titleDataPath = path.join (__dirname, '../../TFD_metadata', 'nexon_title.json');
const titleData = JSON.parse(fs.readFileSync(titleDataPath, 'utf-8'));

// Function to get module name by ID
export function getModuleNameById(id: string): string {
	const module = moduleData.find((mod: { module_id: string; module_name: string }) => mod.module_id === id);
	return module ? module.module_name : 'Unknown Module';
}

// Function to get descendant name by ID
export function getDescendantNameById(id: string): string {
	const descendant = descendantData.find((desc: { descendant_id: string; descendant_name: string }) => desc.descendant_id === id);
	return descendant ? descendant.descendant_name : 'Unknown Descendant';
}

// Function to get weapon name by ID
export function getWeaponNameById(id: string): string {
	const weapon = weaponData.find((wep: { weapon_id: string; weapon_name: string }) => wep.weapon_id === id);
	return weapon ? weapon.weapon_name : 'Unknown Weapon';
}
// Function to get weapon name by ID
export function getReactorNameById(id: string): string {
	const reactor = reactorData.find((rea: { reactor_id: string; reactor_name: string }) => rea.reactor_id === id);
	return reactor ? reactor.reactor_name : 'Unknown Reactor';
}

// Function to get weapon name by ID
export function getExternalComponentNameById(id: string): string {
	const externalcomponent = externalComponentData.find((ec: { external_component_id: string; external_component_name: string }) => ec.external_component_id === id);
	return externalcomponent ? externalcomponent.external_component_name : 'Unknown External Component';
}

export function getDescendantTitleNameById(id: string): string {
	const DesTitle = titleData.find((dt: Title) => dt.title_id === id);
	return DesTitle ? DesTitle.title_name : 'Unknown Descendant Title';
}

export let nexonApi: AxiosInstance;
if (process.env.Enviroment === 'dev') {
	nexonApi = axios.create({
		baseURL: 'https://open.api.nexon.com/tfd/v1',
		headers: {
			'x-nxopen-api-key': `${process.env.NEXON_API_KEY}`,
		},
	});
} else {
	nexonApi = axios.create({
		baseURL: 'https://open.api.nexon.com/tfd/v1',
		headers: {
			'x-nxopen-api-key': `${process.env.NEXON_API_KEY}`,
		},
	});
}

// Define the type for the module
export interface Module {
  module_slot_id: string;
  module_id: string;
  module_enchant_level: number;
}

// Define the type for the descendant
export interface Descendant {
  descendant_id: string;
  descendant_name: string;
}

// Define the type for the weapon
export interface Weapon {
  module_max_capacity: number;
  module_capacity: number;
  weapon_slot_id: string;
  weapon_id: string;
  weapon_level: number;
  perk_ability_enchant_level: number;
  weapon_additional_stat: Array<{ additional_stat_name: string; additional_stat_value: string }>;
  module: Array<Module>;
}

export interface ReactorAdditionalStat {
  additional_stat_name: string;
  additional_stat_value: string;
}

export interface Reactor {
  reactor_id: string;
  reactor_slot_id: string;
  reactor_level: number;
  reactor_additional_stat: ReactorAdditionalStat[];
  reactor_enchant_level: number;
}

export interface ExternalComponentAdditionalStat {
  additional_stat_name: string;
  additional_stat_value: string;
}

export interface ExternalComponent {
  external_component_slot_id: string;
  external_component_id: string;
  external_component_level: number;
  external_component_additional_stat: ExternalComponentAdditionalStat[];
}

export interface ExternalComponentResponse {
  ouid: string;
  user_name: string;
  external_component: ExternalComponent[];
}

export interface Title {
	title_id: string;
	title_name: string;
}

const nexon: Command = {
	name: 'nexon',
	description: 'Interacting with the Nexon API for The First Descendant',
	usage: '!nexon [get-ouid | get-user-(info,basic,descendant,weapon,reactor,ec)] [nexonname]',
	devOnly: false,
	cooldown: 30000,
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();

		if (args.length < 1) {
			await chatClient.say(channel, `@${user}, please provide a subcommand ${nexon.usage}`);
			return;
		}

		const subcommand = args[0].toLowerCase();
		const Lang = args[2] || 'en';

		try {
			switch (subcommand) {
				case 'get-ouid':
					try {
						const userName = args[1];
						let ouidEntry = await tfd.findOne({ username: userName });
						if (!args[1]) return chatClient.say(channel, 'You Must Provide your full Nexon Account Name (Nexonname123#456)');

						if (!ouidEntry) {
							const response = await nexonApi.get('/id', {
								params: { user_name: userName },
							});

							const ouid = response.data.ouid;
							// console.log('Nexon Response: ', response.data);

							ouidEntry = new tfd({ OUID: ouid, username: userName });
							await ouidEntry.save();

							await chatClient.say(channel, `OUID saved for ${userName}`);
						} else {
							await chatClient.say(channel, `OUID already exists for ${userName}`);
						}
					} catch (error) {
						console.error('Error fetching OUID:', error);
						await chatClient.say(channel, 'An error occurred while retrieving the OUID');
					}
					break;

				case 'get-user-info':
					try {
						const userName = args[1] || 'GamingDragon688#7080';
						// if (!args[1]) return chatClient.say(channel, 'You Must Provide your full Nexon Account Name (Nexonname123#456)');
						const ouidEntry = await tfd.findOne({ username: userName });

						if (!ouidEntry) {
							await chatClient.say(channel, `No OUID found for ${userName}. Please use the '!nexon [get-ouid] (nexonname)' subcommand first.`);
							return;
						}

						const userResponse = await nexonApi.get('/user/basic', {
							params: { ouid: ouidEntry.OUID },
						});

						const {
							ouid,
							user_name,
							platform_type,
							mastery_rank_level,
							mastery_rank_exp,
							title_prefix_id,
							title_suffix_id,
							os_language,
							game_language,
						} = userResponse.data;

						const userMessage = `
						${user_name}'s User Info\n
						- Platform Type: ${platform_type}\n
						- Mastery Rank Level: ${mastery_rank_level}\n
						- Mastery Rank EXP: ${mastery_rank_exp}\n
						- Title Name: ${getDescendantTitleNameById(title_prefix_id) + getDescendantTitleNameById(title_suffix_id)}
						- OS Language: ${os_language}\n
						- Game Language: ${game_language}`;

						await chatClient.say(channel, userMessage.trim().replace(/\n\s+/g, ' '));
					} catch (error) {
						console.error('Error fetching user data:', error);
						await chatClient.say(channel, 'An error occurred while retrieving data');
					}
					break;
				case 'get-user-descendant':
					try {
						const userName = args[1] || 'GamingDragon688#7080';
						// if (!args[1]) return chatClient.say(channel, 'You Must Provide your full Nexon Account Name (Nexonname123#456)');
						const ouidEntry = await tfd.findOne({ username: userName });
	
						if (!ouidEntry) {
							return chatClient.say(channel, `No OUID found for username: ${userName}. Please use the \`!nexon (get-ouid) [nexonname]\` command first.`);
						}
	
						const descendantResponse = await nexonApi.get('/user/descendant', {
							params: { ouid: ouidEntry.OUID },
						});
	
						const {
							ouid,
							user_name,
							descendant_id,
							descendant_slot_id,
							descendant_level,
							module_max_capacity,
							module_capacity,
							module,
						} = descendantResponse.data;
	
						// const descendantImageUrl = descendantData.find((desc: { descendant_id: string }) => desc.descendant_id === descendant_id)?.descendant_image_url || '';
	
						const descendantInfo = `
						${user_name}'s Descendant Info:
						OUID: ${ouid}
						Descendant Name: ${getDescendantNameById(descendant_id)}
						Descendant Slot ID: ${descendant_slot_id || 'None'}
						Descendant Level: ${descendant_level}
						Module Max Capacity: ${module_max_capacity}
						Module Capacity: ${module_capacity}
						${module.length > 0 ? module.map((mod: Module) => 
		`Module ${mod.module_slot_id}: Name: ${getModuleNameById(mod.module_id)}, Enchantment Level: ${mod.module_enchant_level}`).join('\n')
		: 'Modules: No modules equipped'}`;
	
						await chatClient.say(channel, descendantInfo.trim());
					} catch (error) {
						console.error('Error fetching user descendant data:', error);
						await chatClient.say(channel, 'An error occurred while trying to retrieve the user descendant data.');
					}
					break;
				case 'get-user-weapon':
					try {
						const userName = args[1] || 'GamingDragon688#7080';
						if (!args[1]) return chatClient.say(channel, 'You Must Provide your full Nexon Account Name (Nexonname123#456)');
				
						const ouidEntry = await tfd.findOne({ username: userName });
						if (!ouidEntry) {
							return chatClient.say(
								channel,
								`No OUID found for username: ${userName}. Please use the \`get-ouid\` command first.`
							);
						}
				
						const weaponResponse = await nexonApi.get('/user/weapon', {
							params: {
								ouid: ouidEntry.OUID,
								language_code: Lang
							},
						});
				
						const { weapon } = weaponResponse.data;
						let currentMessage = `${userName}'s Weapon Info:\n`;
				
						weapon.forEach((weap: Weapon) => {
							const weaponInfo =
												`Weapon Slot ${weap.weapon_slot_id}:\n` +
												`- Name: ${getWeaponNameById(weap.weapon_id)}\n` +
												`- Level: ${weap.weapon_level}\n` +
												`- Perk Ability Enchant Level: ${weap.perk_ability_enchant_level || 'N/A'}\n` +
												`- Module Max Capacity: ${weap.module_max_capacity}\n` +
												`- Module Capacity: ${weap.module_capacity}\n` +
												`- Additional Stats: ${weap.weapon_additional_stat.map(stat => `${stat.additional_stat_name}: ${stat.additional_stat_value}`).join(', ')}\n`;
				
							if ((currentMessage + weaponInfo).length > 500) {
								chatClient.say(channel, currentMessage.trim());
								currentMessage = '';
							}
				
							currentMessage += weaponInfo;
						});
				
						if (currentMessage.trim().length > 0) {
							chatClient.say(channel, currentMessage.trim());
						}
				
					} catch (error) {
						console.error('Error fetching user weapon data:', error);
						chatClient.say(channel, 'An error occurred while trying to retrieve the user weapon data.');
					}
					break;
				case 'get-user-reactor':
					try {
						const userName = args[1] || 'GamingDragon688#7080';
						if (!args[1]) return chatClient.say(channel, 'You Must Provide your full Nexon Account Name (Nexonname123#456)');

						const ouidEntry = await tfd.findOne({ username: userName });

						if (!ouidEntry) {
							return chatClient.say(channel, `No OUID found for username: ${userName}. Please use the \`get-ouid\` command first.`);
						}

						const reactorResponse = await nexonApi.get('/user/reactor', {
							params: {
								ouid: ouidEntry.OUID,
								language_code: Lang,
							},
						});

						const { reactor_id, reactor_slot_id, reactor_level, reactor_additional_stat, reactor_enchant_level } = reactorResponse.data;

						const reactorInfo = 
			`${userName}'s Reactor Info:\n` +
			`- Reactor ID: ${reactor_id}\n` +
			`- Reactor Name: ${getReactorNameById(reactor_id)}\n` +
			`- Reactor Slot ID: ${reactor_slot_id || 'None'}\n` +
			`- Reactor Level: ${reactor_level}\n` +
			`- Reactor Enchant Level: ${reactor_enchant_level}\n` +
			`- Additional Stats: ${reactor_additional_stat.length > 0 
				? reactor_additional_stat.map((stat: ReactorAdditionalStat) => `${stat.additional_stat_name}: ${stat.additional_stat_value}`).join(', ') 
				: 'No additional stats'}`;

						await chatClient.say(channel, reactorInfo.trim());
					} catch (error) {
						console.error('Error fetching user reactor data:', error);
						await chatClient.say(channel, 'An error occurred while trying to retrieve the user reactor data.');
					}
					break;
				case 'get-user-ec':
					try {
						const userName = args[1];
						if (!args[1]) return chatClient.say(channel, 'You Must Provide your full Nexon Account Name (Nexonname123#456)');
						const ouidEntry = await tfd.findOne({ username: userName });
				
						if (!ouidEntry) {
							return chatClient.say(channel, `No OUID found for username: ${userName}. Please use the \`get-ouid\` command first.`);
						}
				
						const externalComponentResponse = await nexonApi.get('/user/external-component', {
							params: { ouid: ouidEntry.OUID, language_code: Lang },
						});
				
						const {
							external_component,
						}: ExternalComponentResponse = externalComponentResponse.data;

						let externalComponentMessage = `${userName}'s External Components:\n`;

						external_component.forEach((component: ExternalComponent, index: number) => {
							externalComponentMessage += 
        `\nComponent ${index + 1} - Slot ID: ${component.external_component_slot_id}\n` +
        `Component Name: ${getExternalComponentNameById(component.external_component_id)}\n` +
        `Component Level: ${component.external_component_level}\n` +
        `Additional Stats: ${component.external_component_additional_stat.length > 0 ? component.external_component_additional_stat.map((stat: ExternalComponentAdditionalStat) => `${stat.additional_stat_name}: ${stat.additional_stat_value}`).join('\n'):'No additional stats'}\n`;});
				
						await chatClient.say(channel, externalComponentMessage.trim());
					} catch (error) {
						console.error('Error fetching external component data:', error);
						await chatClient.say(channel, 'An error occurred while trying to retrieve the external component data.');
					}
					break;
				default:
					await chatClient.say(channel, `@${user}, unknown subcommand: ${subcommand}`);
			}
		} catch (error: any) {
			console.error('Unexpected error:', error);
			await chatClient.say(channel, 'Unexpected error occurred while processing the command.');
		}
	},
};

export default nexon;