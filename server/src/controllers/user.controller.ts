/**
 * 用户控制器
 * 处理HTTP请求，调用service层
 */
import { Request, Response } from 'express';
import * as userService from '../services/user.service.js';
import { success } from '../middleware/errorHandler.js';

/** 注册 */
export async function register(req: Request, res: Response): Promise<void> {
  const result = await userService.register(req.body);
  res.status(201).json(success(result, '注册成功'));
}

/** 登录 */
export async function login(req: Request, res: Response): Promise<void> {
  const { account, password } = req.body;
  const result = await userService.login(account, password);
  res.json(success(result, '登录成功'));
}

/** 刷新令牌 */
export async function refreshToken(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  const result = await userService.refreshAccessToken(refreshToken);
  res.json(success(result, '刷新成功'));
}

/** 获取当前用户信息 */
export async function getProfile(req: Request, res: Response): Promise<void> {
  const result = await userService.getUserProfile(req.user!.userId);
  res.json(success(result));
}

/** 更新用户信息 */
export async function updateProfile(req: Request, res: Response): Promise<void> {
  const { nickname, avatar, bio } = req.body;
  const result = await userService.updateUserProfile(req.user!.userId, { nickname, avatar, bio });
  res.json(success(result, '更新成功'));
}

/** 搜索用户 */
export async function searchUsers(req: Request, res: Response): Promise<void> {
  const keyword = (req.query.keyword as string) || '';
  if (!keyword) {
    res.json(success([]));
    return;
  }
  const result = await userService.searchUsers(keyword, req.user!.userId);
  res.json(success(result));
}
