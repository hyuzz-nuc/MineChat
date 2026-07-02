/**
 * 视频解析控制器
 */
import { Request, Response } from 'express';
import { parseVideoUrl, identifyPlatform } from '../services/video-parser.service.js';
import { parseBaiduShare, isBaiduShareUrl } from '../services/baidu-drive.service.js';
import { parseQuarkShare, isQuarkShareUrl } from '../services/quark-drive.service.js';
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
  // 识别短视频平台
  let platform = identifyPlatform(url);
  let driveType: string | null = null;
  // 识别网盘
  if (isBaiduShareUrl(url)) { platform = '百度网盘'; driveType = 'baidu'; }
  if (isQuarkShareUrl(url)) { platform = '夸克网盘'; driveType = 'quark'; }
  res.json(success({ platform, supported: !!platform, driveType }));
}

/** 解析网盘分享链接 */
export async function parseDrive(req: Request, res: Response): Promise<void> {
  const { url, pwd, cookie } = req.body;
  if (!url || typeof url !== 'string') {
    res.status(400).json(error('缺少url参数'));
    return;
  }
  if (!cookie || typeof cookie !== 'string') {
    res.status(400).json(error('缺少cookie参数，请提供网盘Cookie'));
    return;
  }
  const extractCode = pwd || '';

  // 百度网盘
  if (isBaiduShareUrl(url)) {
    const result = await parseBaiduShare(url, extractCode, cookie);
    if (result.success) {
      res.json(success(result));
    } else {
      res.status(422).json(error(result.errorMsg || '百度网盘解析失败'));
    }
    return;
  }

  // 夸克网盘
  if (isQuarkShareUrl(url)) {
    const result = await parseQuarkShare(url, extractCode, cookie);
    if (result.success) {
      res.json(success(result));
    } else {
      res.status(422).json(error(result.errorMsg || '夸克网盘解析失败'));
    }
    return;
  }

  res.status(400).json(error('无法识别的网盘链接，支持：百度网盘、夸克网盘'));
}