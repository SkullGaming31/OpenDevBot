type SubscriptionKey = string;

interface CreateResult {
    status: 'created' | 'existing' | 'queued' | 'failed';
    id?: string;
    attempts?: number;
}

interface SubRecord {
    id: string;
    attempts: number;
    lastError?: string;
}

/**
 * Lightweight in-memory subscription manager used as test scaffolding.
 * Real implementation will integrate with Twurple EventSub API and persistent storage.
 */
export class SubscriptionManager {
	private subs = new Map<SubscriptionKey, SubRecord>();

	private makeKey(broadcasterId: string, type: string) {
		return `${broadcasterId}::${type}`;
	}

	/**
     * Create or ensure a subscription exists. This method is idempotent: repeated
     * calls for the same broadcaster/type will return the same subscription id.
     * For scaffolding we immediately succeed and return a generated id.
     */
	async createOrEnsureSubscription(broadcasterId: string, type: string): Promise<CreateResult> {
		const key = this.makeKey(broadcasterId, type);
		const existing = this.subs.get(key);
		if (existing) {
			return { status: 'existing', id: existing.id, attempts: existing.attempts };
		}

		// Create a new subscription record
		const id = `sub_${Date.now().toString(36)}_${Math.floor(Math.random() * 1000)}`;
		const rec: SubRecord = { id, attempts: 0 };
		this.subs.set(key, rec);
		return { status: 'created', id: rec.id, attempts: rec.attempts };
	}

	/**
     * Simulate a failed create attempt for testing backoff logic. Increments
     * attempts counter and records the last error message.
     */
	async markCreateFailed(broadcasterId: string, type: string, errMsg: string): Promise<void> {
		const key = this.makeKey(broadcasterId, type);
		const rec = this.subs.get(key);
		if (!rec) {
			// initialize failed record (no id assigned yet)
			const id = `sub_pending_${Date.now().toString(36)}_${Math.floor(Math.random() * 1000)}`;
			this.subs.set(key, { id, attempts: 1, lastError: errMsg });
			return;
		}
		rec.attempts += 1;
		rec.lastError = errMsg;
		this.subs.set(key, rec);
	}

	getRecord(broadcasterId: string, type: string): SubRecord | undefined {
		return this.subs.get(this.makeKey(broadcasterId, type));
	}

	reset(): void {
		this.subs.clear();
	}
}

export default SubscriptionManager;
