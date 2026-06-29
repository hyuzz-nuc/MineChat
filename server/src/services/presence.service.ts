/**
 * 在线状态服务 — 基于 Redis 实现
 *
 * 数据结构：
 *   presence:online          — SET, 所有在线userId
 *   presence:{userId}:sockets — SET, 该用户的所有socketId
 *   presence:{userId}:status  — STRING, 用户自定义状态 (ONLINE/ BUSY/ AWAY)
 *
 * 优势：多进程共享、重启不丢失、支持集群部署
 */
import redis from '../config/redis.js';
import { logger } from '../utils/logger.js';

const ONLINE_KEY = 'presence:online';

/** 用户上线：添加 socketId 到用户集合 */
export async function userOnline(userId: string, socketId: string): Promise<void> {
  const pipeline = redis.pipeline();
  pipeline.sadd(ONLINE_KEY, userId);
  pipeline.sadd(`presence:${userId}:sockets`, socketId);
  pipeline.set(`presence:${userId}:status`, 'ONLINE');
  await pipeline.exec();
}

/** 用户断开连接：移除 socketId，无剩余连接则下线 */
export async function userOffline(userId: string, socketId: string): Promise<boolean> {
  // 从用户socket集合中移除
  await redis.srem(`presence:${userId}:sockets`, socketId);

  // 检查是否还有剩余连接
  const remaining = await redis.scard(`presence:${userId}:sockets`);
  if (remaining === 0) {
    // 完全下线
    const pipeline = redis.pipeline();
    pipeline.srem(ONLINE_KEY, userId);
    pipeline.del(`presence:${userId}:sockets`);
    pipeline.del(`presence:${userId}:status`);
    await pipeline.exec();
    return true; // 表示完全离线
  }
  return false; // 还有其他连接在线
}

/** 检查用户是否在线 */
export async function isUserOnline(userId: string): Promise<boolean> {
  return (await redis.sismember(ONLINE_KEY, userId)) === 1;
}

/** 获取所有在线用户ID */
export async function getOnlineUserIds(): Promise<string[]> {
  return redis.smembers(ONLINE_KEY);
}

/** 获取用户的在线状态 */
export async function getUserStatus(userId: string): Promise<string> {
  const status = await redis.get(`presence:${userId}:status`);
  return status || 'OFFLINE';
}

/** 设置用户自定义状态 (ONLINE/BUSY/AWAY) */
export async function setUserStatus(userId: string, status: string): Promise<void> {
  if (status === 'OFFLINE') {
    // 不通过这个方法设离线，走 userOffline
    return;
  }
  await redis.set(`presence:${userId}:status`, status);
}
