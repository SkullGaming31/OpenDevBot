import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import QuoteModel from '../../database/models/Quote';
import { Command } from '../../interfaces/Command';

import logger from '../../util/logger';

const quoteCommand: Command = {
	name: 'quote',
	description: 'Add Delete or list quotes',
	usage: '!quote [add|remove|list] [quote]',
	/**
	 * Executes the quote command based on the specified action.
	 * 
	 * @param channel The channel where the command was invoked.
	 * @param user The user who invoked the command.
	 * @param args The arguments passed to the command.
	 * @param text The full text of the message.
	 * @param msg The chat message object containing metadata and user information.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		void user; void text; void msg;
		const chatClient = await getChatClient();
		try {
			if (channel !== '#skullgaminghq') return;
			switch (args[0]) {
				case 'add':
					if (!args[1]) return chatClient.say(channel, '!quote add [quote]');
					const content = args.slice(1).join(' '); // extract the quote content from the arguments
					const quote = new QuoteModel({ content }); // create a new Quote document with the content
					try {
						const savedQuote = await quote.save();
						logger.info(`Quote added: "${savedQuote.content}"`);
						await chatClient.say(channel, 'Quote Added to database');
					} catch (error) {
						logger.error(error);
						// handle error
					}

					break;
				case 'remove':
					const quoteId = args[1]; // extract the quote ID from the arguments
					try {
						const removedQuote = await QuoteModel.findByIdAndDelete(quoteId).exec();
						if (!removedQuote) {
							await chatClient.say(channel, `Quote with ID ${quoteId} not found`);
						} else {
							await chatClient.say(channel, 'Quote Removed from database');
						}
					} catch (err) {
						logger.error(err);
						await chatClient.say(channel, 'An Error has Occured');
					}
					break;
				case 'list':
					if (args[1]) {
						// list specific quote by ID
						const quoteId = args[1];
						try {
							const quote = await QuoteModel.findById(quoteId).exec();
							if (!quote) {
								chatClient.say(channel, `Quote with ID ${quoteId} not found`);
							} else {
								chatClient.say(channel, `#${quote._id}: "${quote.content}"`);
							}
						} catch (err) {
							logger.error(err);
						}
					} else {
						// list a random quote
						try {
							const count = await QuoteModel.countDocuments().exec();
							if (count === 0) {
								await chatClient.say(channel, 'No quotes found');
							} else {
								const randomIndex = Math.floor(Math.random() * count);
								const quote = await QuoteModel.findOne().skip(randomIndex).exec();
								if (!quote) {
									await chatClient.say(channel, 'No quotes found');
								} else {
									await chatClient.say(channel, `QuoteID:${quote._id}: "${quote.content}"`);
								}
							}
						} catch (err) {
							logger.error(err);
						}
					}
					break;
				default:
					await chatClient.say(channel, `Usage: ${quoteCommand.usage}`);
					break;
			}
		} catch (error) {
			logger.error('Error with Quotes', error);
		}
	}
};
export default quoteCommand;