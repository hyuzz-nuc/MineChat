/**
 * 请求参数验证中间件
 * 配合 Zod schema 使用
 */
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './errorHandler.js';

/** 创建验证中间件 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const result = schema.parse(req.body);
      req.body = result; // 用验证后的数据替换原始body（去除多余字段）
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        throw new AppError(400, messages, 40001);
      }
      throw err;
    }
  };
}
