import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { User, UserModel } from '../../database/models/userModel';
import { Command } from '../../interfaces/apiInterfaces';

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
	// Add more items and their sell prices here
};

const shop: Command = {
	name: 'shop',
	description: 'Buy items from a shop',
	usage: '!shop <buy|sell|list> [itemname]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
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

		const balance = existingUser.balance ?? 0;

		// Perform the action based on the command
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

			const updatedBalance = balance - itemPrice;
			const updatedUser: Partial<User> = {
				id: userId,
				balance: updatedBalance,
				inventory: [...(existingUser.inventory ?? []), itemName],
			};

			await UserModel.findOneAndUpdate({ id: userId }, updatedUser);

			chatClient.say(channel, `Item "${itemName}" purchased successfully. Your new balance is ${updatedBalance}.`);
			break;

		case 'sell':
			if (!itemName) {
				return chatClient.say(channel, 'Please provide an item name. Usage: !shop sell <itemname>');
			}

			// Check if the item exists in the user's inventory
			const itemIndex = existingUser.inventory?.indexOf(itemName);

			if (itemIndex === undefined || itemIndex === -1) {
				return chatClient.say(channel, `Item "${itemName}" is not in your inventory.`);
			}

			const updatedInventory = [...(existingUser.inventory ?? [])];
			updatedInventory.splice(itemIndex, 1);

			// Calculate the sell price of the item
			const sellPrice = getItemSellPrice(itemName);

			if (!sellPrice) {
				return chatClient.say(channel, `Item "${itemName}" cannot be sold.`);
			}

			const updatedBalanceSell = balance + sellPrice;
			const updatedUserSell: Partial<User> = {
				id: userId,
				balance: updatedBalanceSell,
				inventory: updatedInventory,
			};

			await UserModel.findOneAndUpdate({ id: userId }, updatedUserSell);

			chatClient.say(channel, `Item "${itemName}" sold successfully. Your new balance is ${updatedBalanceSell}.`);
			break;

		case 'list':
			// Retrieve the available items in the shop
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

// Helper function to retrieve the price of an item
function getItemPrice(itemName: string): number | undefined {
	const lowerCaseItemName = itemName.toLowerCase(); // Convert the item name to lowercase
	const item = Object.values(itemSellPrices).find(
		(item) => item.name.toLowerCase() === lowerCaseItemName
	);
	return item?.price;
}

function getItemSellPrice(itemName: string): number | undefined {
	return getItemPrice(itemName);
}

// Helper function to retrieve the available items in the shop
function getAvailableItems(): string[] {
	return Object.keys(itemSellPrices);
}

export default shop;