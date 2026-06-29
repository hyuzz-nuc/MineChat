/**
 * 好友相关路由
 */
import { Router, type Router as RouterType } from 'express';
import * as friendController from '../controllers/friend.controller.js';
import { authGuard } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';

const router: RouterType = Router();

router.use(authGuard);

/** 发送好友请求 */
router.post(
  '/friends/request',
  validate(z.object({ targetUserId: z.string().min(1) })),
  friendController.sendRequest,
);

/** 同意好友请求 */
router.patch('/friends/:friendshipId/accept', friendController.acceptRequest);

/** 拒绝好友请求 */
router.patch('/friends/:friendshipId/reject', friendController.rejectRequest);

/** 获取好友列表 */
router.get('/friends', friendController.getFriendList);

/** 获取待处理好友请求 */
router.get('/friends/pending', friendController.getPendingRequests);

export default router;
