/**
 * 视频解析API
 */
import request from './request';

export interface ParseResult {
  success: boolean;
  platform: string;
  title?: string;
  coverUrl?: string;
  videoUrl?: string;
  videoType?: 'mp4' | 'm3u8' | 'webm';
  errorMsg?: string;
}

export interface DriveFile {
  fsId?: string;
  fid?: string;
  serverFilename?: string;
  fileName?: string;
  size: number;
  isDir: boolean;
  category?: number;
  fileType?: string;
  videoUrl?: string;
}

export interface DriveParseResult {
  success: boolean;
  platform: string;
  files: DriveFile[];
  errorMsg?: string;
}

/** 解析短视频URL */
export function parseVideoApi(url: string) {
  return request.post<{ code: number; data: ParseResult }>('/parse/video', { url });
}

/** 预检URL（识别平台+网盘类型） */
export function checkVideoUrlApi(url: string) {
  return request.post<{ code: number; data: { platform: string | null; supported: boolean; driveType?: string } }>('/parse/check', { url });
}

/** 解析网盘分享链接 */
export function parseDriveApi(url: string, pwd: string, cookie: string) {
  return request.post<{ code: number; data: DriveParseResult }>('/parse/drive', { url, pwd, cookie });
}