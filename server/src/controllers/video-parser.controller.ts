/**
 * 视频解析控制器
 */
import { Request, Response } from 'express';
import { parseVideoUrl, identifyPlatform } from '../services/video-parser.service.js';
import { success, error } from '../middleware/errorHandler.js';

/** 解析视频URL */
export async function parseVideo(req: Request, res: Response): Promise<void> {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    res.status(400).json(error('缺少url参数'));
    return;
  }

  const platform = identifyPlatform(url);
  if (!platform) {
    res.status(400).json(error('无法识别的平台URL，支持：抖音、快手、B站、小红书、微博'));
    return;
  }

  const result = await parseVideoUrl(url);
  if (result.success) {
    res.json(success(result));
  } else {
    res.status(422).json(error(result.errorMsg || '解析失败'));
  }
}

/** 预检URL（仅识别平台，不实际解析） */
export function checkUrl(req: Request, res: Response): void {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    res.status(400).json(error('缺少url参数'));
    return;
  }
  const platform = identifyPlatform(url);
  res.json(success({ platform, supported: !!platform }));
}