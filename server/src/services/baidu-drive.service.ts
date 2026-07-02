/**
 * 百度网盘视频直链解析服务
 * 
 * 原理：用户分享链接+提取码 → 服务端代理获取分享文件列表 → 提取视频直链
 * 需要用户提供的Cookie进行鉴权（非SVIP限速100KB/s）
 */

import { logger } from '../utils/logger.js';

export interface BaiduDriveParseResult {
  success: boolean;
  platform: string;
  files: BaiduDriveFile[];
  errorMsg?: string;
}

export interface BaiduDriveFile {
  fsId: string;
  serverFilename: string;
  size: number;
  isDir: boolean;
  category: number; // 1=视频, 2=音频, 3=图片, 4=文档, 6=其他
  md5: string;
  videoUrl?: string;
}

/** 百度网盘分享链接正则 */
const BAIDU_SHARE_REGEX = [
  /https?:\/\/pan\.baidu\.com\/s\/([\w-]+)/,
  /https?:\/\/pan\.baidu\.com\/share\/init\?surl=([\w-]+)/,
];

/** 提取分享ID */
export function isBaiduShareUrl(url: string): string | null {
  for (const r of BAIDU_SHARE_REGEX) {
    const m = url.match(r);
    if (m) return m[1];
  }
  return null;
}

/**
 * 解析百度网盘分享链接
 * @param shareUrl 分享链接
 * @param pwd 提取码（4位字母数字）
 * @param cookie 用户百度网盘Cookie
 */
export async function parseBaiduShare(shareUrl: string, pwd: string, cookie: string): Promise<BaiduDriveParseResult> {
  const shareId = isBaiduShareUrl(shareUrl);
  if (!shareId) {
    return { success: false, platform: '百度网盘', files: [], errorMsg: '无效的百度网盘分享链接' };
  }

  logger.info(`[BaiduDrive] 开始解析分享: ${shareUrl} pwd=${pwd}`);

  try {
    // 第1步：访问分享页面，获取shareToken
    const shareToken = await getShareToken(shareId, pwd, cookie);
    if (!shareToken) {
      return { success: false, platform: '百度网盘', files: [], errorMsg: '获取分享Token失败，可能是提取码错误或分享已失效' };
    }

    // 第2步：获取文件列表
    const files = await getShareFileList(shareId, shareToken, cookie);
    if (!files || files.length === 0) {
      return { success: false, platform: '百度网盘', files: [], errorMsg: '分享中没有文件或获取文件列表失败' };
    }

    // 第3步：筛选视频文件
    const videoFiles = files.filter(f => f.category === 1 && !f.isDir);
    
    // 第4步：获取视频直链（需要dlink）
    for (const vf of videoFiles) {
      try {
        const dlink = await getFileDlink(vf.fsId, shareId, shareToken, cookie);
        if (dlink) {
          vf.videoUrl = dlink;
        }
      } catch {
        // 单个文件直链获取失败不影响其他
      }
    }

    logger.info(`[BaiduDrive] 解析成功: ${videoFiles.length}个视频文件`);
    return { success: true, platform: '百度网盘', files: videoFiles };
  } catch (err: any) {
    logger.error(`[BaiduDrive] 解析异常: ${err.message}`);
    return { success: false, platform: '百度网盘', files: [], errorMsg: err.message };
  }
}

/** 获取shareToken */
async function getShareToken(shareId: string, pwd: string, cookie: string): Promise<string | null> {
  // 标准化shareId
  let surl = shareId;
  if (surl.startsWith('1')) surl = surl.substring(1);

  const resp = await fetch('https://pan.baidu.com/share/verify?surl=' + surl, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Cookie': cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': 'https://pan.baidu.com/',
    },
    body: `pwd=${pwd}&surl=${surl}`,
    redirect: 'manual',
  });

  const text = await resp.text();
  try {
    const data = JSON.parse(text);
    if (data?.errno === 0 && data?.share_token) {
      return data.share_token;
    }
  } catch { /* */ }

  // 尝试从页面HTML中提取
  const tokenMatch = text.match(/share_token['"]\s*:\s*['"]([\w]+)/);
  if (tokenMatch) return tokenMatch[1];

  return null;
}

/** 获取分享文件列表 */
async function getShareFileList(shareId: string, shareToken: string, cookie: string): Promise<BaiduDriveFile[]> {
  let surl = shareId;
  if (surl.startsWith('1')) surl = surl.substring(1);

  const resp = await fetch(`https://pan.baidu.com/share/list?shareid=${surl}&share_token=${shareToken}&dir=/&num=100`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': cookie,
      'Referer': 'https://pan.baidu.com/',
    },
  });

  const text = await resp.text();
  try {
    const data = JSON.parse(text);
    if (data?.errno === 0 && data?.list) {
      return data.list.map((f: any) => ({
        fsId: String(f.fs_id || ''),
        serverFilename: f.server_filename || f.filename || '',
        size: f.size || 0,
        isDir: !!f.is_dir,
        category: f.category || 0,
        md5: f.md5 || '',
      }));
    }
  } catch { /* */ }

  return [];
}

/** 获取文件下载链接(dlink) */
async function getFileDlink(fsId: string, shareId: string, shareToken: string, cookie: string): Promise<string | null> {
  const resp = await fetch(`https://pan.baidu.com/share/download?shareid=${shareId}&share_token=${shareToken}&fsid=${fsId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': cookie,
      'Referer': 'https://pan.baidu.com/',
    },
  });

  const text = await resp.text();
  try {
    const data = JSON.parse(text);
    if (data?.errno === 0 && data?.dlink) {
      return data.dlink;
    }
  } catch { /* */ }

  return null;
}