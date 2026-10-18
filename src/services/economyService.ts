import BankAccount, { IBankAccount } from '../database/models/bankAccount';
import TransactionLog from '../database/models/transactionLog';
import MarketplaceItem from '../database/models/marketplaceItem';
import { withSqliteTransaction } from '../database/sqliteConnection';

export class EconomyError extends Error { }

export async function getOrCreateAccount(userId: string): Promise<IBankAccount> {
	let acct = await BankAccount.findOne({ userId });
	if (!acct) {
		acct = new BankAccount({ userId, balance: { bank: 0, wallet: 0 } });
		await acct.save();
	}
	return acct;
}

function assertPositiveAmount(amount: number): void {
	if (!Number.isFinite(amount) || amount <= 0) throw new EconomyError('Amount must be positive');
}

function ensureBalanceObject(acct: { balance?: unknown }): void {
	if (acct.balance === undefined || acct.balance === null) {
		acct.balance = { bank: 0, wallet: 0 };
	} else if (typeof acct.balance === 'number') {
		acct.balance = { bank: acct.balance, wallet: 0 };
	} else if (typeof acct.balance === 'object' && !Array.isArray(acct.balance)) {
		const balance = acct.balance as { bank?: unknown; wallet?: unknown };
		acct.balance = {
			bank: typeof balance.bank === 'number' ? balance.bank : 0,
			wallet: typeof balance.wallet === 'number' ? balance.wallet : 0,
		};
	}
}

function depositSync(userId: string, amount: number, meta?: Record<string, unknown>) {
	const acct = BankAccount.findOneAndUpdate(
		{ userId },
		{ $inc: { 'balance.bank': amount }, $setOnInsert: { userId }, $set: { updatedAt: new Date() } },
		{ upsert: true, returnDocument: 'after' }
	).execSync();
	if (!acct) throw new EconomyError('Failed to deposit funds');
	ensureBalanceObject(acct);
	TransactionLog.createSync({ type: 'deposit', to: userId, amount, meta: meta ?? {} });
	return acct;
}

function withdrawSync(userId: string, amount: number, meta?: Record<string, unknown>) {
	const acct = BankAccount.findOneAndUpdate(
		{ userId, 'balance.bank': { $gte: amount } },
		{ $inc: { 'balance.bank': -amount }, $set: { updatedAt: new Date() } },
		{ returnDocument: 'after' }
	).execSync();
	if (!acct) throw new EconomyError('Insufficient funds');
	ensureBalanceObject(acct);
	TransactionLog.createSync({ type: 'withdraw', from: userId, amount, meta: meta ?? {} });
	return acct;
}

export async function deposit(userId: string, amount: number, meta?: Record<string, unknown>) {
	assertPositiveAmount(amount);
	return withSqliteTransaction(() => depositSync(userId, amount, meta));
}

export async function withdraw(userId: string, amount: number, meta?: Record<string, unknown>) {
	assertPositiveAmount(amount);
	return withSqliteTransaction(() => withdrawSync(userId, amount, meta));
}

export async function transfer(from: string, to: string, amount: number, meta?: Record<string, unknown>) {
	assertPositiveAmount(amount);
	withSqliteTransaction(() => {
		withdrawSync(from, amount, meta);
		depositSync(to, amount, meta);
		TransactionLog.createSync({ type: 'transfer', from, to, amount, meta: meta ?? {} });
	});
}

export async function listMarketplace() {
	return MarketplaceItem.find({}).lean();
}

export async function buyItem(buyerId: string, itemId: string) {
	return withSqliteTransaction(() => {
		const item = MarketplaceItem.findOne({ itemId }).execSync();
		if (!item) throw new EconomyError('Item not found');

		const buyer = BankAccount.findOneAndUpdate(
			{ userId: buyerId, 'balance.bank': { $gte: item.price } },
			{ $inc: { 'balance.bank': -item.price }, $set: { updatedAt: new Date() } },
			{ returnDocument: 'after' }
		).execSync();
		if (!buyer) throw new EconomyError('Insufficient funds');

		const removed = MarketplaceItem.findOneAndDeleteSync({ itemId });
		if (!removed) throw new EconomyError('Item no longer available');

		const seller = BankAccount.findOneAndUpdate(
			{ userId: item.sellerId },
			{ $inc: { 'balance.bank': item.price }, $setOnInsert: { userId: item.sellerId }, $set: { updatedAt: new Date() } },
			{ upsert: true, returnDocument: 'after' }
		).execSync();
		if (!seller) throw new EconomyError('Failed to credit seller');

		TransactionLog.createSync({ type: 'purchase', from: buyerId, to: item.sellerId, amount: item.price, meta: { itemId } });
		return { success: true };
	});
}
