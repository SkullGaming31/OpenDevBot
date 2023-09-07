import { NextFunction, Request, Response } from 'express';

function logger(err: Error, req: Request, res: Response, next: NextFunction) {
	// if (err) throw err;
	console.log(`${req.method} ${req.url}: ${req.ip}`);
	next(err);
}

function notFound(req: Request, res: Response, next: NextFunction) {
	const error = new Error(`Not Found ${req.originalUrl}`);
	res.status(404);
	next(error);
}

function errorHandler(error: Error, req: Request, res: Response, next: NextFunction) {
	const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
	res.status(statusCode);
	res.json({
		status: statusCode,
		name: error.name,
		message: error.message,
		stack: process.env.Enviroment === 'prod' ? '🥞' : error.stack
	});
}

export default {
	logger,
	notFound,
	errorHandler
};