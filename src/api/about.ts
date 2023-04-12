import { Request, Response, Router } from 'express';

export const aboutRouter = Router();

aboutRouter.get('/', (req: Request, res: Response) => { res.json({ msg: 'This is the About page' }); });