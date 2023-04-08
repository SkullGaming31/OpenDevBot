import { Request, Response, NextFunction } from 'express';

export function logger(err: Error, req: Request, res: Response, next: NextFunction) {
	// if (err) throw err;
	console.log(`${req.method} ${req.url}: ${req.ip}`);
	next(err);
}