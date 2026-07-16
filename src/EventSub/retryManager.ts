import { RetryModel, IRetryRecord } from './retryModel';

const BASE_DELAY_MS = 1000; // base backoff 1s
const MAX_ATTEMPTS = 6;

export class RetryManager {
	async markFailed(subscriptionId: string, authUserId: string, errMsg: string): Promise<IRetryRecord> {
		// Use atomic upsert/update operations to avoid duplicate-insert races when
		// multiple workers attempt to mark the same subscription failed at once.
		const filter = { subscriptionId, authUserId };
		// Ensure a record exists (create with zero attempts if not) then increment.
		await RetryModel.findOneAndUpdate(filter, { $setOnInsert: { subscriptionId, authUserId, attempts: 0, status: 'pending' } }, { upsert: true }).exec();

		// If the record is already permanently failed, don't keep incrementing.
		const existing = await RetryModel.findOne(filter).exec();
		if (existing && existing.status === 'failed') {
			// Update lastError for operator visibility but do not increment attempts
			existing.lastError = errMsg;
			await existing.save();
			return existing;
		}

		// Atomically increment attempts and fetch the new value
		const updated = await RetryModel.findOneAndUpdate(filter, { $inc: { attempts: 1 } }, { returnDocument: 'after' }).exec();
		if (!updated) {
			// Fallback: create a fresh record if something unexpected happened
			const rec = new RetryModel({ subscriptionId, authUserId, attempts: 1, lastError: errMsg, nextRetryAt: new Date(Date.now() + this.computeDelay(1)) });
			await rec.save();
			return rec;
		}

		// Update status and nextRetryAt based on attempts
		let attempts = updated.attempts ?? 1;
		// Cap attempts to MAX_ATTEMPTS to prevent runaway incrementing
		if (attempts > MAX_ATTEMPTS) attempts = MAX_ATTEMPTS;
		if (attempts >= MAX_ATTEMPTS) {
			updated.status = 'failed';
			updated.nextRetryAt = null;
			updated.attempts = attempts;
		} else {
			updated.status = 'pending';
			updated.nextRetryAt = new Date(Date.now() + this.computeDelay(attempts));
			updated.attempts = attempts;
		}
		updated.lastError = errMsg;
		await updated.save();
		return updated;
	}

	async markSucceeded(subscriptionId: string, authUserId: string): Promise<void> {
		await RetryModel.findOneAndUpdate({ subscriptionId, authUserId }, { status: 'succeeded', nextRetryAt: null });
	}

	computeDelay(attempts: number): number {
		// exponential backoff with jitter
		const exp = Math.pow(2, attempts);
		const jitter = Math.floor(Math.random() * 1000);
		return BASE_DELAY_MS * exp + jitter;
	}

	async getPending(): Promise<IRetryRecord[]> {
		const now = new Date();
		return RetryModel.find({ status: 'pending', nextRetryAt: { $lte: now } }).exec();
	}

	async remove(subscriptionId: string, authUserId: string): Promise<void> {
		await RetryModel.deleteOne({ subscriptionId, authUserId });
	}
}

export default new RetryManager();
