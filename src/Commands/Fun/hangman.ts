import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import logger from '../../util/logger';

type HangmanState = {
	answer: string;
	revealed: string[]; // array of characters or '_' for hidden
	wrong: Set<string>;
	attemptsLeft: number;
	startedBy: string;
	timeoutId?: ReturnType<typeof setTimeout>;
	startedAt: number;
};

const activeGames = new Map<string, HangmanState>();

const WORDS = [
	'javascript', 'typescript', 'nodejs', 'twitch', 'developer', 'openai', 'discord', 'webhook', 'integration', 'repository',
	'database', 'mongodb', 'asynchronous', 'promise', 'function', 'variable', 'closure', 'module', 'package', 'command'
];

function makeRevealed(answer: string): string[] {
	return Array.from(answer).map(ch => (ch === ' ' ? ' ' : '_'));
}

function revealedToString(arr: string[]): string {
	return arr.join(' ');
}

const hangman: Command = {
	name: 'hangman',
	aliases: ['hangman', 'hm'],
	cooldown: 2,
	usage: '!hangman [start|status|end|<letter|word>] ',
	description: 'Start a Hangman game: `!hangman` or `!hangman start`. Guess letters with `!hangman <letter>` or guess the whole word. Mods can `!hangman end`.',
	async execute(channel: string, user: string, args: string[], _text: string, _msg: ChatMessage) {
		const chatClient = await getChatClient();
		try {
			const normalizedChannel = channel.startsWith('#') ? channel.slice(1) : channel;

			const cmd = args && args.length > 0 ? args[0].toLowerCase() : 'start';

			// Moderator-only cancel
			if (cmd === 'end' || cmd === 'stop' || cmd === 'cancel') {
				const state = activeGames.get(normalizedChannel);
				if (!state) return chatClient.say(channel, 'No active hangman game to end.');
				if ((_msg.userInfo?.isMod) || (_msg.userInfo?.isBroadcaster)) {
					if (state.timeoutId) clearTimeout(state.timeoutId);
					activeGames.delete(normalizedChannel);
					return chatClient.say(channel, `Hangman cancelled by ${user}. The word was: ${state.answer}`);
				}
				return chatClient.say(channel, 'Only moderators may cancel an active hangman game.');
			}

			// status
			if (cmd === 'status') {
				const state = activeGames.get(normalizedChannel);
				if (!state) return chatClient.say(channel, 'No active hangman game. Start one with `!hangman`');
				const wrongArr = Array.from(state.wrong).join(', ') || 'none';
				return chatClient.say(channel, `Hangman: ${revealedToString(state.revealed)} | Wrong: ${wrongArr} | Attempts left: ${state.attemptsLeft}`);
			}

			// start
			if (cmd === 'start' || args.length === 0) {
				if (activeGames.has(normalizedChannel)) return chatClient.say(channel, 'A hangman game is already active — guess with `!hangman <letter>` or `!hangman <word>`');
				const word = WORDS[Math.floor(Math.random() * WORDS.length)];
				const revealed = makeRevealed(word);
				const state: HangmanState = {
					answer: word,
					revealed,
					wrong: new Set<string>(),
					attemptsLeft: 7,
					startedBy: user,
					startedAt: Date.now()
				};

				// Auto-expire game after 5 minutes
				const timeout = setTimeout(() => {
					const s = activeGames.get(normalizedChannel);
					if (s) {
						void chatClient.say(channel, `Time's up! The Hangman word was: ${s.answer}`);
						activeGames.delete(normalizedChannel);
					}
				}, 300_000);
				const maybeUnref = timeout as unknown as { unref?: () => void };
				if (typeof maybeUnref.unref === 'function') maybeUnref.unref();
				state.timeoutId = timeout;
				activeGames.set(normalizedChannel, state);
				await chatClient.say(channel, `Hangman started! ${revealedToString(revealed)} — guess a letter with !hangman <letter> or guess the whole word.`);
				logger.info('Hangman started', { channel: normalizedChannel, startedBy: user, answerLen: word.length });
				return;
			}

			// treat as guess
			const guessRaw = args.join(' ').trim();
			if (!guessRaw) return chatClient.say(channel, 'Please supply a letter or word to guess.');
			const state = activeGames.get(normalizedChannel);
			if (!state) return chatClient.say(channel, 'No active hangman game. Start one with `!hangman`');

			// Full word guess
			if (guessRaw.length > 1) {
				if (guessRaw.localeCompare(state.answer, undefined, { sensitivity: 'accent' }) === 0 || guessRaw.toLowerCase() === state.answer.toLowerCase()) {
					if (state.timeoutId) clearTimeout(state.timeoutId);
					activeGames.delete(normalizedChannel);
					return chatClient.say(channel, `🎉 ${user} guessed the word! It was: ${state.answer}`);
				}
				state.attemptsLeft -= 1;
				if (state.attemptsLeft <= 0) {
					const answer = state.answer;
					if (state.timeoutId) clearTimeout(state.timeoutId);
					activeGames.delete(normalizedChannel);
					return chatClient.say(channel, `No attempts left — game over. The word was: ${answer}`);
				}
				return chatClient.say(channel, `${user}, nope — wrong word. Attempts left: ${state.attemptsLeft}`);
			}

			// Single letter guess
			const letter = guessRaw[0].toLowerCase();
			if (!/^[a-z]$/.test(letter)) return chatClient.say(channel, 'Please guess a single letter a-z.');
			if (state.revealed.includes(letter) || state.wrong.has(letter)) return chatClient.say(channel, `${user}, that letter has already been guessed.`);

			let matched = false;
			for (let i = 0; i < state.answer.length; i++) {
				if (state.answer[i].toLowerCase() === letter) {
					state.revealed[i] = state.answer[i];
					matched = true;
				}
			}

			if (matched) {
				// Check win
				if (!state.revealed.includes('_')) {
					if (state.timeoutId) clearTimeout(state.timeoutId);
					activeGames.delete(normalizedChannel);
					return chatClient.say(channel, `🎉 ${user} completed the word! It was: ${state.answer}`);
				}
				return chatClient.say(channel, `Good guess! ${revealedToString(state.revealed)} | Wrong: ${Array.from(state.wrong).join(', ') || 'none'} | Attempts left: ${state.attemptsLeft}`);
			}

			// wrong letter
			state.wrong.add(letter);
			state.attemptsLeft -= 1;
			if (state.attemptsLeft <= 0) {
				const answer = state.answer;
				if (state.timeoutId) clearTimeout(state.timeoutId);
				activeGames.delete(normalizedChannel);
				return chatClient.say(channel, `No attempts left — game over. The word was: ${answer}`);
			}
			return chatClient.say(channel, `Wrong letter! ${revealedToString(state.revealed)} | Wrong: ${Array.from(state.wrong).join(', ')} | Attempts left: ${state.attemptsLeft}`);
		} catch (err: unknown) {
			logger.error('hangman command failed', err as Error);
			const message = err instanceof Error ? err.message : String(err);
			await chatClient.say(channel, `An error occurred while running hangman: ${message}`);
		}
	}
};

export default hangman;
