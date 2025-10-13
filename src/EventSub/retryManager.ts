import { RetryModel, IRetryRecord } from './retryModel';

const BASE_DELAY_MS = 1000; // base backoff 1s
const MAX_ATTEMPTS = 6;

export class RetryManager {
	async markFailed(subscriptionId: string, authUserId: string, errMsg: string): Promise<IRetryRecord> {
		const existing = await RetryModel.findOne({ subscriptionId, authUserId });
		if (!existing) {
			const rec = new RetryModel({ subscriptionId, authUserId, attempts: 1, lastError: errMsg, nextRetryAt: new Date(Date.now() + this.computeDelay(1)) });
			await rec.save();
			return rec;
		}
		existing.attempts += 1;
		existing.lastError = errMsg;
		if (existing.attempts >= MAX_ATTEMPTS) {
			existing.status = 'failed';
			existing.nextRetryAt = null;
		} else {
			existing.nextRetryAt = new Date(Date.now() + this.computeDelay(existing.attempts));
			existing.status = 'pending';
		}
		await existing.save();
		return existing;
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
