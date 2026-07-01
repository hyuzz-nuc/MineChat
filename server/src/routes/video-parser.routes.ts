/**
 * 视频解析路由
 */
import { Router, type Router as RouterType } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { parseVideo, checkUrl } from '../controllers/video-parser.controller.js';

const router: RouterType = Router();

/** 解析视频URL，提取直链 */
router.post('/parse/video', asyncHandler(parseVideo));

/** 预检URL（仅识别平台） */
router.post('/parse/check', checkUrl);

export default router;