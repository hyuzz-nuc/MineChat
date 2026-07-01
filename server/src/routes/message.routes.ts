/**
 * 消息相关路由
 */
import { Router, type Router as RouterType } from 'express';
import * as messageController from '../controllers/message.controller.js';
import { authGuard } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendMessageSchema, createDirectRoomSchema } from '../validators/message.js';

const router: RouterType = Router();

// 所有消息路由都需要鉴权
router.use(authGuard);

// 会话列表
router.get('/conversations', asyncHandler(messageController.getConversations));

// 创建私聊房间
router.post('/rooms/direct', validate(createDirectRoomSchema), asyncHandler(messageController.createDirectRoom));

// 发送消息
router.post('/messages', validate(sendMessageSchema), asyncHandler(messageController.sendMessage));

// 获取房间消息
router.get('/rooms/:roomId/messages', asyncHandler(messageController.getRoomMessages));

// 标记已读
router.patch('/rooms/:roomId/read', asyncHandler(messageController.markRead));

export default router;
