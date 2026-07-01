/**
 * 好友相关请求验证
 */
import { z } from 'zod';

/** 发送好友请求验证 */
export const sendRequestSchema = z.object({
  targetUserId: z.string().min(1, '目标用户ID不能为空'),
});

/** 处理好友请求验证（路由参数） */
export const handleRequestSchema = z.object({
  friendshipId: z.string().min(1, '好友请求ID不能为空'),
});

/** 导出类型 */
export type SendRequestInput = z.infer<typeof sendRequestSchema>;
export type HandleRequestInput = z.infer<typeof handleRequestSchema>;
