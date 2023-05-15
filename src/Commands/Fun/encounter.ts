import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
// import Game from '../../database/models/gameModel';
import { Command } from '../../interfaces/apiInterfaces';

/**
 Yes, I'm familiar with the Streamlabs Chatbot Heist game. It's a text-based adventure game where viewers can join the streamer in a cooperative adventure to try and accumulate 
 as much virtual currency as possible by completing encounters and avoiding traps. Encounters are randomly generated events with different outcomes and rewards, and the game 
 progresses through different levels of difficulty as more encounters are completed. Viewers can use virtual currency to equip themselves with weapons, items, and other helpful 
 tools before embarking on encounters. Does that sound like what you're looking for?
 */



interface Equipment {
  name: string;
  attack: number;
  defense: number;
	throwable: boolean;
	trap: boolean;
}

const equipment: Equipment[] = [
	{ name: 'Knife', attack: 2, defense: 0, throwable: false, trap: false },
	{ name: 'Pistol', attack: 4, defense: 2, throwable: false, trap: false },
	{ name: 'Assault Rifle', attack: 6, defense: 4, throwable: false, trap: false },
];

const encounter: Command = {
	name: 'encounter',
	description: 'Play a game of Encounter(Based around Vigor)',
	usage: '!encounter start',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
	},
};

export default encounter;