import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import logger from '../../util/logger';

type ScrambleState = {
	answer: string;
	scrambled: string;
	startedBy: string;
	timeoutId?: ReturnType<typeof setTimeout>;
	startedAt: number;
};

// In-memory per-channel scramble state. Single-instance only (sufficient for current bot setup).
const activeGames = new Map<string, ScrambleState>();

// Small dictionary — keep it modest to avoid huge bundle size. You can replace with a larger list if desired.
const WORDS = [
	'astronaut', 'galaxy', 'nebula', 'quantum', 'orbit', 'comet', 'meteor', 'planet', 'asteroid', 'cosmos',
	'luminous', 'stellar', 'horizon', 'eclipse', 'gravity', 'telescope', 'satellite', 'singularity', 'capsule', 'voyager'
];

function shuffleWord(word: string): string {
	const arr = Array.from(word);
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const tmp = arr[i];
		arr[i] = arr[j];
		arr[j] = tmp;
	}
	return arr.join('');
}

function makeScramble(word: string): string {
	// Attempt to produce a scramble different from original; try a few times.
	let scrambled = shuffleWord(word);
	let attempts = 0;
	while (scrambled.toLowerCase() === word.toLowerCase() && attempts < 8) {
		scrambled = shuffleWord(word);
		attempts += 1;
	}
	// If still same (e.g., repeated letters), insert a small rotation
	if (scrambled.toLowerCase() === word.toLowerCase()) {
		const rotated = word.slice(1) + word[0];
		return rotated;
	}
	return scrambled;
}

const wordScramble: Command = {
	name: 'wordscramble',
	aliases: ['scramble', 'wordscramble', 'ws'],
	cooldown: 5,
	usage: '!scramble to start a game, !scramble <guess> to answer, !scramble end to cancel (mod only)',
	description: 'Word Scramble: start a scramble or guess the current scrambled word. Usage: `!scramble` to start, `!scramble <guess>` to answer, moderator can `!scramble end` to cancel.`',
	async execute(channel: string, user: string, args: string[], _text: string, _msg: ChatMessage) {
		const chatClient = await getChatClient();
		try {
			const normalizedChannel = channel.startsWith('#') ? channel.slice(1) : channel;

			// Admin/mod cancel: '!scramble end'
			if (args[0] && args[0].toLowerCase() === 'end') {
				const state = activeGames.get(normalizedChannel);
				if (!state) return chatClient.say(channel, 'No active word scramble to end.');
				if (_msg.userInfo?.isMod || _msg.userInfo?.isBroadcaster) {
					if (state.timeoutId) clearTimeout(state.timeoutId);
					activeGames.delete(normalizedChannel);
					return chatClient.say(channel, `Scramble cancelled by ${user}. The answer was: ${state.answer}`);
				} else {
					return chatClient.say(channel, 'Only moderators may cancel an active scramble.');
				}
			}

			// If no args => start a new scramble
			if (!args || args.length === 0) {
				if (activeGames.has(normalizedChannel)) return chatClient.say(channel, 'A scramble is already active — try guessing with `!scramble <word>`');

				// pick a random word
				const word = WORDS[Math.floor(Math.random() * WORDS.length)];
				const scrambled = makeScramble(word.replace(/\s+/g, ''));

				const timeout = setTimeout(() => {
					const state = activeGames.get(normalizedChannel);
					if (state) {
						void chatClient.say(channel, `Time's up! The word was: ${state.answer}`);
						activeGames.delete(normalizedChannel);
					}
				}, 60_000); // 60 seconds
				// try to unref to not keep process alive in test envs
				const maybeUnref = timeout as unknown as { unref?: () => void };
				if (typeof maybeUnref.unref === 'function') maybeUnref.unref();

				const state: ScrambleState = {
					answer: word,
					scrambled,
					startedBy: user,
					timeoutId: timeout,
					startedAt: Date.now(),
				};
				activeGames.set(normalizedChannel, state);

				await chatClient.say(channel, `Word Scramble started! Unscramble: ${scrambled} — first correct guess wins! Use !scramble <word> to answer.`);
				// logger.info('Scramble started', { channel: normalizedChannel, startedBy: user, answerLen: word.length });
				return;
			}

			// Treat args as a guess — join all args as a guessed phrase (handles multi-word guesses)
			const guess = args.join(' ').trim();
			const state = activeGames.get(normalizedChannel);
			if (!state) return chatClient.say(channel, 'There is no active scramble right now. Start one with `!scramble`.');

			if (guess.localeCompare(state.answer, undefined, { sensitivity: 'accent' }) === 0 || guess.toLowerCase() === state.answer.toLowerCase()) {
				// winner
				if (state.timeoutId) clearTimeout(state.timeoutId);
				activeGames.delete(normalizedChannel);
				await chatClient.say(channel, `🎉 ${user} guessed it! The word was: ${state.answer}`);
				// logger.info('Scramble won', { channel: normalizedChannel, winner: user, answer: state.answer });
				return;
			}

			// incorrect guess
			return chatClient.say(channel, `${user}, nope — try again!`);
		} catch (err: unknown) {
			logger.error('wordScramble command failed', err as Error);
			const message = err instanceof Error ? err.message : String(err);
			await chatClient.say(channel, `An error occurred while running word scramble: ${message}`);
		}
	}
};

export default wordScramble;
