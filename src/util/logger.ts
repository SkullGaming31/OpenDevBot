/* Minimal logger wrapper that supports levels, respects ENVIRONMENT, and writes errors to a file */
import * as fs from 'fs';
import * as path from 'path';

type LogFn = (...args: unknown[]) => void;

type TimeLabel = string | number | symbol;

// store high-resolution timers
const timers = new Map<TimeLabel, bigint>();

const isDev = process.env.ENVIRONMENT === 'dev' || process.env.ENVIRONMENT === 'debug';

const errorLogFile = process.env.ERROR_LOG_FILE || path.join(process.cwd(), 'logs', 'errors.log');

// Ensure the log directory exists (best-effort, synchronous during startup is fine)
try {
	const dir = path.dirname(errorLogFile);
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
} catch (e) {
	// If we can't create the dir, we'll still attempt to write later and fallback to console.error
	/* istanbul ignore next */
	console.error('logger: failed to create error log directory', e);
}

function formatForLog(args: unknown[]): string {
	return args
		.map(a => {
			if (a instanceof Error) {
				return `${a.name}: ${a.message}\n${a.stack ?? ''}`;
			}
			try {
				return typeof a === 'string' ? a : JSON.stringify(a);
			} catch (e) {
				return String(a);
			}
		})
		.join(' ');
}

export const debug: LogFn = (...args: unknown[]) => {
	if (isDev) console.debug('[debug]', ...args);
};

export const info: LogFn = (...args: unknown[]) => {
	console.log('[info]', ...args);
};

export const warn: LogFn = (...args: unknown[]) => {
	console.warn('[warn]', ...args);
};

export const error: LogFn = (...args: unknown[]) => {
	// Always output to console for visibility
	console.error('[error]', ...args);

	// Also append to the error log file asynchronously to avoid blocking
	const timestamp = new Date().toISOString();
	const msg = `[${timestamp}] ${formatForLog(args)}\n`;
	fs.promises.appendFile(errorLogFile, msg).catch((err) => {
		// Best-effort: if file write fails, log to console but don't throw
		console.error('logger: failed to write to error log file', err);
	});
};

/**
 * Start a high-resolution timer with the given label. If no label is provided,
 * a default label of 'default' is used.
 */
export const time = (label: TimeLabel = 'default'): void => {
	try {
		timers.set(label, process.hrtime.bigint());
	} catch (e) {
		// Fallback to Date.now if hrtime is not available
		timers.set(label, BigInt(Date.now()));
	}
};

/**
 * End a timer previously started with `time(label)` and log the elapsed time.
 * If the timer was not started, a warning is emitted.
 */
export const timeEnd = (label: TimeLabel = 'default'): void => {
	const start = timers.get(label);
	if (!start) {
		warn(`timeEnd called for unknown label: ${String(label)}`);
		return;
	}
	timers.delete(label);
	let elapsedMs: number;
	try {
		const end = process.hrtime.bigint();
		// convert nanoseconds to milliseconds with fractional precision
		elapsedMs = Number((end - start) / BigInt(1_000_000));
	} catch (e) {
		// If hrtime not available, assume values are Date.now() in ms
		const endMs = Date.now();
		elapsedMs = endMs - Number(start);
	}
	info(`(timer) ${String(label)}: ${elapsedMs}ms`);
};

export default { debug, info, warn, error, time, timeEnd };
