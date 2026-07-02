/**
 * 视频解析路由
 */
import { Router, type Router as RouterType } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { parseVideo, checkUrl, parseDrive } from '../controllers/video-parser.controller.js';

const router: RouterType = Router();

/** 解析短视频URL，提取直链 */
router.post('/parse/video', asyncHandler(parseVideo));

/** 预检URL（识别平台+网盘类型） */
router.post('/parse/check', checkUrl);

/** 解析网盘分享链接（百度/夸克） */
router.post('/parse/drive', asyncHandler(parseDrive));

export default router;