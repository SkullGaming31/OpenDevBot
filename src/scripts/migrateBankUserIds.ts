#!/usr/bin/env ts-node
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from '../util/logger';

dotenv.config();

const uri = process.env.MONGO_URI || process.env.DOCKER_URI || 'mongodb://localhost:27017/opendevbot';

async function main() {
	const apply = process.argv.includes('--apply');
	const maybeUri = process.argv.find(arg => arg.startsWith('mongodb'));
	const connectUri = maybeUri || uri;

	logger.info('Connecting to', maybeUri ? '[cli-provided uri]' : connectUri);
	await mongoose.connect(connectUri, { dbName: process.env.DB_NAME || undefined });

	const { UserModel } = await import('../database/models/userModel');
	const BankAccount = (await import('../database/models/bankAccount')).default;

	const all = await BankAccount.find({}).lean();
	const usernameLike = all.filter(b => !/^[0-9]+$/.test(b.userId));

	if (usernameLike.length === 0) {
		logger.info('No username-like BankAccount.userId values found.');
		await mongoose.disconnect();
		return;
	}

	logger.info(`Found ${usernameLike.length} BankAccounts with non-numeric userId. Dry-run${apply ? ' (applying changes)' : ''}:`);

	for (const b of usernameLike) {
		const username = b.userId;
		const userDoc = await UserModel.findOne({ username }).lean();
		if (!userDoc) {
			logger.info(`- ${b._id} -> userId='${username}' : NO matching UserModel found`);
			continue;
		}

		const targetId = userDoc.id;
		const existing = await BankAccount.findOne({ userId: targetId }).lean();
		if (existing) {
			logger.info(`- ${b._id} -> '${username}' -> mapped id '${targetId}' : target BankAccount already exists (id ${existing._id}), SKIP`);
			continue;
		}

		logger.info(`- ${b._id} -> '${username}' -> mapped id '${targetId}' : will ${apply ? 'APPLY' : 'REPORT'}`);

		if (apply) {
			// perform an atomic rename by creating a new doc with same balance then removing old
			const session = await mongoose.startSession();
			try {
				session.startTransaction();
				const balanceObj = typeof b.balance === 'number' ? { bank: b.balance, wallet: 0 } : (b.balance || { bank: 0, wallet: 0 });
				await BankAccount.create([{ userId: targetId, balance: balanceObj }], { session });
				await BankAccount.deleteOne({ _id: b._id }).session(session);
				await session.commitTransaction();
				logger.info('  applied');
			} catch (err) {
				await session.abortTransaction();
				logger.error('  failed to apply:', err);
			} finally {
				session.endSession();
			}
		}
	}

	await mongoose.disconnect();
}

main().catch(err => {
	logger.error('Error', err);
	process.exit(1);
});
