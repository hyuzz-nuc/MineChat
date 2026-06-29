/**
 * 用户相关路由
 */
import { Router, type Router as RouterType } from 'express';
import * as userController from '../controllers/user.controller.js';
import { authGuard } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/auth.js';

const router: RouterType = Router();

// 公开路由
router.post('/auth/register', validate(registerSchema), userController.register);
router.post('/auth/login', validate(loginSchema), userController.login);
router.post('/auth/refresh', validate(refreshTokenSchema), userController.refreshToken);

// 需要鉴权的路由
router.get('/user/profile', authGuard, userController.getProfile);
router.patch('/user/profile', authGuard, userController.updateProfile);
router.get('/user/search', authGuard, userController.searchUsers);

export default router;
