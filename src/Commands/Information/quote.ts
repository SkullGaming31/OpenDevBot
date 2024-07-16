import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import QuoteModel, { IQuote } from '../../database/models/Quote';
import { Command } from '../../interfaces/Command';

const quoteCommand: Command = {
	name: 'quote',
	description: 'Add Delete or list quotes',
	usage: '!quote [add|remove|list] [quote]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		try {
			if (channel !== '#canadiendragon') return;
			switch (args[0]) {
				case 'add':
					if (!args[1]) return chatClient.say(channel, '!quote add [quote]');
					const content = args.slice(1).join(' '); // extract the quote content from the arguments
					const quote = new QuoteModel({ content }); // create a new Quote document with the content
					try {
						const savedQuote = await quote.save();
						console.log(`Quote added: "${savedQuote.content}"`);
						await chatClient.say(channel, 'Quote Added to database');
						// handle success
					} catch (error) {
						console.error(error);
						// handle error
					}
	
					break;
				case 'remove':
					const quoteId = args[1]; // extract the quote ID from the arguments
					QuoteModel.findByIdAndDelete(quoteId, async (err: any, removedQuote: IQuote | null) => {
						if (err) {
							console.error(err);
							await chatClient.say(channel, 'An Error has Occured');
							// handle error
						} else if (!removedQuote) {
							console.log(`Quote with ID ${quoteId} not found`);
							await chatClient.say(channel, `Quote with ID ${quoteId} not found`);
							// handle not found
						} else {
							console.log(`Quote removed: "${removedQuote.content}"`);
							await chatClient.say(channel, 'Quote Removed to database');
							// handle success
						}
					});
					break;
				case 'list':
					if (args[1]) {
						// list specific quote by ID
						const quoteId = args[1];
						QuoteModel.findById(quoteId, (err: any, quote: IQuote | null) => {
							if (err) {
								console.error(err);
								// handle error
							} else if (!quote) {
								chatClient.say(channel, `Quote with ID ${quoteId} not found`);
								// handle not found
							} else {
								chatClient.say(channel, `#${quote._id}: "${quote.content}"`);
								// handle success
							}
						});
					} else {
						// list a random quote
						QuoteModel.countDocuments().exec().then((count: number) => {
							const randomIndex = Math.floor(Math.random() * count);
	
							QuoteModel.findOne().skip(randomIndex).exec().then(async (quote: IQuote | null) => {
								if (!quote) {
									await chatClient.say(channel, 'No quotes found');
									// handle no quotes
								} else {
									await chatClient.say(channel, `QuoteID:${quote._id}: "${quote.content}"`);
									// handle success
								}
							}).catch((err) => { console.error(err); });
						}); // <-- Add a closing parenthesis here
					}
					break;
				default:
					await chatClient.say(channel, `Usage: ${quoteCommand.usage}`);
					break;
			}	
		} catch (error) {
			console.error('Error with Quotes', error);
		}
	}
};
export default quoteCommand;