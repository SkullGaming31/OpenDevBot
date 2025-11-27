import mongoose from 'mongoose';
import BankAccount, { IBankAccount } from '../database/models/bankAccount';
import TransactionLog from '../database/models/transactionLog';
import MarketplaceItem from '../database/models/marketplaceItem';

export class EconomyError extends Error { }

export async function getOrCreateAccount(userId: string): Promise<IBankAccount> {
	let acct = await BankAccount.findOne({ userId });
	if (!acct) {
		acct = new BankAccount({ userId, balance: 0 });
		await acct.save();
	}
	return acct;
}

async function transactionsSupported(): Promise<boolean> {
	try {
		// replSetGetStatus will fail on standalone mongod
		const db = mongoose.connection.db;
		if (!db) return false;
		await db.admin().command({ replSetGetStatus: 1 });
		return true;
	} catch (err) {
		return false;
	}
}

export async function deposit(userId: string, amount: number, session?: mongoose.ClientSession, meta?: Record<string, unknown>) {
	if (amount <= 0) throw new EconomyError('Amount must be positive');
	const opts = session ? { session } : undefined as any;
	if (session) {
		// session-based: keep existing document load/save to participate in transaction
		let acct = await BankAccount.findOne({ userId }).session(session);
		if (!acct) {
			acct = new BankAccount({ userId, balance: amount });
			await acct.save(opts);
		} else {
			acct.balance += amount;
			await acct.save(opts);
		}
		await TransactionLog.create([{ type: 'deposit', to: userId, amount, meta: meta ?? {}, }], opts);
		return acct as IBankAccount;
	}

	// Non-transactional: use atomic upsert + $inc so concurrent deposits are safe
	const acct = await BankAccount.findOneAndUpdate(
		{ userId },
		{ $inc: { balance: amount }, $setOnInsert: { userId } },
		{ upsert: true, new: true }
	).lean();
	await TransactionLog.create([{ type: 'deposit', to: userId, amount, meta: meta ?? {}, }]);
	return acct as unknown as IBankAccount;
}

export async function withdraw(userId: string, amount: number, session?: mongoose.ClientSession, meta?: Record<string, unknown>) {
	if (amount <= 0) throw new EconomyError('Amount must be positive');
	const opts = session ? { session } : undefined as any;
	if (session) {
		// session-based: existing load/save to participate in transaction
		const acct = await BankAccount.findOne({ userId }).session(session);
		if (!acct || acct.balance < amount) throw new EconomyError('Insufficient funds');
		acct.balance -= amount;
		await acct.save(opts);
		await TransactionLog.create([{ type: 'withdraw', from: userId, amount, meta: meta ?? {} }], opts);
		return acct as IBankAccount;
	}

	// Non-transactional: atomically decrement only if sufficient funds
	const acct = await BankAccount.findOneAndUpdate(
		{ userId, balance: { $gte: amount } },
		{ $inc: { balance: -amount } },
		{ new: true }
	).lean();
	if (!acct) throw new EconomyError('Insufficient funds');
	await TransactionLog.create([{ type: 'withdraw', from: userId, amount, meta: meta ?? {} }]);
	return acct as unknown as IBankAccount;
}

export async function transfer(from: string, to: string, amount: number, meta?: Record<string, unknown>) {
	if (amount <= 0) throw new EconomyError('Amount must be positive');
	// Use transactions when supported; otherwise fallback to conditional updates
	if (await transactionsSupported()) {
		const session = await mongoose.startSession();
		session.startTransaction();
		try {
			await withdraw(from, amount, session);
			await deposit(to, amount, session);
			await TransactionLog.create([{ type: 'transfer', from, to, amount, meta: meta ?? {} }], { session });
			await session.commitTransaction();
			session.endSession();
			return;
		} catch (err) {
			await session.abortTransaction();
			session.endSession();
			throw err;
		}
	}

	// Fallback: conditional atomic updates without transactions
	// Decrement 'from' only if sufficient balance
	const dec = await BankAccount.findOneAndUpdate(
		{ userId: from, balance: { $gte: amount } },
		{ $inc: { balance: -amount } },
		{ new: true }
	);
	if (!dec) throw new EconomyError('Insufficient funds');
	// Credit recipient
	const cred = await BankAccount.findOneAndUpdate(
		{ userId: to },
		{ $inc: { balance: amount } },
		{ upsert: true, new: true }
	);
	await TransactionLog.create([{ type: 'transfer', from, to, amount, meta: meta ?? {} }]);
}

export async function listMarketplace() {
	return MarketplaceItem.find({}).lean();
}

export async function buyItem(buyerId: string, itemId: string) {
	// Try transactions first
	if (await transactionsSupported()) {
		const session = await mongoose.startSession();
		session.startTransaction();
		try {
			const item = await MarketplaceItem.findOne({ itemId }).session(session);
			if (!item) throw new EconomyError('Item not found');
			await withdraw(buyerId, item.price, session);
			await deposit(item.sellerId, item.price, session);
			await item.deleteOne({ session });
			await TransactionLog.create([{ type: 'purchase', from: buyerId, to: item.sellerId, amount: item.price, meta: { itemId } }], { session });
			await session.commitTransaction();
			session.endSession();
			return { success: true };
		} catch (err) {
			await session.abortTransaction();
			session.endSession();
			throw err;
		}
	}

	// Fallback without transactions. Use conditional updates and safe rollback if needed.
	const item = await MarketplaceItem.findOne({ itemId });
	if (!item) throw new EconomyError('Item not found');
	// Attempt to debit buyer atomically only if sufficient funds
	const buyerAfter = await BankAccount.findOneAndUpdate(
		{ userId: buyerId, balance: { $gte: item.price } },
		{ $inc: { balance: -item.price } },
		{ new: true }
	);
	if (!buyerAfter) throw new EconomyError('Insufficient funds');

	// Try to atomically remove the item. If removal fails (someone else bought it), refund the buyer.
	const removed = await MarketplaceItem.findOneAndDelete({ itemId });
	if (!removed) {
		// refund buyer
		await BankAccount.findOneAndUpdate({ userId: buyerId }, { $inc: { balance: item.price } });
		throw new EconomyError('Item no longer available');
	}

	// Credit seller
	await BankAccount.findOneAndUpdate({ userId: item.sellerId }, { $inc: { balance: item.price } }, { upsert: true });
	await TransactionLog.create([{ type: 'purchase', from: buyerId, to: item.sellerId, amount: item.price, meta: { itemId } }]);
	return { success: true };
}
