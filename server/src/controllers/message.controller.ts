/**
 * 消息控制器
 */
import { Request, Response } from 'express';
import * as messageService from '../services/message.service.js';
import { success } from '../middleware/errorHandler.js';

/** 发送消息 */
export async function sendMessage(req: Request, res: Response): Promise<void> {
  const { roomId, type, content, replyTo } = req.body;
  const message = await messageService.sendMessage(
    req.user!.userId,
    roomId,
    type || 'TEXT',
    content,
    replyTo,
  );
  res.status(201).json(success(message, '发送成功'));
}

/** 获取房间消息 */
export async function getRoomMessages(req: Request, res: Response): Promise<void> {
  const roomId = req.params.roomId as string;
  const cursor = req.query.cursor as string | undefined;
  const limit = parseInt(req.query.limit as string) || 30;
  const messages = await messageService.getRoomMessages(
    req.user!.userId,
    roomId,
    cursor,
    limit,
  );
  res.json(success(messages));
}

/** 标记消息已读 */
export async function markRead(req: Request, res: Response): Promise<void> {
  const roomId = req.params.roomId as string;
  await messageService.markMessagesRead(req.user!.userId, roomId);
  res.json(success(null, '已标记已读'));
}

/** 获取会话列表 */
export async function getConversations(req: Request, res: Response): Promise<void> {
  const conversations = await messageService.getConversations(req.user!.userId);
  res.json(success(conversations));
}

/** 创建私聊房间 */
export async function createDirectRoom(req: Request, res: Response): Promise<void> {
  const { targetUserId } = req.body;
  const result = await messageService.createDirectRoom(req.user!.userId, targetUserId);
  res.status(result.isNew ? 201 : 200).json(success(result, result.isNew ? '创建成功' : '房间已存在'));
}
