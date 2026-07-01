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

/** 解析视频URL */
export function parseVideoApi(url: string) {
  return request.post<{ code: number; data: ParseResult }>('/parse/video', { url });
}

/** 预检URL */
export function checkVideoUrlApi(url: string) {
  return request.post<{ code: number; data: { platform: string | null; supported: boolean } }>('/parse/check', { url });
}