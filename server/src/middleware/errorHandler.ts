import { Request, Response, NextFunction, type RequestHandler } from 'express';
import { logger } from '../utils/logger.js';

/** 统一API响应格式 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
}

/** 成功响应 */
export function success<T>(data: T, message = 'success'): ApiResponse<T> {
  return { code: 0, message, data };
}

/** 错误响应 */
export function error(message: string, code = -1): ApiResponse<null> {
  return { code, message, data: null };
}

/** 自定义业务错误类 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: number = -1,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Async route handler 包装器
 * Express 4 不会自动捕获 async handler 中的错误
 * 此包装器将 async 错误自动传给 next() → errorHandler
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/** 全局错误处理中间件 */
export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    logger.warn(`[${err.code}] ${err.message}`);
    res.status(err.statusCode).json(error(err.message, err.code));
    return;
  }

  // Prisma known request errors (e.g. unique constraint violation)
  if ((err as any).code && typeof (err as any).code === 'string' && (err as any).code.startsWith('P')) {
    logger.error(`Prisma error: ${(err as any).code} - ${err.message}`);
    res.status(400).json(error(err.message || '数据库操作错误', -400));
    return;
  }

  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json(error('服务器内部错误', -500));
}

/** 404处理 */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json(error('接口不存在', -404));
}
