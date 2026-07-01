/**
 * 用户相关路由
 * 使用 asyncHandler 包装所有 async controller，防止异步错误导致进程崩溃
 */
import { Router, type Router as RouterType } from 'express';
import * as userController from '../controllers/user.controller.js';
import { authGuard } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { registerSchema, loginSchema, refreshTokenSchema, sendLoginCodeSchema, loginByCodeSchema } from '../validators/auth.js';

const router: RouterType = Router();

// 公开路由
router.post('/auth/register', validate(registerSchema), asyncHandler(userController.register));
router.post('/auth/login', validate(loginSchema), asyncHandler(userController.login));
router.post('/auth/refresh', validate(refreshTokenSchema), asyncHandler(userController.refreshToken));
router.post('/auth/send-login-code', validate(sendLoginCodeSchema), asyncHandler(userController.sendLoginCode));
router.post('/auth/login-by-code', validate(loginByCodeSchema), asyncHandler(userController.loginByCode));

// 需要鉴权的路由
router.get('/user/profile', authGuard, asyncHandler(userController.getProfile));
router.patch('/user/profile', authGuard, asyncHandler(userController.updateProfile));
router.get('/user/search', authGuard, asyncHandler(userController.searchUsers));

export default router;
