import { Command } from '../../interfaces/Command';
import { getChatClient } from '../../chat';
import { ChatClient, ChatMessage } from '@twurple/chat/lib';
import fs from 'fs';
import path from 'path';
import { randomInt } from 'crypto';
import { sleep } from '../../util/util';
import balanceAdapter from '../../services/balanceAdapter';
type PlayerState = { health: number; name: string; xp: number; level: number; roundsSurvived: number };

type BRRandomEvent = { type: 'damage' | 'heal' | 'xp'; amount: number; description: string; sweep?: boolean };

const EVENT_TEMPLATES: Array<{ type: BRRandomEvent['type']; description: string[] }> = [
	{
		type: 'damage', description: [
			'was hit by a stray arrow',
			'triggered a hidden trap',
			'took a glancing blow from debris',
			'slipped on wet ground and got injured'
		]
	},
	{
		type: 'heal', description: [
			'found a medkit',
			'used a stim-shot and recovered',
			'patched up a wound with a bandage',
			'found some energy rations and regained strength'
		]
	},
	{
		type: 'xp', description: [
			'performed a crafty maneuver and gained combat insight',
			'learned from a close call and gained experience',
			'completed a risky move and leveled up mentally'
		]
	}
];

// Load test bot names from data/botNames.txt (one name per line) if present,
// otherwise use a built-in fallback list.
function loadTestBotNames(): string[] {
	try {
		const filePath = path.join(process.cwd(), 'data', 'botNames.txt');
		if (fs.existsSync(filePath)) {
			const raw = fs.readFileSync(filePath, 'utf8');
			const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
			if (lines.length) return lines;
		}
	} catch {
		// ignore read errors and fall back
	}
	return ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet'];
}

const TEST_BOT_NAMES = loadTestBotNames();

// Level thresholds (xp required for level n)
// Generate thresholds so each level becomes progressively harder to reach.
// Uses a growth multiplier to increase the XP gap between successive levels.
const MAX_LEVEL = 30;
const LEVEL_THRESHOLDS: number[] = (() => {
	const thresholds: number[] = [0];
	const base = 100; // XP for first level
	const growth = 1.6; // multiplier per level (adjust to taste)
	for (let i = 1; i <= MAX_LEVEL; i++) {
		const gap = Math.floor(base * Math.pow(growth, i - 1));
		thresholds.push(thresholds[i - 1] + gap);
	}
	return thresholds;
})();

function getLevelFromXp(xp: number): number {
	for (let lvl = LEVEL_THRESHOLDS.length - 1; lvl >= 0; lvl--) {
		if (xp >= LEVEL_THRESHOLDS[lvl]) return lvl;
	}
	return 0;
}

function getRandomEvent(): BRRandomEvent {
	// Weighted event type selection: make XP rare
	const r = randomInt(0, 100);
	let chosenType: BRRandomEvent['type'];
	if (r < 8) chosenType = 'xp';        // ~8% chance
	else if (r < 40) chosenType = 'heal'; // ~32% chance
	else chosenType = 'damage';          // ~60% chance

	const candidates = EVENT_TEMPLATES.filter(e => e.type === chosenType);
	const tpl = candidates[randomInt(0, candidates.length)];

	// increased damage range and reduced heal range
	let amount: number;
	if (chosenType === 'damage') amount = randomInt(10, 41); // 10..40
	else if (chosenType === 'heal') amount = randomInt(5, 16); // 5..15
	else amount = randomInt(5, 31); // xp

	const descs = tpl.description;
	const description = `${descs[randomInt(0, descs.length)]} (+${amount})`;

	// small chance for a sweeping multi-target damage event
	const sweep = chosenType === 'damage' && randomInt(0, 100) < 15; // ~15%

	return { type: chosenType, amount, description, sweep };
}

function chooseRandomElements<T>(arr: T[], n: number): T[] {
	const copy = arr.slice();
	const res: T[] = [];
	while (res.length < n && copy.length) {
		const idx = randomInt(0, copy.length);
		res.push(copy.splice(idx, 1)[0]);
	}
	return res;
}

function shuffle<T>(arr: T[]): T[] {
	const a = arr.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = randomInt(0, i + 1);
		const tmp = a[i];
		a[i] = a[j];
		a[j] = tmp;
	}
	return a;
}

let brInProgress = false;

const battleroyale: Command = {
	name: 'battleroyale',
	aliases: ['br'],
	description: 'Start a Battle Royale event for chat viewers',
	usage: '!battleroyale',
	moderator: false,
	devOnly: false,
	cooldown: 60, // 600 seconds = 10 minutes. Ignore this, this is a note for myself
	execute: async (channel: string, user: string, args: string[], _text: string, _msg: ChatMessage) => {
		const chat = await getChatClient();
		if (brInProgress) return chat.say(channel, 'A Battle Royale is already in progress.');

		brInProgress = true;
		const joinPeriodMs = process.env.ENVIRONMENT === 'dev' ? 8000 : 60000;
		const participants: Record<string, PlayerState> = {};

		// Initiator automatically joins
		participants[user] = { name: user, health: 100, xp: 0, level: 0, roundsSurvived: 0 };

		await chat.say(channel, `Battle Royale started by ${user}! Type !brjoin to join. You have ${Math.round(joinPeriodMs / 1000)} seconds to join.`);

		// Testing helper: allow adding simulated participants via first arg when in dev
		const requestedBots = args && args.length > 0 ? parseInt(args[0], 10) : 0;
		const maxBots = 20;
		const simulatedBotSet = new Set<string>();
		function display(n: string) { return simulatedBotSet.has(n) ? `${n} [bot]` : n; }
		if (process.env.ENVIRONMENT === 'dev' && requestedBots > 0) {
			const addCount = Math.min(maxBots, requestedBots);
			let idx = 1;
			const added: string[] = [];
			while (Object.keys(participants).length < addCount + 1) {
				// pick from predefined names and avoid collisions
				const candidate = TEST_BOT_NAMES[(idx - 1) % TEST_BOT_NAMES.length];
				let botName = candidate;
				let suffix = 1;
				while (participants[botName]) {
					botName = `${candidate}${suffix}`;
					suffix++;
				}
				participants[botName] = { name: botName, health: 100, xp: 0, level: 0, roundsSurvived: 0 };
				added.push(botName);
				idx++;
				if (idx > maxBots) break;
			}
			if (added.length) {
				// send a single message listing added bots to avoid spamming
				const displayNames = added.map(n => `${n}[bot]`);
				for (const n of added) simulatedBotSet.add(n);
				await chat.say(channel, `${displayNames.join(', ')} (simulated) joined the Battle Royale for testing.`, {}, { limitReachedBehavior: 'enqueue' });
			}
		} else if (process.env.ENVIRONMENT === 'dev' && requestedBots === 0) {
			// Convenience: if running locally and user didn't request a specific number,
			// add a small set of simulated bots so testing is possible with one person.
			const defaultAdd = 4;
			let idx = 1;
			const addedDefault: string[] = [];
			while (Object.keys(participants).length < defaultAdd + 1) {
				const candidate = TEST_BOT_NAMES[(idx - 1) % TEST_BOT_NAMES.length];
				let botName = candidate;
				let suffix = 1;
				while (participants[botName]) {
					botName = `${candidate}${suffix}`;
					suffix++;
				}
				participants[botName] = { name: botName, health: 100, xp: 0, level: 0, roundsSurvived: 0 };
				addedDefault.push(botName);
				idx++;
				if (idx > maxBots) break;
			}
			if (addedDefault.length) {
				const displayNames = addedDefault.map(n => `${n} [bot]`);
				for (const n of addedDefault) simulatedBotSet.add(n);
				await chat.say(channel, `${displayNames.join(', ')} (simulated) joined the Battle Royale for testing.`, {}, { limitReachedBehavior: 'enqueue' });
			}
		}

		// Temporary join listener — register a guarded wrapper so we can stop handling after the join window.
		const chatClient: ChatClient = await getChatClient();
		let acceptJoins = true;
		const onMessageWrapper = async (ch: string, who: string, message: string, msg: ChatMessage) => {
			void msg;
			if (!acceptJoins) return;
			if (ch !== channel) return;
			const cmd = message.trim().toLowerCase();
			if (cmd === '!brjoin' && !participants[who]) {
				participants[who] = { name: who, health: 100, xp: 0, level: 0, roundsSurvived: 0 };
				await chatClient.say(channel, `${who} joined the Battle Royale!`);
			}
		};
		chatClient.onMessage(onMessageWrapper);

		// Wait join period
		await new Promise((res) => setTimeout(res, joinPeriodMs));

		// Stop accepting joins: first flip the guard, then attempt to unregister the listener if API supports it.
		acceptJoins = false;
		try {
			// Common variants: offMessage, removeListener(event, handler), removeHandler
			const maybe = chatClient as unknown as {
				offMessage?: (fn: (channel: string, user: string, text: string, msg: ChatMessage) => void) => void;
				removeListener?: (event: string, fn: (channel: string, user: string, text: string, msg: ChatMessage) => void) => void;
				removeHandler?: (event: string, fn: (channel: string, user: string, text: string, msg: ChatMessage) => void) => void;
				handlers?: Record<string, ((...args: unknown[]) => void)[]>;
			};
			if (typeof maybe.offMessage === 'function') {
				maybe.offMessage(onMessageWrapper);
			} else if (typeof maybe.removeListener === 'function') {
				maybe.removeListener('message', onMessageWrapper);
			} else if (typeof maybe.removeHandler === 'function') {
				maybe.removeHandler('message', onMessageWrapper);
			} else if (maybe.handlers && maybe.handlers.message) {
				// Jest mock exposes handlers; remove our wrapper reference if present.
				maybe.handlers.message = maybe.handlers.message.filter((h) => h !== onMessageWrapper);
			}
		} catch (err) {
			// Best-effort; if removal fails, the guard prevents further joins.
			// Log to aid debugging if ChatClient API changes or removal fails.
			// eslint-disable-next-line no-console
			console.error('[BattleRoyale] Failed to remove onMessage listener during cleanup:', err);
		}

		const playerNames = Object.keys(participants);
		const minParticipants = process.env.ENVIRONMENT === 'dev' ? 1 : 2;
		if (playerNames.length < minParticipants) {
			brInProgress = false;
			return chat.say(channel, `The Battle Royale requires at least ${minParticipants} players to start. Battle Royale cancelled.`);
		}

		await chat.say(channel, `Battle Royale beginning with ${playerNames.length} players! Good luck.`);

		// Run rounds until one left or max rounds
		const maxRounds = 20;
		let round = 0;
		while (Object.keys(participants).length > 1 && round < maxRounds) {
			round++;
			const events: string[] = [];
			// iterate a shuffled snapshot of participants to avoid insertion-order bias
			const roundPlayers = shuffle(Object.keys(participants));
			for (const p of roundPlayers) {
				// participant may have been eliminated earlier this round
				if (!participants[p]) continue;
				const ev = getRandomEvent();
				if (ev.type === 'damage') {
					// critical hit check (10% chance)
					let dmg = ev.amount;
					const isCrit = randomInt(0, 100) < 10;
					if (isCrit) dmg *= 2;
					participants[p].health -= dmg;
					events.push(`${display(p)} ${ev.description}${isCrit ? ' (CRITICAL)' : ''} (-${dmg} HP) (hp=${Math.max(0, participants[p].health)})`);

					// sweeping multi-target damage — origin randomized to avoid loop bias
					if (ev.sweep) {
						const allPlayers = Object.keys(participants);
						if (allPlayers.length > 1) {
							const source = chooseRandomElements(allPlayers, 1)[0];
							const others = Object.keys(participants).filter(x => x !== source);
							if (others.length > 0) {
								const maxTargets = Math.min(3, others.length);
								const targetCount = randomInt(1, maxTargets + 1);
								const targets = chooseRandomElements(others, targetCount);
								for (const t of targets) {
									participants[t].health -= dmg;
									events.push(`${display(t)} hit by sweep from ${display(source)} (-${dmg} HP) (hp=${Math.max(0, participants[t].health)})`);
								}
							}
						}
					}
				} else if (ev.type === 'heal') {
					participants[p].health = Math.min(100, participants[p].health + ev.amount);
					events.push(`${display(p)} ${ev.description} (+${ev.amount} HP) (hp=${participants[p].health})`);
				} else if (ev.type === 'xp') {
					// Apply XP event immediately in-memory and check for level up
					const prevLevel = participants[p].level;
					participants[p].xp += ev.amount;
					// compute level after gaining xp
					const newLevel = getLevelFromXp(participants[p].xp);
					participants[p].level = newLevel;
					if (newLevel > prevLevel) events.push(`${display(p)} ${ev.description} and leveled up to ${newLevel}!`);
					else events.push(`${display(p)} ${ev.description} (+${ev.amount} XP)`);
				}
			}

			// Ensure health stays within 0-100 for all participants
			for (const name of Object.keys(participants)) {
				participants[name].health = Math.max(0, Math.min(100, participants[name].health));
			}

			// Remove eliminated
			const eliminated: string[] = [];
			for (const [name, state] of Object.entries(participants)) {
				if (state.health <= 0) eliminated.push(name);
			}
			// Apply XP penalty to eliminated players (random 0-20) before removal
			const eliminatedAnnouncements: string[] = [];
			for (const name of eliminated) {
				const xpLoss = randomInt(0, 21); // 0..20
				const prevXp = participants[name].xp || 0;
				const newXp = Math.max(0, prevXp - xpLoss);
				participants[name].xp = newXp;
				eliminatedAnnouncements.push(`${display(name)} was eliminated and lost ${xpLoss} XP (now ${newXp} XP)`);
			}
			if (eliminatedAnnouncements.length) {
				await chat.say(channel, eliminatedAnnouncements.join(' | '), {}, { limitReachedBehavior: 'enqueue' });
			}
			for (const e of eliminated) delete participants[e];

			// Increment rounds survived for remaining players (they survived this round)
			for (const pname of Object.keys(participants)) {
				participants[pname].roundsSurvived = (participants[pname].roundsSurvived || 0) + 1;
			}

			await chat.say(channel, `Round ${round} results: ${events.join(' | ')}${eliminated.length > 0 ? ' | Eliminated: ' + eliminated.join(', ') : ''}`);
			await sleep(2000);
		}

		const survivors = Object.keys(participants);
		if (survivors.length === 0) {
			await chat.say(channel, 'No one survived the Battle Royale.');
			brInProgress = false;
			return;
		}

		// Award coins to survivors (one-time at end) — best-effort
		// Award XP and coins proportional to rounds survived (only to final survivors)
		const survivorAnnouncements: string[] = [];
		for (const s of survivors) {
			const rounds = participants[s].roundsSurvived || 0;
			const coins = 10 * rounds; // 10 coins per round survived
			const xpGain = 20 * rounds; // 20 XP per round survived
			const prevXp = participants[s].xp || 0;
			const prevLevel = participants[s].level || 0;
			participants[s].xp = Math.max(0, prevXp + xpGain);
			participants[s].level = getLevelFromXp(participants[s].xp);
			// award coins (best-effort)
			try {
				await balanceAdapter.creditWallet(s, coins, s, channel);
			} catch (err) {
				// Log failures to credit wallet so failures are visible in logs
				// eslint-disable-next-line no-console
				console.error('Failed to credit wallet for Battle Royale survivor', {
					user: s,
					coins,
					channel,
					error: err instanceof Error ? err.message : err,
				});
			}
			if (participants[s].level > prevLevel) {
				survivorAnnouncements.push(`${s} survived and earned ${coins} coins and ${xpGain} XP and leveled up to ${participants[s].level}!`);
			} else {
				survivorAnnouncements.push(`${s} survived and earned ${coins} coins and ${xpGain} XP (now ${participants[s].xp} XP).`);
			}
		}
		if (survivorAnnouncements.length) {
			await chat.say(channel, survivorAnnouncements.join(' | '), {}, { limitReachedBehavior: 'enqueue' });
		}
		const displaySurvivors = survivors.map(s => display(s));
		await chat.say(channel, `Battle Royale finished! Survivors: ${displaySurvivors.join(', ')}.`, {}, { limitReachedBehavior: 'enqueue' });
		brInProgress = false;
		return;
	}
};

export default battleroyale;