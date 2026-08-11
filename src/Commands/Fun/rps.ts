import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import logger from '../../util/logger';

const CHOICES = ['rock', 'paper', 'scissors'];

const rockPaperScissors: Command = {
	name: 'rps',
	description: 'Play Rock, Paper, Scissors with the bot.',
	usage: '!rps <rock|paper|scissors> <bet>',
	devOnly: false,
	cooldown: 5000, // milliseconds

	async execute(channelName: string, userName: string, args: string[], messageText: string, message: ChatMessage): Promise<void> {
		void messageText; void message;
		try {
			const chatClient = await getChatClient();

			if (args.length < 2) {
				await chatClient.say(channelName, `${rockPaperScissors.usage} ${userName}, please provide a choice and a bet.`);
				return;
			}

			const userChoice = args[0].toLowerCase();
			if (!CHOICES.includes(userChoice)) {
				await chatClient.say(channelName, `${rockPaperScissors.usage} ${userName}, please choose rock, paper, or scissors.`);
				return;
			}

			const betAmount = parseInt(args[1]);
			if (isNaN(betAmount) || betAmount <= 0) {
				await chatClient.say(channelName, `${rockPaperScissors.usage} ${userName}, please provide a valid bet.`);
				return;
			}

			const userKey = message.userInfo?.userId ?? userName;
			// Attempt to debit the bet from the user's wallet first
			const debited = await (await import('../../services/balanceAdapter')).debitWallet(userKey, betAmount, userName, undefined);
			if (!debited) {
				await chatClient.say(channelName, `${userName}, you don't have enough balance to place this bet.`);
				return;
			}

			// FIXED: duplicate balance check removed above; ensure single validation is correct

			const botChoice = CHOICES[Math.floor(Math.random() * CHOICES.length)];
			const result = determineWinner(userChoice, botChoice);

			if (result.startsWith('You win')) {
				const winnings = Math.floor(betAmount * 1.5);
				await (await import('../../services/balanceAdapter')).creditWallet(userKey, winnings, userName, undefined);
				await chatClient.say(channelName, `${userName}, you chose ${userChoice}, I chose ${botChoice}. ${result} You won ${winnings} coins.`);
			} else if (result.startsWith('You lose')) {
				// bet was already debited
				await chatClient.say(channelName, `${userName}, you chose ${userChoice}, I chose ${botChoice}. ${result} You lost ${betAmount} coins.`);
			} else {
				// tie — refund the bet
				await (await import('../../services/balanceAdapter')).creditWallet(userKey, betAmount, userName, undefined);
				await chatClient.say(channelName, `${userName}, you chose ${userChoice}, I chose ${botChoice}. ${result} Your bet has been refunded.`);
			}
		} catch (error) {
			logger.error(error);
		}
	},
};

function determineWinner(userChoice: string, botChoice: string): string {
	if (userChoice === botChoice) {
		return 'It\'s a tie!';
	} else if (
		(userChoice === 'rock' && botChoice === 'scissors') ||
		(userChoice === 'paper' && botChoice === 'rock') ||
		(userChoice === 'scissors' && botChoice === 'paper')
	) {
		return 'You win! You will receive 1.5x your bet.';
	} else {
		return 'You lose! You will lose your bet.';
	}
}

export default rockPaperScissors;