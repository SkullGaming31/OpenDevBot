import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';

/**
 * steps to create a Twitch chat-based RPG game:
 * 
 * 1. Design the game world and mechanics: The first step would be to design the setting, characters, and mechanics of the game. This would include creating the rules, the character creation process, the types of actions that players can take, the rewards, and the consequences.
 * 
 * 2. Develop the game logic: Once the game mechanics have been established, the next step would be to develop the game logic, which would involve coding the game to interpret and respond to player input.
 * 
 * 3. Create a character creation system: Players should be able to create their own characters for the game. This could be done through a chatbot that prompts players to answer questions about their character and then creates a character sheet for them.
 * 
 * 4. Create a chatbot: A chatbot would be necessary to facilitate the game by interpreting player commands, managing game state, and responding with appropriate messages.
 * 
 * 5. Develop a combat system: Combat is a common element in RPG games, and a chat-based RPG could have its own system. For example, players could use text commands to attack, defend, or use items during combat.
 * 
 * 6. Create interactive events: To make the game more interesting and engaging, there could be random events that occur throughout the game. These events could be triggered by certain actions or just occur at random.
 * 
 * 7. Manage the game and players: As the game progresses, the chatbot would need to keep track of player stats, inventory, and progress. The chatbot could also handle things like leveling up, awarding experience points, and giving out rewards.
 */

const rpg: Command = {
	name: 'rpg',
	description: 'An RPG text based game',
	usage: '!rpg',
	/**
	 * Checks if the user executing the command is a mod or the broadcaster, if not tells them the command is not functional yet.
	 * @param channel The channel the command was used in
	 * @param user The user who used the command
	 * @param args The arguments passed to the command
	 * @param text The full text of the message that was posted
	 * @param msg The message object
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		chatClient.say(channel, `Command Description: ${rpg.description}, this Command is currently just a thought`);
	}
};
export default rpg;