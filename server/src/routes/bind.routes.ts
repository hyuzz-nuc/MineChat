/**
 * 账号绑定相关路由
 */
import { Router, type Router as RouterType } from 'express';
import * as bindController from '../controllers/bind.controller.js';
import { authGuard } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { sendCodeSchema, bindSchema, unbindSchema } from '../validators/bind.js';

const router: RouterType = Router();

// 需要鉴权的路由
router.post('/auth/send-code', authGuard, validate(sendCodeSchema), bindController.sendCode);
router.post('/user/bind', authGuard, validate(bindSchema), bindController.bind);
router.post('/user/unbind', authGuard, validate(unbindSchema), bindController.unbind);

export default router;
