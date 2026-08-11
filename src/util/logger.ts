/* Minimal logger wrapper that supports levels, respects ENVIRONMENT, and writes errors to a file */
/* eslint-disable no-console */
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

type LogFn = (...args: unknown[]) => void;

type TimeLabel = string | number | symbol;

// store high-resolution timers
const timers = new Map<TimeLabel, bigint>();

const isDev = process.env.ENVIRONMENT === 'dev' || process.env.ENVIRONMENT === 'debug';

// Emits a 'log' event with `{ level, message, timestamp }` for every call that
// actually logs (i.e. respects the same level gating as console output).
// Consumers — e.g. the Electron logs window — subscribe to this instead of
// scraping stdout.
export const logEvents = new EventEmitter();
logEvents.setMaxListeners(50);

// Capture initial LOG_LEVEL at module load time. Tests set this before requiring the module.
const initialEnvLevel = process.env.LOG_LEVEL ? String(process.env.LOG_LEVEL).toLowerCase() : '';

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
			// Errors get special formatting including stack
			if (a instanceof Error) {
				const err = a as Error;
				const raw = `${err.name}: ${err.message}\n${err.stack ?? ''}`;
				return sanitizeString(raw);
			}

			// Try to produce a JSON representation first. If that fails
			// (e.g., circular structures), fall back to String(a) which
			// tests expect to contain '[object Object]'. After obtaining
			// a string, redact any sensitive env values.
			try {
				const s = typeof a === 'string' ? a : JSON.stringify(a);
				return sanitizeString(s);
			} catch (e) {
				return sanitizeString(String(a));
			}
		})
		.join(' ');
}

// Collect likely sensitive values from environment (tokens, secrets, keys, passwords)
const SENSITIVE_ENV_VALUES: string[] = (() => {
	const keys = Object.keys(process.env || {});
	const found = new Set<string>();
	const secretPattern = /TOKEN|SECRET|PASSWORD|API_KEY|KEY|CLIENT_SECRET/i;
	for (const k of keys) {
		if (secretPattern.test(k) || k === 'ADMIN_API_TOKEN') {
			const v = process.env[k];
			if (v) found.add(String(v));
		}
	}
	return Array.from(found).filter(s => s.length > 0);
})();

function escapeRegExp(s: string) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeString(s: string): string {
	if (!s || SENSITIVE_ENV_VALUES.length === 0) return s;
	let out = s;
	for (const secret of SENSITIVE_ENV_VALUES) {
		if (!secret) continue;
		const re = new RegExp(escapeRegExp(secret), 'g');
		out = out.replace(re, '[REDACTED]');
	}

	// Also redact explicit ADMIN_API_TOKEN mentions or assignments (e.g. "ADMIN_API_TOKEN=..." or "ADMIN_API_TOKEN: ...")
	out = out.replace(/ADMIN_API_TOKEN\s*[:=]\s*\S*/gi, 'ADMIN_API_TOKEN=[REDACTED]');

	// Redact literal occurrences of the key name to avoid accidental exposure
	out = out.replace(/\bADMIN_API_TOKEN\b/gi, '[REDACTED]');

	return out;
}

function sanitizeValue(v: unknown, depth = 0, seen = new WeakSet()): unknown {
	if (depth > 6) return '[Truncated]';
	if (v == null) return v;
	if (typeof v === 'string') return sanitizeString(v);
	if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'symbol' || typeof v === 'bigint') return v;
	if (v instanceof Error) {
		// sanitize stack/message
		const err = v as Error;
		const msg = sanitizeString(err.message ?? '');
		const stack = sanitizeString(err.stack ?? '');
		const copy = new Error(msg);
		copy.stack = stack;
		return copy;
	}
	if (Array.isArray(v)) return v.map(i => sanitizeValue(i, depth + 1, seen));
	if (typeof v === 'object') {
		try {
			if (seen.has(v as object)) return '[Circular]';
			seen.add(v as object);
			const out: Record<string, unknown> = {};
			for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
				if (typeof val === 'string') out[k] = sanitizeString(val);
				else out[k] = sanitizeValue(val, depth + 1, seen);
			}
			return out;
		} catch (e) {
			return '[Unserializable]';
		}
	}
	return String(v);
}

// Logging level support: debug < info < warn < error
const LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type Level = (typeof LEVELS)[number];

function getCurrentLevel(): Level {
	const envLevel = (process.env.LOG_LEVEL || (isDev ? 'debug' : 'info')).toLowerCase();
	return (LEVELS.includes(envLevel as Level) ? (envLevel as Level) : (isDev ? 'debug' : 'info'));
}

function levelEnabled(level: Level): boolean {
	const idx = LEVELS.indexOf(level);
	const cur = LEVELS.indexOf(getCurrentLevel());
	return idx >= cur;
}

function emitLog(level: Level, args: unknown[]): void {
	try {
		logEvents.emit('log', { level, message: formatForLog(args), timestamp: new Date().toISOString() });
	} catch (e) {
		/* never let a bad listener take down logging */
	}
}

export const debug: LogFn = (...args: unknown[]) => {
	const env = process.env.LOG_LEVEL && String(process.env.LOG_LEVEL).toLowerCase();
	const shouldDebug = initialEnvLevel === 'debug' || env === 'debug' || levelEnabled('debug');
	if (shouldDebug) {
		try {
			const san = args.map(a => sanitizeValue(a));
			if (typeof console.debug === 'function') console.debug('[debug]', ...san);
			else console.log('[debug]', ...san);
		} catch (e) {
			/* ignore */
		}
		emitLog('debug', args.map(a => sanitizeValue(a) as unknown));
	}
};

export const info: LogFn = (...args: unknown[]) => {
	if (levelEnabled('info')) {
		const san = args.map(a => sanitizeValue(a));
		console.log('[info]', ...san);
		emitLog('info', san as unknown[]);
	}
};

export const warn: LogFn = (...args: unknown[]) => {
	if (levelEnabled('warn')) {
		const san = args.map(a => sanitizeValue(a));
		console.warn('[warn]', ...san);
		emitLog('warn', san as unknown[]);
	}
};

export const error: LogFn = (...args: unknown[]) => {
	// Always output to console for visibility
	const san = args.map(a => sanitizeValue(a));
	console.error('[error]', ...san);
	emitLog('error', san as unknown[]);

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

// One-time initialization log to help tests that set LOG_LEVEL before importing.
try {
	if (initialEnvLevel === 'debug') {
		if (typeof console.debug === 'function') console.debug('[logger] initialized (debug)');
		else console.log('[logger] initialized (debug)');
	}
} catch (e) {
	/* ignore */
}