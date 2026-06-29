/**
 * 鉴权中间件
 * 验证 Access Token，将用户信息注入 req.user
 */
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../utils/auth.js';
import { AppError } from './errorHandler.js';

/** 扩展 Express Request 类型 */
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

/** 从请求头提取token */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

/** 鉴权守卫中间件 */
export function authGuard(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    throw new AppError(401, '未提供认证令牌', 40101);
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    throw new AppError(401, '认证令牌无效或已过期', 40102);
  }
}

/** 可选鉴权（有token就解析，没有也放行） */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.user = payload;
    } catch {
      // token无效时忽略，不阻断请求
    }
  }
  next();
}
