import { PrivateMessage } from '@twurple/chat/lib';
import axios from 'axios';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';

// Define the Weapon interface
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

// Define the interfaces for other item types
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

interface Consumable {
  name: string;
  description: string;
  quality: string;
  health: number;
  stamina: number;
  weight: number;
  carry: number;
}

interface Throwable {
  name: string;
  description: string;
  quality: string;
  carry: number;
}

interface Trap {
  name: string;
  description: string;
  quality: string;
  carry: number;
}

// Access the arrays for each item type within the JSON object
const weapons: Weapon[] = [];
const melee: Melee[] = [];
const tools: Tools[] = [];
const consumables: Consumable[] = [];
const throwables: Throwable[] = [];
const traps: Trap[] = [];

// Function to determine the item category based on the input itemName
function getItemCategory(itemName: string): string | null {
	const lowerCaseName = itemName.toLowerCase();

	if (weapons.find((weapon: Weapon) => weapon.name.toLowerCase() === lowerCaseName)) {
		return 'weapons';
	}

	if (melee.find((meleeItem: Melee) => meleeItem.name.toLowerCase() === lowerCaseName)) {
		return 'melee';
	}

	if (consumables.find((consumable: Consumable) => consumable.name.toLowerCase() === lowerCaseName)) {
		return 'consumables';
	}

	if (tools.find((tool: Tools) => tool.name.toLowerCase() === lowerCaseName)) {
		return 'tools';
	}

	if (throwables.find((throwable: Throwable) => throwable.name.toLowerCase() === lowerCaseName)) {
		return 'throwables';
	}

	if (traps.find((trap: Trap) => trap.name.toLowerCase() === lowerCaseName)) {
		return 'traps';
	}

	console.log('Item not found:', itemName); // Log the item name that couldn't be matched
	return null; // Item category not found
}

const test: Command = {
	name: 'test',
	description: 'This Command is only for Developer',
	usage: '!test <itemname>',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
		const itemName = args.join(' ');
		const display = msg.userInfo.displayName;

		if (!args[0]) return chatClient.say(channel, `Usage: ${test.usage}`);
		if (msg.userInfo.userId !== '31124455') return chatClient.say(channel, 'You can not use this command, this command is used for testing');


		const response = await axios.get(`http://localhost:5000/api/v1/weapons/${itemName}`, {
			headers: {
				'Content-Type': 'application/json'
			}
		});
		const jsonData = response.data;
		await chatClient.say(channel, `Item Stats for ${jsonData.name}, Type: ${jsonData.type}`);
	}
};

export default test;