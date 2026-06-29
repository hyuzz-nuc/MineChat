/**
 * 消息相关请求验证
 */
import { z } from 'zod';

/** 发送消息验证 */
export const sendMessageSchema = z.object({
  roomId: z.string().min(1, '房间ID不能为空'),
  type: z.enum(['TEXT', 'IMAGE', 'FILE', 'SYSTEM']).default('TEXT'),
  content: z.string().min(1, '消息内容不能为空').max(4000, '消息内容最多4000字符'),
  replyTo: z.string().optional(),
});

/** 创建私聊房间验证 */
export const createDirectRoomSchema = z.object({
  targetUserId: z.string().min(1, '目标用户ID不能为空'),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateDirectRoomInput = z.infer<typeof createDirectRoomSchema>;
