import { IBankAccount } from '../database/models/bankAccount';
import BankAccount from '../database/models/bankAccount';
import { UserModel } from '../database/models/userModel';
import * as economyService from './economyService';

/**
 * Adapter between legacy UserModel balance fields and the new economyService/BankAccount.
 * By default this writes-through to the new BankAccount store. Optionally it can mirror
 * changes back to the UserModel for backwards compatibility during migration.
 */
const MIRROR_TO_USERMODEL = true;

export async function getOrCreate(userId: string): Promise<IBankAccount> {
	return economyService.getOrCreateAccount(userId);
}

export async function deposit(userId: string, amount: number) {
	const acct = await economyService.deposit(userId, amount);
	if (MIRROR_TO_USERMODEL) {
		try {
			// If userId looks like a numeric Twitch id, prefer storing/updating by `id` field.
			const isNumericId = /^\d+$/.test(userId);
			if (isNumericId) {
				await UserModel.updateOne({ id: userId }, { $inc: { balance: amount }, $setOnInsert: { id: userId } }, { upsert: true });
			} else {
				// Otherwise upsert by username
				await UserModel.updateOne({ username: userId }, { $setOnInsert: { username: userId }, $inc: { balance: amount } }, { upsert: true });
			}
		} catch (err) {
			// Mirroring is best-effort
			console.warn('Failed to mirror deposit to UserModel', err);
		}
	}
	return acct;
}

export async function withdraw(userId: string, amount: number) {
	const acct = await economyService.withdraw(userId, amount);
	if (MIRROR_TO_USERMODEL) {
		try {
			const isNumericId = /^\d+$/.test(userId);
			if (isNumericId) {
				await UserModel.updateOne({ id: userId }, { $inc: { balance: -amount } }, { upsert: true });
			} else {
				await UserModel.updateOne({ username: userId }, { $inc: { balance: -amount } });
			}
		} catch (err) {
			console.warn('Failed to mirror withdraw to UserModel', err);
		}
	}
	return acct;
}

/**
 * Credit the legacy wallet (UserModel.balance) for a user.
 * userKey may be a numeric Twitch id or a username. If a username is provided
 * and channelId is supplied it will use both when upserting.
 */
export async function creditWallet(userKey: string | null | undefined, amount: number, username?: string | null, channelId?: string | null) {
	try {
		const isNumericId = /^\d+$/.test(String(userKey || ''));
		if (isNumericId) {
			await UserModel.updateOne({ id: userKey }, { $inc: { balance: amount }, $setOnInsert: { username: username || userKey } }, { upsert: true });
			return;
		}

		// If a username and channelId are provided, use those to scope the upsert
		if (username && channelId) {
			await UserModel.updateOne({ username, channelId }, { $inc: { balance: amount }, $setOnInsert: { username } }, { upsert: true });
			return;
		}

		// Fallback to upserting by username only
		await UserModel.updateOne({ username: userKey }, { $inc: { balance: amount }, $setOnInsert: { username: userKey } }, { upsert: true });
	} catch (err) {
		console.warn('Failed to credit wallet in UserModel', err);
	}
}

/**
 * Debit (subtract) from the legacy wallet for a user. Returns true if the debit succeeded (sufficient funds), false otherwise.
 */
export async function debitWallet(userKey: string | null | undefined, amount: number, username?: string | null, channelId?: string | null): Promise<boolean> {
	try {
		const isNumericId = /^\d+$/.test(String(userKey || ''));
		if (isNumericId) {
			const updated = await UserModel.findOneAndUpdate({ id: userKey, balance: { $gte: amount } }, { $inc: { balance: -amount } }, { new: true });
			return !!updated;
		}

		if (username && channelId) {
			const updated = await UserModel.findOneAndUpdate({ username, channelId, balance: { $gte: amount } }, { $inc: { balance: -amount } }, { new: true });
			return !!updated;
		}

		const updated = await UserModel.findOneAndUpdate({ username: userKey, balance: { $gte: amount } }, { $inc: { balance: -amount } }, { new: true });
		return !!updated;
	} catch (err) {
		console.warn('Failed to debit wallet in UserModel', err);
		return false;
	}
}

export async function transfer(from: string, to: string, amount: number) {
	const res = await economyService.transfer(from, to, amount);
	if (MIRROR_TO_USERMODEL) {
		try {
			const fromIsNumeric = /^\d+$/.test(from);
			if (fromIsNumeric) await UserModel.updateOne({ id: from }, { $inc: { balance: -amount } }, { upsert: true });
			else await UserModel.updateOne({ username: from }, { $inc: { balance: -amount } });

			const toIsNumeric = /^\d+$/.test(to);
			if (toIsNumeric) await UserModel.updateOne({ id: to }, { $inc: { balance: amount } }, { upsert: true });
			else await UserModel.updateOne({ username: to }, { $setOnInsert: { username: to }, $inc: { balance: amount } }, { upsert: true });
		} catch (err) {
			console.warn('Failed to mirror transfer to UserModel', err);
		}
	}
	return res;
}

export default {
	getOrCreate,
	deposit,
	withdraw,
	creditWallet,
	debitWallet,
	transfer,
};
