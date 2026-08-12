import { IBankAccount } from '../database/models/bankAccount';
import logger from '../util/logger';
import * as economyService from './economyService';

// Legacy mirroring to `UserModel.balance` has been removed.

function safeStr(v: unknown) {
	return v == null ? '' : String(v);
}
export async function getOrCreate(userId: string): Promise<IBankAccount> {
	return economyService.getOrCreateAccount(userId);
}

export async function deposit(userId: string, amount: number) {
	const acct = await economyService.deposit(userId, amount);
	// mirroring removed
	return acct;
}

export async function withdraw(userId: string, amount: number) {
	const acct = await economyService.withdraw(userId, amount);
	// mirroring removed
	return acct;
}

export async function creditWallet(userKey: string | null | undefined, amount: number, username?: string | null, channelId?: string | null) {
	const BankModule = require('../database/models/bankAccount');
	const Bank = (BankModule && (BankModule.default ?? BankModule)) as unknown as import('mongoose').Model<IBankAccount>;
	const keyStr = safeStr(userKey || username).toLowerCase();
	const isNumericId = /^\d+$/.test(keyStr);

	// Helper: ensure existing legacy numeric `balance` fields are normalized
	const ensureBalanceObject = async (query: Record<string, unknown>) => {
		try {
			const existing = await Bank.findOne(query).lean();
			if (!existing) return false;
			const b = (existing as Partial<IBankAccount>).balance as unknown;
			if (typeof b === 'number' || b == null) {
				const normalized = typeof b === 'number' ? { bank: b, wallet: 0 } : { bank: 0, wallet: 0 };
				try {
					// Use replaceOne to ensure the field is an object (avoids nested-path conflicts)
					await Bank.replaceOne({ _id: (existing as Partial<IBankAccount>)._id }, Object.assign({}, existing, { balance: normalized }));
					return true;
				} catch (rerr) {
					// If replace fails, fallback to updateOne
					try {
						await Bank.updateOne({ _id: (existing as Partial<IBankAccount>)._id }, { $set: { balance: normalized } });
						return true;
					} catch (uerr) {
						logger.warn('Failed to set normalized balance via updateOne', uerr);
						return false;
					}
				}
			}
			return false;
		} catch (e) {
			logger.warn('Failed to normalize legacy balance field', e);
			return false;
		}
	};

	try {
		if (isNumericId) {
			// Prefer safe path: read-then-update to avoid upsert nested-path conflicts
			try {
				const existing = await Bank.findOne({ userId: keyStr }).lean();
				if (!existing) {
					// create a new account with initial wallet amount
					const created = await Bank.create({ userId: keyStr, username: username || keyStr, balance: { bank: 0, wallet: amount } });
					const newWallet = (created as Partial<IBankAccount>).balance?.wallet ?? amount;
					// created new BankAccount with initial wallet
					return newWallet;
				}

				// Ensure balance is normalized to object form
				await ensureBalanceObject({ userId: keyStr });
				// Use _id-targeted update (no upsert) to avoid nested-path conflict
				const updated = await Bank.findOneAndUpdate({ _id: (existing as Partial<IBankAccount>)._id }, { $inc: { 'balance.wallet': amount }, $set: { updatedAt: new Date() } }, { returnDocument: 'after' }).lean();
				const bal = (updated as Partial<IBankAccount> | null)?.balance;
				const newWallet = bal && typeof bal === 'object' ? (bal as { wallet?: number }).wallet ?? 0 : null;
				// updated existing BankAccount wallet
				return newWallet;
			} catch (err) {
				logger.warn('creditWallet numeric id fallback failed', err);
				return null;
			}
		}

		// Non-numeric username path: similar safe read-then-update approach
		const uname = safeStr(username || userKey);
		try {
			const existing = await Bank.findOne({ username: uname }).lean();
			if (!existing) {
				const created = await Bank.create({ username: uname, balance: { bank: 0, wallet: amount } });
				const newWallet = (created as Partial<IBankAccount>).balance?.wallet ?? amount;
				// created new BankAccount with initial wallet
				return newWallet;
			}
			await ensureBalanceObject({ username: uname });
			const updated = await Bank.findOneAndUpdate({ _id: (existing as Partial<IBankAccount>)._id }, { $inc: { 'balance.wallet': amount }, $set: { updatedAt: new Date() } }, { returnDocument: 'after' }).lean();
			const bal = (updated as Partial<IBankAccount> | null)?.balance;
			const newWallet = bal && typeof bal === 'object' ? (bal as { wallet?: number }).wallet ?? 0 : null;
			// updated existing BankAccount wallet
			return newWallet;
		} catch (err) {
			logger.warn('creditWallet username path failed', err);
			return null;
		}
	} catch (err) {
		logger.warn('Failed to credit wallet in BankAccount', err);
		return null;
	}
}

export async function getWallet(userKey: string | null | undefined, username?: string | null, channelId?: string | null) {
	try {
		const keyStr = safeStr(userKey || username).toLowerCase();
		const isNumericId = /^\d+$/.test(keyStr);
		const BankModule = require('../database/models/bankAccount');
		const Bank = (BankModule && (BankModule.default ?? BankModule)) as unknown as import('mongoose').Model<IBankAccount>;
		if (isNumericId) return await Bank.findOne({ userId: keyStr }).lean();
		const uname = safeStr(username || userKey);
		if (uname) return await Bank.findOne({ username: uname }).lean();
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

export async function debitWallet(userKey: string | null | undefined, amount: number, username?: string | null, channelId?: string | null): Promise<boolean> {
	try {
		const BankModule = require('../database/models/bankAccount');
		const Bank = (BankModule && (BankModule.default ?? BankModule)) as unknown as import('mongoose').Model<IBankAccount>;

		const keyStr = safeStr(userKey || username).toLowerCase();
		const isNumericId = /^\d+$/.test(keyStr);
		// Helper: ensure legacy numeric `balance` fields are normalized (best-effort)
		const ensureBalanceObject = async (query: Record<string, unknown>) => {
			try {
				const existing = await Bank.findOne(query).lean();
				if (!existing) return;
				const b = (existing as Partial<IBankAccount>).balance as unknown;
				if (typeof b === 'number') {
					await Bank.updateOne(query, { $set: { balance: { bank: b, wallet: 0 } } });
				} else if (b == null) {
					await Bank.updateOne(query, { $set: { balance: { bank: 0, wallet: 0 } } });
				}
			} catch (e) {
				logger.warn('Failed to normalize legacy balance field (debit)', e);
			}
		};

		if (isNumericId) {
			await ensureBalanceObject({ userId: keyStr });
			const updatedNumeric = await Bank.findOneAndUpdate({ userId: keyStr, 'balance.wallet': { $gte: amount } }, { $inc: { 'balance.wallet': -amount } }, { returnDocument: 'after' });
			return !!updatedNumeric;
		}

		if (username) {
			const uname = safeStr(username);
			await ensureBalanceObject({ username: uname });
			const updatedByUsername = await Bank.findOneAndUpdate({ username: uname, 'balance.wallet': { $gte: amount } }, { $inc: { 'balance.wallet': -amount } }, { returnDocument: 'after' });
			return !!updatedByUsername;
		}

		const unameKey = safeStr(userKey);
		await ensureBalanceObject({ username: unameKey });
		const updatedFinal = await Bank.findOneAndUpdate({ username: unameKey, 'balance.wallet': { $gte: amount } }, { $inc: { 'balance.wallet': -amount } }, { returnDocument: 'after' });
		return !!updatedFinal;
	} catch (err) {
		logger.warn('Failed to debit wallet in BankAccount', err);
		return false;
	}
}

export async function transfer(from: string, to: string, amount: number) {
	const res = await economyService.transfer(from, to, amount);
	// No mirroring to UserModel; operate on BankAccount via economyService
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
