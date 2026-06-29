/**
 * Redis 客户端单例
 * 使用 DB1 隔离 MineChat 数据，避免与其他应用冲突
 *
 * Key 命名规范：
 *   presence:online           — SET, 所有在线userId
 *   presence:{userId}:sockets — SET, 该用户的所有socketId
 *   presence:{userId}:status  — STRING, 用户自定义状态
 *   token:blacklist:{jti}     — Token黑名单 (STRING, TTL=refreshToken过期时间)
 *   rate:{ip}:{path}          — API限流计数 (STRING+TTL)
 */
import Redis, { type RedisOptions } from 'ioredis';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

/** 从 REDIS_URL 解析连接参数，默认 DB1 */
function buildRedisOptions(): RedisOptions {
  const url = new URL(config.redis.url);
  // 从 URL path 解析 db 号，如 redis://localhost:6379/1 → db=1
  const pathSegments = url.pathname.replace(/^\//, '').split('/');
  const db = pathSegments.length > 0 && pathSegments[0]
    ? parseInt(pathSegments[0], 10)
    : 1;

  return {
    host: url.hostname,
    port: parseInt(url.port, 10) || 6379,
    password: url.password || undefined,
    db,
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      const delay = Math.min(times * 200, 5000);
      return delay;
    },
    lazyConnect: true,
  };
}

const globalForRedis = globalThis as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ??
  new Redis(buildRedisOptions());

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

// 连接事件监听
redis.on('connect', () => {
  logger.info('🔴 Redis connected');
});

redis.on('error', (err) => {
  logger.error(`Redis connection error: ${err.message}`);
});

redis.on('reconnecting', () => {
  logger.warn('🔴 Redis reconnecting...');
});

export default redis;
