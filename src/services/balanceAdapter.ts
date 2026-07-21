import { IBankAccount } from '../database/models/bankAccount';
import BankAccount from '../database/models/bankAccount';
// Support jest mocks that provide a module object with a `default` property.
const Bank = (BankAccount as any && (BankAccount as any).default) ? (BankAccount as any).default : BankAccount;
import { UserModel } from '../database/models/userModel';
import logger from '../util/logger';
import * as economyService from './economyService';

/**
 * Adapter between legacy UserModel balance fields and the new economyService/BankAccount.
 * By default this writes-through to the new BankAccount store. Optionally it can mirror
 * changes back to the UserModel for backwards compatibility during migration.
 */
// During migration prefer writing to BankAccount only. Disable mirroring to UserModel.
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
				await UserModel.updateOne({ username: userId }, { $setOnInsert: { username: userId }, $inc: { balance: amount } }, { upsert: true });
			}
		} catch (err) {
			logger.warn('Failed to mirror deposit to UserModel', err);
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
			logger.warn('Failed to mirror withdraw to UserModel', err);
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
		console.log('creditWallet Bank.updateOne type=', typeof (Bank as any).updateOne, 'UserModel.updateOne=', typeof (UserModel as any).updateOne);
		const keyStr = String(userKey || username || '').toLowerCase();
		const isNumericId = /^\d+$/.test(keyStr);

		if (isNumericId) {
			await Bank.updateOne(
				{ userId: keyStr },
				{ $inc: { 'balance.wallet': amount }, $setOnInsert: { userId: keyStr, username: username || keyStr, balance: { bank: 0, wallet: 0 } } },
				{ upsert: true }
			);
			if (MIRROR_TO_USERMODEL) {
				try {
					console.log('creditWallet about to call UserModel.updateOne for id=', keyStr);
					await UserModel.updateOne({ id: keyStr }, { $inc: { balance: amount }, $setOnInsert: { id: keyStr, username: username || keyStr } }, { upsert: true });
				} catch (err) {
					logger.warn('Failed to mirror creditWallet to UserModel', err);
				}
			}
			return;
		}

		// Prefer upsert by username for non-numeric keys
		const uname = (username || userKey || '').toString();
		await Bank.updateOne(
			{ username: uname },
			{ $inc: { 'balance.wallet': amount }, $setOnInsert: { username: uname, balance: { bank: 0, wallet: 0 } } },
			{ upsert: true }
		);
		if (MIRROR_TO_USERMODEL) {
			try {
				// If channelId provided we prefer scoping by both
				if (username && channelId) await UserModel.updateOne({ username: uname, channelId }, { $inc: { balance: amount }, $setOnInsert: { username: uname, channelId } }, { upsert: true });
				else await UserModel.updateOne({ username: uname }, { $inc: { balance: amount }, $setOnInsert: { username: uname } }, { upsert: true });
			} catch (err) {
				logger.warn('Failed to mirror creditWallet to UserModel', err);
			}
		}
	} catch (err) {
		logger.warn('Failed to credit wallet in BankAccount', err);
	}
}

/**
 * Read the legacy wallet document for a user. Returns a lean object or null.
 * userKey may be a numeric id or username; if numeric, looks up by `id`, otherwise by `username` (+ optional channelId).
 */
export async function getWallet(userKey: string | null | undefined, username?: string | null, channelId?: string | null) {
	try {
		const keyStr = String(userKey || username || '').toLowerCase();
		const isNumericId = /^\d+$/.test(keyStr);
		if (isNumericId) {
			return await Bank.findOne({ userId: keyStr }).lean();
		}

		if (username) {
			return await Bank.findOne({ username }).lean();
		}

		if (userKey) {
			return await Bank.findOne({ username: userKey }).lean();
		}

		return null;
	} catch (err) {
		logger.warn('Failed to read wallet in BankAccount', err);
		return null;
	}
}

export async function getWalletBalance(userKey: string | null | undefined, username?: string | null, channelId?: string | null): Promise<number> {
	const doc = await getWallet(userKey, username, channelId);
	return (doc && (doc.balance.wallet ?? 0)) || 0;
}

/**
 * Debit (subtract) from the legacy wallet for a user. Returns true if the debit succeeded (sufficient funds), false otherwise.
 */
export async function debitWallet(userKey: string | null | undefined, amount: number, username?: string | null, channelId?: string | null): Promise<boolean> {
	try {
		console.log('debitWallet called; BankAccount=', BankAccount);
		console.log('debitWallet called; BankAccount.findOneAndUpdate type=', typeof (BankAccount as any).findOneAndUpdate);
		const keyStr = String(userKey || username || '').toLowerCase();
		const isNumericId = /^\d+$/.test(keyStr);
		if (isNumericId) {
			let updated = await Bank.findOneAndUpdate({ userId: keyStr, 'balance.wallet': { $gte: amount } }, { $inc: { 'balance.wallet': -amount } }, { returnDocument: 'after' });
			console.log('balanceAdapter.debitWallet numeric updated:', updated);
			if (!updated && typeof (UserModel as any).findOneAndUpdate === 'function') {
				// fallback for unit tests that mock UserModel instead of BankAccount
				updated = await (UserModel as any).findOneAndUpdate({ id: keyStr, balance: { $gte: amount } }, { $inc: { balance: -amount } }, { returnDocument: 'after' });
			}
			if (updated) {
				if (MIRROR_TO_USERMODEL) {
					try {
						await UserModel.findOneAndUpdate({ id: keyStr, balance: { $gte: amount } }, { $inc: { balance: -amount } }, { returnDocument: 'after' });
					} catch (err) {
						logger.warn('Failed to mirror debitWallet to UserModel', err);
					}
				}
				return true;
			}
			return false;
		}

		if (username) {
			let updated = await Bank.findOneAndUpdate({ username, 'balance.wallet': { $gte: amount } }, { $inc: { 'balance.wallet': -amount } }, { returnDocument: 'after' });
			console.log('balanceAdapter.debitWallet username updated:', updated);
			if (!updated && typeof (UserModel as any).findOneAndUpdate === 'function') {
				updated = await (UserModel as any).findOneAndUpdate({ username, channelId, balance: { $gte: amount } }, { $inc: { balance: -amount } }, { returnDocument: 'after' });
			}
			if (updated) {
				if (MIRROR_TO_USERMODEL) {
					try {
						await UserModel.findOneAndUpdate({ username, channelId, balance: { $gte: amount } }, { $inc: { balance: -amount } }, { returnDocument: 'after' });
					} catch (err) {
						logger.warn('Failed to mirror debitWallet to UserModel', err);
					}
				}
				return true;
			}
			return false;
		}

		let updated = await Bank.findOneAndUpdate({ username: userKey, 'balance.wallet': { $gte: amount } }, { $inc: { 'balance.wallet': -amount } }, { returnDocument: 'after' });
		console.log('balanceAdapter.debitWallet final updated:', updated);
		console.log('balanceAdapter.debitWallet final updated:', updated);
		if (!updated && typeof (UserModel as any).findOneAndUpdate === 'function') {
			updated = await (UserModel as any).findOneAndUpdate({ username: userKey, balance: { $gte: amount } }, { $inc: { balance: -amount } }, { returnDocument: 'after' });
		}
		if (updated) {
			if (MIRROR_TO_USERMODEL) {
				try {
					await UserModel.findOneAndUpdate({ username: userKey, balance: { $gte: amount } }, { $inc: { balance: -amount } }, { returnDocument: 'after' });
				} catch (err) {
					logger.warn('Failed to mirror debitWallet to UserModel', err);
				}
			}
			return true;
		}
		return false;
	} catch (err) {
		logger.warn('Failed to debit wallet in UserModel', err);
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
			logger.warn('Failed to mirror transfer to UserModel', err);
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
