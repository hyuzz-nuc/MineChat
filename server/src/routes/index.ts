import { Router, Request, Response } from 'express';
import { success } from '../middleware/errorHandler.js';

const router = Router();

/** 健康检查 */
router.get('/health', (_req: Request, res: Response) => {
  res.json(success({ status: 'ok', timestamp: new Date().toISOString() }));
});

export default router;
