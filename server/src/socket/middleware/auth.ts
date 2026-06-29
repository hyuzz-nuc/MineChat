/**
 * Socket.IO 鉴权中间件
 * 验证WebSocket连接的token
 */
import { Socket } from 'socket.io';
import { verifyAccessToken } from '../../utils/auth.js';
import { logger } from '../../utils/logger.js';

/** 扩展Socket类型 */
declare module 'socket.io' {
  interface Socket {
    userId?: string;
    username?: string;
  }
}

/** Socket鉴权中间件 */
export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void): void {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;

  if (!token || typeof token !== 'string') {
    logger.warn(`Socket连接拒绝：未提供token - ${socket.id}`);
    next(new Error('未提供认证令牌'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    socket.userId = payload.userId;
    socket.username = payload.username;
    next();
  } catch {
    logger.warn(`Socket连接拒绝：token无效 - ${socket.id}`);
    next(new Error('认证令牌无效'));
  }
}
