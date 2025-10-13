import { WebhookClient, RESTPostAPIWebhookWithTokenJSONBody, WebhookMessageCreateOptions } from 'discord.js';

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
            // discord.js accepts string or message options
            // @ts-ignore
            const res = await client.send(item.payload as any);
            item.resolve(res);
        } catch (err) {
            item.reject(err);
        }
        // Respect per-webhook rate limit
        await new Promise((r) => setTimeout(r, DEFAULT_RATE_MS));
    }

    processing.set(key, false);
}

export function enqueueWebhook(id: string, token: string, payload: string | WebhookMessageCreateOptions | RESTPostAPIWebhookWithTokenJSONBody) {
    const key = keyFor(id, token);
    if (!queues.has(key)) queues.set(key, []);
    return new Promise((resolve, reject) => {
        const q = queues.get(key)!;
        q.push({ payload, resolve, reject });
        // kick off processor
        void processQueue(id, token);
    });
}

export function clearWebhookCache() {
    // Destroys clients and queues (useful for tests)
    for (const client of clients.values()) {
        try { client.destroy(); } catch { };
    }
    clients.clear();
    queues.clear();
    processing.clear();
}

export default { enqueueWebhook, clearWebhookCache };
