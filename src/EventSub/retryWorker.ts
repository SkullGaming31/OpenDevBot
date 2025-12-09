import retryManager from './retryManager';
import { eventSubRetries } from '../monitoring/metrics';
import { createSubscriptionsForAuthUser } from '../EventSubEvents';
import type { IRetryRecord } from './retryModel';
import { SubscriptionModel } from '../database/models/eventSubscriptions';
import { TokenModel } from '../database/models/tokenModel';
import { sleep } from '../util/util';
import logger from '../util/logger';

const POLL_INTERVAL_MS = process.env.EVENTSUB_RETRY_POLL_MS ? Number(process.env.EVENTSUB_RETRY_POLL_MS) : 5000;
const MAX_CONCURRENT = process.env.EVENTSUB_RETRY_CONCURRENT ? Number(process.env.EVENTSUB_RETRY_CONCURRENT) : 3;

let running = false;

export async function attemptResubscribe(rec: IRetryRecord): Promise<void> {
	try {
		logger.debug(`RetryWorker: attempting targeted resubscribe for subscription ${rec.subscriptionId} authUser ${rec.authUserId}`);
		// Lookup the user's token from DB and attempt a targeted subscription creation using their token
		const token = await TokenModel.findOne({ user_id: rec.authUserId }).lean();
		if (!token) {
			logger.warn(`RetryWorker: no token found for authUser ${rec.authUserId}`);
			try { eventSubRetries.inc({ authUserId: rec.authUserId }); } catch (e) { /* ignore */ }
			await retryManager.markFailed(rec.subscriptionId, rec.authUserId, 'No token available for user');
			return;
		}
		try { eventSubRetries.inc({ authUserId: rec.authUserId }); } catch (e) { /* ignore */ }
		await createSubscriptionsForAuthUser(rec.authUserId, token.access_token);
		// After attempting targeted creation, check if subscription now exists in DB
		const exists = await SubscriptionModel.findOne({ subscriptionId: rec.subscriptionId, authUserId: rec.authUserId }).exec();
		if (exists) {
			logger.debug(`RetryWorker: subscription ${rec.subscriptionId} exists after recreate, marking succeeded`);
			await retryManager.markSucceeded(rec.subscriptionId, rec.authUserId);
			return;
		}
		// If still missing, consider this an attempt failure and record it
		await retryManager.markFailed(rec.subscriptionId, rec.authUserId, 'Resubscribe attempt did not create subscription');
	} catch (err) {
		try {
			await retryManager.markFailed(rec.subscriptionId, rec.authUserId, String(err));
		} catch (e) {
			logger.warn('RetryWorker: failed to record failure', e);
		}
	}
}

export async function startRetryWorker(): Promise<void> {
	if (running) return;
	running = true;
	logger.info('EventSub RetryWorker started');

	// Loop until process exits. Use a simple polling loop to avoid complex schedulers.
	while (running) {
		try {
			const pending = await retryManager.getPending();
			if (pending && pending.length > 0) {
				// process up to MAX_CONCURRENT entries in parallel
				const toProcess = pending.slice(0, MAX_CONCURRENT);
				await Promise.all(toProcess.map((rec) => attemptResubscribe(rec)));
			}
		} catch (err) {
			logger.error('RetryWorker: error during processing loop', err);
		}
		// Sleep before next poll
		await sleep(POLL_INTERVAL_MS);
	}
}

export async function stopRetryWorker(): Promise<void> {
	running = false;
}
