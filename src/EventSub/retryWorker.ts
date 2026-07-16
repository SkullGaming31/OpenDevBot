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
		// Use subscription limiter to avoid creating many subscriptions at once
		await (await import('./subscriptionLimiter')).default.schedule(() => createSubscriptionsForAuthUser(rec.authUserId, token.access_token));
		// After attempting targeted creation, check Twitch (and DB) to see if
		// the subscription actually exists. Twurple/create events may record
		// different forms of identifiers (type-based strings vs UUIDs), so
		// query Twitch directly to avoid mismatches.
		try {
			const axios = await import('axios');
			const clientId = process.env.TWITCH_CLIENT_ID as string;
			const resp = await axios.default.get('https://api.twitch.tv/helix/eventsub/subscriptions', {
				headers: {
					'Authorization': `Bearer ${token.access_token}`,
					'Client-Id': clientId,
				},
				params: { first: 100 },
			});
			const rows = Array.isArray(resp?.data?.data) ? resp.data.data : [];

			// Try to match by exact subscription id (UUID) first
			const byId = rows.find((r: unknown) => String((r as Record<string, unknown>)['id']) === String(rec.subscriptionId));
			if (byId) {
				logger.debug(`RetryWorker: found subscription by id on Twitch for ${rec.subscriptionId}`);
				await retryManager.markSucceeded(rec.subscriptionId, rec.authUserId);
				return;
			}

			// If subscriptionId looks like a type with broadcaster suffix (type.broadcasterId),
			// match by type and condition.broadcaster_user_id
			if (String(rec.subscriptionId).includes('.')) {
				const parts = String(rec.subscriptionId).split('.');
				const maybeBroadcaster = parts[parts.length - 1];
				const typePart = parts.length > 1 ? parts.slice(0, -1).join('.') : String(rec.subscriptionId);
				const byType = rows.find((r: unknown) => {
					try {
						const rec = r as Record<string, unknown>;
						const cond = rec.condition as Record<string, unknown> | undefined;
						return String(rec.type) === typePart && cond && String(cond['broadcaster_user_id'] ?? '') === String(maybeBroadcaster);
					} catch (_e) {
						return false;
					}
				});
				if (byType) {
					logger.debug(`RetryWorker: found subscription by type/broadcaster on Twitch for ${rec.subscriptionId}`);
					await retryManager.markSucceeded(rec.subscriptionId, rec.authUserId);
					return;
				}
			}
		} catch (e) {
			logger.debug('RetryWorker: failed to query Twitch subscriptions after resubscribe attempt', e);
		}

		// Also check local DB by UUID as a fallback
		const exists = await SubscriptionModel.findOne({ subscriptionId: rec.subscriptionId, authUserId: rec.authUserId }).exec();
		if (exists) {
			logger.debug(`RetryWorker: subscription ${rec.subscriptionId} exists in DB after recreate, marking succeeded`);
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
