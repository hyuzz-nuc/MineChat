/**
 * 好友相关路由
 */
import { Router, type Router as RouterType } from 'express';
import * as friendController from '../controllers/friend.controller.js';
import { authGuard } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendRequestSchema } from '../validators/friend.js';

const router: RouterType = Router();

router.post('/friend/request', authGuard, validate(sendRequestSchema), asyncHandler(friendController.sendRequest));
router.post('/friend/accept/:friendshipId', authGuard, asyncHandler(friendController.acceptRequest));
router.post('/friend/reject/:friendshipId', authGuard, asyncHandler(friendController.rejectRequest));
router.get('/friend/list', authGuard, asyncHandler(friendController.getFriendList));
router.get('/friend/requests/received', authGuard, asyncHandler(friendController.getReceivedRequests));
router.get('/friend/requests/sent', authGuard, asyncHandler(friendController.getSentRequests));

export default router;
