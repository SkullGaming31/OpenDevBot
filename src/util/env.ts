// Lightweight environment helpers (no DB or heavy imports) to avoid side-effects on import
export const ENVIRONMENT: string = (process.env.Enviroment || process.env.Env || process.env.Environment || process.env.NODE_ENV || 'dev') as string;

export function isProd(): boolean { return ENVIRONMENT === 'prod'; }
export function isDev(): boolean { return ENVIRONMENT === 'dev'; }
export function isDebug(): boolean { return ENVIRONMENT === 'debug'; }

export default ENVIRONMENT;
