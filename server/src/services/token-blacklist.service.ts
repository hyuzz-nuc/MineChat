/**
 * Token 黑名单服务 — 基于 Redis 实现
 *
 * 使用场景：用户登出、修改密码、管理员踢人
 * 将 refreshToken 的 jti 加入黑名单，TTL 设为 token 剩余过期时间
 *
 * 数据结构：
 *   token:blacklist:{jti} — STRING, value=1, TTL=token剩余有效期
 */
import redis from '../config/redis.js';

const BLACKLIST_PREFIX = 'token:blacklist:';

/** 将 Token 加入黑名单 */
export async function blacklistToken(jti: string, expiresAt: number): Promise<void> {
  const ttlMs = expiresAt - Date.now();
  if (ttlMs <= 0) return; // 已过期的不需要加黑名单

  // Redis TTL 单位是秒，向上取整
  const ttlSec = Math.ceil(ttlMs / 1000);
  await redis.set(`${BLACKLIST_PREFIX}${jti}`, '1', 'EX', ttlSec);
}

/** 检查 Token 是否在黑名单中 */
export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const result = await redis.exists(`${BLACKLIST_PREFIX}${jti}`);
  return result === 1;
}
