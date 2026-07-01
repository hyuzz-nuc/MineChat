/**
 * 短视频直链解析服务
 * 服务端代理请求分享页面HTML，解析提取视频直链URL
 * 支持：抖音、快手、B站、小红书、微博视频
 */

import { logger } from '../utils/logger.js';

export interface ParseResult {
  success: boolean;
  platform: string;
  title?: string;
  coverUrl?: string;
  videoUrl?: string;
  videoType?: 'mp4' | 'm3u8' | 'webm';
  errorMsg?: string;
}

interface PlatformDef {
  name: string;
  patterns: RegExp[];
  parser: (html: string, url: string) => ParseResult;
}

const PLATFORMS: PlatformDef[] = [
  { name: '抖音', patterns: [/https?:\/\/v\.douyin\.com\/\w+/, /https?:\/\/www\.douyin\.com\/video\/\d+/], parser: parseDouyin },
  { name: '快手', patterns: [/https?:\/\/v\.kuaishou\.com\/\w+/, /https?:\/\/www\.kuaishou\.com\/short-video\/\w+/], parser: parseKuaishou },
  { name: 'B站', patterns: [/https?:\/\/www\.bilibili\.com\/video\/BV\w+/, /https?:\/\/b23\.tv\/\w+/, /https?:\/\/www\.bilibili\.com\/video\/av\d+/], parser: parseBilibili },
  { name: '小红书', patterns: [/https?:\/\/www\.xiaohongshu\.com\/(?:discovery|explore)\/\w+/, /https?:\/\/xhslink\.com\/\w+/], parser: parseXiaohongshu },
  { name: '微博', patterns: [/https?:\/\/weibo\.com\/\d+\/\w+/, /https?:\/\/video\.weibo\.com\/\w+/], parser: parseWeibo },
];

/** 识别平台 */
export function identifyPlatform(url: string): string | null {
  for (const p of PLATFORMS) {
    for (const r of p.patterns) {
      if (r.test(url)) return p.name;
    }
  }
  return null;
}

/** 主解析入口 */
export async function parseVideoUrl(url: string): Promise<ParseResult> {
  const platform = identifyPlatform(url);
  if (!platform) {
    return { success: false, platform: '未知', errorMsg: '无法识别的平台，支持：抖音、快手、B站、小红书、微博' };
  }

  logger.info(`[VideoParser] 解析 ${platform}: ${url}`);

  try {
    const html = await fetchPage(url);
    const def = PLATFORMS.find(p => p.name === platform)!;
    const result = def.parser(html, url);

    // 专属解析器失败，尝试通用提取
    if (!result.success && !result.videoUrl) {
      const generic = genericParser(html);
      if (generic.videoUrl) {
        return { ...generic, platform, success: true };
      }
    }

    // URL解码
    if (result.videoUrl) {
      result.videoUrl = safeDecode(result.videoUrl);
    }

    logger.info(`[VideoParser] 结果: ${result.success ? '成功' : '失败'} ${result.videoUrl || result.errorMsg || ''}`);
    return { ...result, platform };
  } catch (err: any) {
    logger.error(`[VideoParser] 异常: ${err.message}`);
    return { success: false, platform, errorMsg: `请求失败: ${err.message}` };
  }
}

/** 代理请求页面 */
async function fetchPage(url: string): Promise<string> {
  const resp = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      'Accept': 'text/html,application/xhtml+xml,*/*',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Referer': url,
    },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return await resp.text();
}

/** 安全解码URL */
function safeDecode(url: string): string {
  try {
    let d = url;
    for (let i = 0; i < 3; i++) { const p = d; d = decodeURIComponent(d); if (d === p) break; }
    return d.replace(/&?(?:wm|watermark|logo)=\w+/g, '');
  } catch { return url; }
}

/** 提取标题 */
function extractTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/);
  if (m) return m[1].trim();
  const m2 = html.match(/"(?:desc|title)":\s*"([^"]+)"/);
  return m2 ? m2[1].trim() : undefined;
}

/** 通用视频URL提取 */
function genericParser(html: string): ParseResult {
  const regexes = [
    /"(?:playAddr|play_addr|video_url|src)":\s*"(https?:[^"]+\.(?:mp4|m3u8|webm)[^"]*)"/,
    /<video[^>]*src="(https?:[^"]+\.(?:mp4|m3u8|webm)[^"]*)"/,
    /<(?:source)[^>]*src="(https?:[^"]+\.(?:mp4|m3u8|webm)[^"]*)"/,
    /https?:[^"'\s]+\.(?:mp4|m3u8|webm)[^"'\s]*/g,
  ];
  for (const r of regexes) {
    const m = html.match(r);
    if (m) {
      const vUrl = (m[1] || m[0]).replace(/\\u002F/g, '/').replace(/\\/g, '');
      const ext = vUrl.match(/\.(mp4|m3u8|webm)/)?.[1] || 'mp4';
      return { success: true, platform: '通用', videoUrl: vUrl, videoType: ext as any, title: extractTitle(html) };
    }
  }
  return { success: false, platform: '通用', errorMsg: '未能提取视频直链' };
}

/** 深层搜索JSON对象 */
function deepFind(obj: any, keys: string[], depth = 5): any {
  if (!obj || typeof obj !== 'object' || depth <= 0) return undefined;
  for (const k of keys) { if (obj[k] !== undefined) return obj[k]; }
  for (const v of Object.values(obj)) {
    const f = deepFind(v, keys, depth - 1);
    if (f !== undefined) return f;
  }
  return undefined;
}

function extractVideoStr(val: any): string | undefined {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object') return val.url || val.src || val.master_url || val.stream_url;
  return undefined;
}

// ── 平台解析器 ──

function parseDouyin(html: string, url: string): ParseResult {
  // 尝试RENDER_DATA
  const m1 = html.match(/<script[^>]*id="RENDER_DATA"[^>]*>([^<]+)<\/script>/);
  if (m1) {
    try {
      const data = JSON.parse(decodeURIComponent(m1[1]));
      const v = deepFind(data, ['playAddr', 'play_addr', 'video_url', 'download_url']);
      const s = extractVideoStr(v);
      if (s) return { success: true, platform: '抖音', videoUrl: s, videoType: 'mp4', title: deepFind(data, ['desc', 'title']) };
    } catch { /* */ }
  }
  // 尝试ROUTER_DATA
  const m2 = html.match(/window\._ROUTER_DATA\s*=\s*(\{.+?\})\s*;/);
  if (m2) {
    try {
      const data = JSON.parse(m2[1]);
      const v = deepFind(data, ['playAddr', 'play_addr', 'video_url']);
      const s = extractVideoStr(v);
      if (s) return { success: true, platform: '抖音', videoUrl: s, videoType: 'mp4', title: deepFind(data, ['desc', 'title']) };
    } catch { /* */ }
  }
  return { success: false, platform: '抖音', errorMsg: '抖音页面结构变化，未能提取视频地址' };
}

function parseKuaishou(html: string, url: string): ParseResult {
  const m = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.+?\})\s*;/);
  if (m) {
    try {
      const data = JSON.parse(m[1]);
      const v = deepFind(data, ['playAddr', 'photoUrl', 'video_url', 'srcNoMark']);
      const s = extractVideoStr(v);
      if (s) return { success: true, platform: '快手', videoUrl: s, videoType: 'mp4', title: deepFind(data, ['caption', 'title']) };
    } catch { /* */ }
  }
  return { success: false, platform: '快手', errorMsg: '快手页面结构变化，未能提取视频地址' };
}

function parseBilibili(html: string, url: string): ParseResult {
  const m = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.+?\})\s*;/);
  if (m) {
    try {
      const data = JSON.parse(m[1]);
      const vd = data?.videoData;
      if (vd) {
        const bvid = vd.bvid || url.match(/BV\w+/)?.[0];
        const cid = vd.cid;
        if (bvid && cid) {
          const playUrl = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=64&fnval=16`;
          return { success: true, platform: 'B站', videoUrl: playUrl, videoType: 'm3u8', title: vd.title, coverUrl: vd.pic };
        }
      }
    } catch { /* */ }
  }
  return { success: false, platform: 'B站', errorMsg: 'B站页面结构变化，未能提取视频信息' };
}

function parseXiaohongshu(html: string, url: string): ParseResult {
  const m = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.+?\})\s*;/);
  if (m) {
    try {
      const data = JSON.parse(m[1]);
      const note = deepFind(data, ['noteDetailMap', 'note', 'video']);
      if (note) {
        const v = deepFind(note, ['originVideoKey', 'url', 'stream', 'master_url']);
        const s = extractVideoStr(v);
        if (s) return { success: true, platform: '小红书', videoUrl: s, videoType: 'mp4', title: deepFind(note, ['title', 'desc']) };
      }
    } catch { /* */ }
  }
  return { success: false, platform: '小红书', errorMsg: '小红书页面结构变化，未能提取视频地址' };
}

function parseWeibo(html: string, url: string): ParseResult {
  const m = html.match(/\$VIDEO_DATA\s*=\s*(\{.+?\})\s*;/);
  if (m) {
    try {
      const data = JSON.parse(m[1]);
      const v = data?.video_url || data?.mp4_720p_mp4 || data?.mp4_hd_mp4;
      if (v) return { success: true, platform: '微博', videoUrl: v, videoType: 'mp4', title: data?.title };
    } catch { /* */ }
  }
  return { success: false, platform: '微博', errorMsg: '微博页面结构变化，未能提取视频地址' };
}