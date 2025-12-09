import { WebhookClient, RESTPostAPIWebhookWithTokenJSONBody, WebhookMessageCreateOptions } from 'discord.js';
import { webhookAttempts } from '../monitoring/metrics';
import logger from '../util/logger';
import WebhookQueueModel, { IWebhookQueue } from '../database/models/webhookQueue';
import mongoose, { UpdateQuery, Document } from 'mongoose';

type QueueItem = {
	payload: string | WebhookMessageCreateOptions | RESTPostAPIWebhookWithTokenJSONBody;
	resolve: (value?: unknown) => void;
	reject: (err?: unknown) => void;
};

const queues: Map<string, QueueItem[]> = new Map();
const clients: Map<string, WebhookClient> = new Map();
const processing: Map<string, boolean> = new Map();

const DEFAULT_RATE_MS = Number(process.env.DISCORD_WEBHOOK_RATE_MS) || 1000; // default 1 second per webhook

function keyFor(id: string, token: string) { return `${id}:${token}`; }

function getClient(id: string, token: string) {
	const key = keyFor(id, token);
	let c = clients.get(key);
	if (!c) {
		c = new WebhookClient({ id, token });
		clients.set(key, c);
	}
	return c;
}

async function processQueue(id: string, token: string) {
	const key = keyFor(id, token);
	if (processing.get(key)) return;
	processing.set(key, true);

	const queue = queues.get(key) || [];

	while (queue.length > 0) {
		const item = queue.shift()!;
		try {
			const client = getClient(id, token);
			// discord.js accepts string or message options. Narrow payload to avoid unsafe any.
			let res: unknown;
			if (typeof item.payload === 'string') {
				// text message
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				res = await client.send(item.payload);
			} else {
				// object payload
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				res = await client.send(item.payload as WebhookMessageCreateOptions);
			}
			item.resolve(res);
			try { webhookAttempts.inc({ provider: 'discord', status: 'success' }); } catch (e) { /* ignore metrics errors */ }
		} catch (err) {
			try { webhookAttempts.inc({ provider: 'discord', status: 'error' }); } catch (e) { /* ignore metrics errors */ }
			item.reject(err);
		}
		// Respect per-webhook rate limit
		await new Promise((r) => setTimeout(r, DEFAULT_RATE_MS));
	}

	processing.set(key, false);
}

// Helper to claim and process pending DB items on startup or when processor is idle
async function processPendingFromDB() {
	try {
		if (!mongoose.connection || mongoose.connection.readyState !== 1) return;
		// Find pending items ordered by creation time
		type PendingDoc = { _id: mongoose.Types.ObjectId; webhookId: string; token: string; payload: unknown };
		const pending = (await WebhookQueueModel.find({ status: 'pending' }).sort({ createdAt: 1 }).limit(200).lean()) as unknown as PendingDoc[];
		for (const doc of pending) {
			// push into in-memory queue so callers waiting on promises in this process can be resolved
			const key = `${doc.webhookId}:${doc.token}`;
			if (!queues.has(key)) queues.set(key, []);
			// convert payload to the shape discord.js expects (it's already plain JSON)
			const q = queues.get(key)!;
			// create a placeholder promise resolver that will update the DB entry when processed
			new Promise((resolve, reject) => {
				q.push({
					payload: doc.payload as unknown as WebhookMessageCreateOptions | string,
					resolve: async (res?: unknown) => {
						try {
							// remove the DB record after successful send to avoid clutter
							await WebhookQueueModel.findByIdAndDelete(doc._id);
						} catch (e) {
							logger.debug('Failed to remove webhook DB record after send', String(e));
						}
						resolve(res);
					},
					reject: async (err?: unknown) => {
						try {
							const update = { $set: { status: 'failed', lastError: String(err), updatedAt: new Date() }, $inc: { attempts: 1 } } as unknown as UpdateQuery<IWebhookQueue>;
							await WebhookQueueModel.findByIdAndUpdate(doc._id, update);
						} catch (e) {
							logger.debug('Failed to mark webhook as failed in DB', String(e));
						}
						reject(err);
					}
				});
			});
			// immediately kick the queue processor for this webhook
			void processQueue(doc.webhookId, doc.token);
			// don't await promiseWrapper here; we just hydrate the in-memory queue
		}
	} catch (err) {
		logger.debug('Error processing pending webhook DB items:', String(err));
	}
}

// hydrate DB items on module load (best-effort)
void processPendingFromDB();

// Also attempt to process pending items when the mongoose connection is established/re-established
try {
	mongoose.connection.on('connected', () => { void processPendingFromDB(); });
	mongoose.connection.on('reconnected', () => { void processPendingFromDB(); });
} catch (e) {
	// ignore
}

export function enqueueWebhook(id: string, token: string, payload: string | WebhookMessageCreateOptions | RESTPostAPIWebhookWithTokenJSONBody) {
	const key = keyFor(id, token);
	if (!queues.has(key)) queues.set(key, []);
	// Serialize payload to plain JSON for persistence when possible
	function serialize(p: unknown) {
		if (typeof p === 'string') return p;
		try {
			return JSON.parse(JSON.stringify(p));
		} catch (e) {
			// fallback: store as-is
			return p;
		}
	}

	return new Promise((resolve, reject) => {
		(async () => {
			const q = queues.get(key)!;
			// Persist the queued webhook to DB (best-effort)
			let dbDoc: Document | null = null;
			try {
				if (WebhookQueueModel) {
					const payloadToStore = serialize(payload);
					dbDoc = await WebhookQueueModel.create({ webhookId: id, token, payload: payloadToStore, status: 'pending', attempts: 0 });
				}
			} catch (e) {
				logger.debug('Failed to persist webhook queue item to DB:', String(e));
				dbDoc = null;
			}

			q.push({
				payload,
				resolve: async (res?: unknown) => {
					// mark DB doc as sent when we succeed
					if (dbDoc && dbDoc._id) {
						try {
							// delete DB record after successful send
							await WebhookQueueModel.findByIdAndDelete((dbDoc as Document)._id);
						} catch (e) { logger.debug('Failed to remove webhook DB record after send', String(e)); }
					}
					resolve(res);
				},
				reject: async (err?: unknown) => {
					// update db doc as failed
					if (dbDoc && dbDoc._id) {
						try {
							const update = { $set: { status: 'failed', lastError: String(err), updatedAt: new Date() }, $inc: { attempts: 1 } } as unknown as UpdateQuery<IWebhookQueue>;
							await WebhookQueueModel.findByIdAndUpdate((dbDoc as Document)._id, update);
						} catch (e) { logger.debug('Failed to mark webhook failed', String(e)); }
					}
					reject(err);
				}
			});
			// kick off processor
			void processQueue(id, token);
		})().catch(reject);
	});
}

export function clearWebhookCache() {
	// Destroys clients and queues (useful for tests)
	for (const client of clients.values()) {
		try {
			client.destroy();
		} catch (e: unknown) {
			// log at debug level so we don't swallow unexpected errors silently
			if (e instanceof Error) {
				logger.debug('Failed to destroy webhook client ', e.message + e.stack);
			}
		}
	}
	clients.clear();
	queues.clear();
	processing.clear();
}

export default { enqueueWebhook, clearWebhookCache };
