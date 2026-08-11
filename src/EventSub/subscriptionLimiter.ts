type Task<T> = {
	run: () => Promise<T>;
	resolve: (v: T) => void;
	reject: (e: unknown) => void;
};

const queue: Task<unknown>[] = [];
let running = 0;
let lastStart = 0;

const MIN_TIME_MS = process.env.EVENTSUB_MIN_TIME_MS ? Number(process.env.EVENTSUB_MIN_TIME_MS) : 300; // spacing between starts
const MAX_CONCURRENT = process.env.EVENTSUB_MAX_CONCURRENT ? Number(process.env.EVENTSUB_MAX_CONCURRENT) : 2;

function schedule<T>(fn: () => Promise<T>): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		queue.push({ run: fn as () => Promise<unknown>, resolve: resolve as unknown as (v: unknown) => void, reject } as Task<unknown>);
		processQueue();
	});
}

function processQueue() {
	if (running >= MAX_CONCURRENT) return;
	const now = Date.now();
	const since = now - lastStart;
	if (since < MIN_TIME_MS) {
		// schedule after remaining time
		setTimeout(processQueue, MIN_TIME_MS - since);
		return;
	}
	const item = queue.shift();
	if (!item) return;
	running++;
	lastStart = Date.now();
	item.run()
		.then((v) => item.resolve(v))
		.catch((e) => item.reject(e))
		.finally(() => {
			running--;
			// allow next item to run after MIN_TIME_MS
			setTimeout(processQueue, MIN_TIME_MS);
		});
}

export default { schedule };
