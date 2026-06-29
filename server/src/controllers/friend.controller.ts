/**
 * 好友控制器
 */
import { Request, Response } from 'express';
import * as friendService from '../services/friend.service.js';
import { success } from '../middleware/errorHandler.js';

/** 发送好友请求 */
export async function sendRequest(req: Request, res: Response): Promise<void> {
  const { targetUserId } = req.body;
  const result = await friendService.sendFriendRequest(req.user!.userId, targetUserId);
  res.status(201).json(success(result, '好友请求已发送'));
}

/** 同意好友请求 */
export async function acceptRequest(req: Request, res: Response): Promise<void> {
  const friendshipId = req.params.friendshipId as string;
  const result = await friendService.acceptFriendRequest(req.user!.userId, friendshipId);
  res.json(success(result, '已添加好友'));
}

/** 拒绝好友请求 */
export async function rejectRequest(req: Request, res: Response): Promise<void> {
  const friendshipId = req.params.friendshipId as string;
  const result = await friendService.rejectFriendRequest(req.user!.userId, friendshipId);
  res.json(success(result, '已拒绝'));
}

/** 获取好友列表 */
export async function getFriendList(req: Request, res: Response): Promise<void> {
  const result = await friendService.getFriendList(req.user!.userId);
  res.json(success(result));
}

/** 获取待处理好友请求 */
export async function getPendingRequests(req: Request, res: Response): Promise<void> {
  const result = await friendService.getPendingRequests(req.user!.userId);
  res.json(success(result));
}
