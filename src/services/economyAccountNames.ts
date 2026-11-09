import { getUserApi } from '../api/userApiClient';
import type { IBankAccount } from '../database/models/bankAccount';
import { UserModel } from '../database/models/userModel';
import logger from '../util/logger';

const CACHE_DURATION_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 1000;
const TWITCH_BATCH_SIZE = 100;

export function createEconomyAccountNameResolver() {
	const cache = new Map<string, { name: string; expiresAt: number }>();

	return async (accounts: IBankAccount[]) => {
		const names = new Map<string, string>();
		const missing = new Set<string>();

		for (const account of accounts) {
			const id = account.userId;
			const username = typeof account.username === 'string' ? account.username.trim() : '';
			if (username && username !== id) {
				names.set(id, username);
			}
			if (typeof id === 'string' && /^\d+$/.test(id)) {
				missing.add(id);
			}
		}

		if (missing.size) {
			const users = await UserModel.find({ id: { $in: [...missing] } }).lean();
			for (const user of users) {
				const name = typeof user.username === 'string' ? user.username.trim() : '';
				if (missing.has(user.id) && name && name !== user.id) {
					names.set(user.id, name);
				}
			}
		}

		for (const id of missing) {
			const entry = cache.get(id);
			if (entry) {
				names.set(id, entry.name);
				if (entry.expiresAt > Date.now()) missing.delete(id);
			}
		}

		if (missing.size) {
			try {
				const api = await getUserApi();
				const ids = [...missing];
				for (let i = 0; i < ids.length; i += TWITCH_BATCH_SIZE) {
					const users = await api.users.getUsersByIds(ids.slice(i, i + TWITCH_BATCH_SIZE));
					for (const user of users) {
						if (!missing.has(user.id) || !user.displayName) continue;
						names.set(user.id, user.displayName);
						cache.delete(user.id);
						if (cache.size >= MAX_CACHE_ENTRIES) {
							const oldest = cache.keys().next().value;
							if (oldest !== undefined) cache.delete(oldest);
						}
						cache.set(user.id, { name: user.displayName, expiresAt: Date.now() + CACHE_DURATION_MS });
					}
				}
			} catch (error) {
				logger.warn('Failed to resolve economy account names from Twitch; using available saved names or IDs', error);
			}
		}

		return accounts.map(account => ({
			...account,
			displayName: names.get(account.userId) || account.userId || account.username || 'Unknown user',
		}));
	};
}
