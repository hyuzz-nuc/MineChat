/**
 * 账号绑定控制器
 * 处理验证码发送、绑定、解绑的HTTP请求
 */
import { Request, Response } from 'express';
import * as bindService from '../services/bind.service.js';
import { success } from '../middleware/errorHandler.js';

/** 发送验证码 */
export async function sendCode(req: Request, res: Response): Promise<void> {
  const { type, target, purpose } = req.body;
  await bindService.sendBindCode(req.user!.userId, type, target, purpose);
  res.json(success(null, '验证码已发送'));
}

/** 绑定邮箱/手机号 */
export async function bind(req: Request, res: Response): Promise<void> {
  const { type, target, code } = req.body;
  const result = await bindService.bindAccount(req.user!.userId, type, target, code);
  res.json(success(result, '绑定成功'));
}

/** 解绑邮箱/手机号 */
export async function unbind(req: Request, res: Response): Promise<void> {
  const { type, code } = req.body;
  await bindService.unbindAccount(req.user!.userId, type, code);
  res.json(success(null, '解绑成功'));
}
