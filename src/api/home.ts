import { Request, Response, Router } from 'express';

export const homeRouter = Router();

homeRouter.get('/', (req: Request, res: Response) => { res.json({ msg: 'This is the home page' }); });