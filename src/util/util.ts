import rateLimit from 'express-rate-limit';

export async function sleep(ms: number): Promise<void> { await new Promise(resolve => setTimeout(resolve, ms)); }

export const limiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100,
	message: 'To many requests, Please try again later',
	standardHeaders: true,
	legacyHeaders: false
});