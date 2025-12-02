import rateLimit from 'express-rate-limit';

export async function sleep(ms: number): Promise<void> {
	await new Promise<void>((resolve) => {
		const t: ReturnType<typeof setTimeout> = setTimeout(resolve, ms);
		// ensure timer does not keep node event loop alive in test environments
		// (unref is available on Node timers). Use `unknown` casts to avoid `any`.
		const maybeUnref = t as unknown as { unref?: () => void };
		if (typeof maybeUnref.unref === 'function') maybeUnref.unref();
	});
}

export const limiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100,
	message: 'To many requests, Please try again later',
	standardHeaders: true,
	legacyHeaders: false
});