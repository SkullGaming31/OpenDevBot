import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { IUser, UserModel } from '../../database/models/userModel';
import balanceAdapter from '../../services/balanceAdapter';
import { Command } from '../../interfaces/Command';

interface ItemPrices {
	[itemName: string]: {
		name: string;
		price: number;
	};
}

const itemSellPrices: ItemPrices = {
	item1: { name: 'disguise', price: 100 },
	item2: { name: 'Lockpick', price: 250 },
	item3: { name: 'Flashlight', price: 500 },
	item4: { name: 'Getaway Car', price: 20000 },
	item5: { name: 'HackingDevice', price: 1500 }
};

const shop: Command = {
	name: 'shop',
	description: 'Buy items from a shop',
	usage: '!shop <buy|sell|list> [itemname]',
	/**
	 * Executes the shop command.
	 * 
	 * @param channel The channel where the command was invoked.
	 * @param user The user who invoked the command.
	 * @param args The arguments passed to the command, which can be 'buy', 'sell', or 'list'.
	 * @param text The full text of the message.
	 * @param msg The chat message object containing metadata and user information.
	 * 
	 * The function performs the following actions based on the command:
	 * - 'buy': Buys an item from the shop and removes the cost from the user's balance.
	 * - 'sell': Sells an item from the user's inventory and adds the sell price to the user's balance.
	 * - 'list': Lists the available items in the shop.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		void text;
		const chatClient = await getChatClient();

		const action = args[0];
		const itemName = args.slice(1).join(' ');
		const userId = msg.userInfo.userId;

		if (!action) {
			return chatClient.say(channel, `Please provide a valid action. Usage: ${shop.usage}`);
		}

		const existingUser = await UserModel.findOne({ id: userId });

		if (!existingUser) {
			return chatClient.say(channel, 'User not found');
		}

		const balance = existingUser.balance ?? 0; // keep for inventory logic; wallet ops use adapter


		switch (action) {
			case 'buy':
				if (!itemName) {
					return chatClient.say(channel, 'Please provide an item name. Usage: !shop buy <itemname>');
				}

				const itemPrice = getItemPrice(itemName);

				if (!itemPrice) {
					return chatClient.say(channel, `Item "${itemName}" is not available in the shop.`);
				}

				if (balance < itemPrice) {
					return chatClient.say(channel, 'Insufficient balance to purchase this item.');
				}

				// Debit the user's wallet via adapter and then update inventory
				const debited = await balanceAdapter.debitWallet(userId, itemPrice, user, msg.channelId);
				if (!debited) return chatClient.say(channel, 'Insufficient balance to purchase this item.');

				const updatedUser: Partial<IUser> = {
					id: userId,
					inventory: [...(existingUser.inventory ?? []), itemName],
				};

				await UserModel.findOneAndUpdate({ id: userId, channelId: msg.channelId }, updatedUser);

				chatClient.say(channel, `Item "${itemName}" purchased successfully.`);
				break;

			case 'sell':
				if (!itemName) {
					return chatClient.say(channel, 'Please provide an item name. Usage: !shop sell <itemname>');
				}

				// Check if the item is in the user's inventory
				const itemIndex = existingUser.inventory?.indexOf(itemName);

				if (itemIndex === undefined || itemIndex === -1) {
					return chatClient.say(channel, `Item "${itemName}" is not in your inventory.`);
				}

				const updatedInventory = [...(existingUser.inventory ?? [])];
				updatedInventory.splice(itemIndex, 1);

				// Get the sell price of the item
				const sellPrice = getItemSellPrice(itemName);

				if (!sellPrice) {
					return chatClient.say(channel, `Item "${itemName}" cannot be sold.`);
				}

				// Credit the user's wallet via adapter
				await balanceAdapter.creditWallet(userId, sellPrice, user, msg.channelId);

				const updatedUserSell: Partial<IUser> = {
					id: userId,
					inventory: updatedInventory,
				};

				await UserModel.findOneAndUpdate({ id: userId, channelId: msg.channelId }, updatedUserSell);

				chatClient.say(channel, `Item "${itemName}" sold successfully.`);
				break;

			case 'list':
				// Get the list of available items
				const availableItems = getAvailableItems();

				if (availableItems.length === 0) {
					return chatClient.say(channel, 'The shop is currently empty.');
				}

				const itemList = availableItems.map(itemName => {
					const item = itemSellPrices[itemName];
					return `${item.name} (${item.price} coins)`;
				});

				const maxCharacters = 500;
				let message = `Available items in the shop: ${itemList[0]}`;
				for (let i = 1; i < itemList.length; i++) {
					const newItem = `, ${itemList[i]}`;
					if (message.length + newItem.length <= maxCharacters) {
						message += newItem;
					} else {
						chatClient.say(channel, message);
						message = newItem;
					}
				}

				if (message.length > 0) {
					chatClient.say(channel, message);
				}
				break;
		}
	},
};

/**
 * Retrieves the price of an item in the shop.
 *
 * @param {string} itemName - The name of the item
 * @returns {number | undefined} The price of the item, or undefined if the
 * item is not available
 */
function getItemPrice(itemName: string): number | undefined {
	const lowerCaseItemName = itemName.toLowerCase(); // Convert the item name to lowercase
	const item = Object.values(itemSellPrices).find(
		(item) => item.name.toLowerCase() === lowerCaseItemName
	);
	return item?.price;
}

/**
 * Retrieves the price of an item for selling. This is the same as the price
 * of buying the item.
 *
 * @param {string} itemName - The name of the item
 * @returns {number | undefined} The price of the item, or undefined if the
 * item is not available
 */
function getItemSellPrice(itemName: string): number | undefined {
	return getItemPrice(itemName);
}


/**
 * Retrieves the available items in the shop.
 *
 * @returns {string[]} An array of available item names
 */
function getAvailableItems(): string[] {
	return Object.keys(itemSellPrices);
}

export default shop;