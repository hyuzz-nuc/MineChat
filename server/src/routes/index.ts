/**
 * 路由入口
 * 统一注册所有API路由
 */
import { Router, type Router as RouterType, Request, Response } from 'express';
import { success } from '../middleware/errorHandler.js';
import userRoutes from './user.routes.js';
import messageRoutes from './message.routes.js';
import friendRoutes from './friend.routes.js';

const router: RouterType = Router();

/** 健康检查 */
router.get('/health', (_req: Request, res: Response) => {
  res.json(success({ status: 'ok', timestamp: new Date().toISOString() }));
});

/** 用户相关路由 */
router.use(userRoutes);

/** 消息相关路由 */
router.use(messageRoutes);

/** 好友相关路由 */
router.use(friendRoutes);

export default router;
