/**
 * 夸克网盘视频直链解析服务
 * 
 * 原理：用户分享链接+Cookie → 服务端获取分享文件列表 → 提取视频直链
 * 夸克网盘API较百度简单，且免费用户也有较高下载速度
 */

import { logger } from '../utils/logger.js';

export interface QuarkDriveParseResult {
  success: boolean;
  platform: string;
  files: QuarkDriveFile[];
  errorMsg?: string;
}

export interface QuarkDriveFile {
  fid: string;
  fileName: string;
  size: number;
  isDir: boolean;
  fileType: string; // video/audio/image/document/other
  videoUrl?: string;
}

/** 夸克网盘分享链接正则 */
const QUARK_SHARE_REGEX = [
  /https?:\/\/pan\.quark\.cn\/s\/([\w]+)/,
];

/** 提取分享ID */
export function isQuarkShareUrl(url: string): string | null {
  for (const r of QUARK_SHARE_REGEX) {
    const m = url.match(r);
    if (m) return m[1];
  }
  return null;
}

/**
 * 解析夸克网盘分享链接
 * @param shareUrl 分享链接
 * @param pwd 提取码（可选，夸克部分分享无需提取码）
 * @param cookie 用户夸克网盘Cookie
 */
export async function parseQuarkShare(shareUrl: string, pwd: string, cookie: string): Promise<QuarkDriveParseResult> {
  const shareId = isQuarkShareUrl(shareUrl);
  if (!shareId) {
    return { success: false, platform: '夸克网盘', files: [], errorMsg: '无效的夸克网盘分享链接' };
  }

  logger.info(`[QuarkDrive] 开始解析分享: ${shareUrl}`);

  try {
    // 第1步：访问分享页面获取stoken
    const stoken = await getShareToken(shareId, pwd, cookie);
    if (!stoken) {
      return { success: false, platform: '夸克网盘', files: [], errorMsg: '获取分享Token失败，可能是提取码错误或分享已失效' };
    }

    // 第2步：获取文件列表
    const files = await getShareFileList(shareId, stoken, cookie);
    if (!files || files.length === 0) {
      return { success: false, platform: '夸克网盘', files: [], errorMsg: '分享中没有文件' };
    }

    // 第3步：筛选视频文件
    const videoFiles = files.filter(f => f.fileType === 'video' && !f.isDir);

    // 第4步：获取视频直链
    for (const vf of videoFiles) {
      try {
        const downloadUrl = await getFileDownloadUrl(vf.fid, shareId, stoken, cookie);
        if (downloadUrl) {
          vf.videoUrl = downloadUrl;
        }
      } catch {
        // 单个文件直链获取失败不影响其他
      }
    }

    logger.info(`[QuarkDrive] 解析成功: ${videoFiles.length}个视频文件`);
    return { success: true, platform: '夸克网盘', files: videoFiles };
  } catch (err: any) {
    logger.error(`[QuarkDrive] 解析异常: ${err.message}`);
    return { success: false, platform: '夸克网盘', files: [], errorMsg: err.message };
  }
}

/** 获取夸克分享stoken */
async function getShareToken(shareId: string, pwd: string, cookie: string): Promise<string | null> {
  const resp = await fetch(`https://pan.quark.cn/share/sharepage/token`, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Cookie': cookie,
      'Content-Type': 'application/json',
      'Referer': `https://pan.quark.cn/s/${shareId}`,
      'Origin': 'https://pan.quark.cn',
    },
    body: JSON.stringify({ pwd, shareId }),
  });

  try {
    const data = await resp.json();
    if (data?.status === 200 && data?.data?.stoken) {
      return data.data.stoken;
    }
    if (data?.status === 200 && data?.data?.token) {
      return data.data.token;
    }
  } catch { /* */ }

  return null;
}

/** 获取分享文件列表 */
async function getShareFileList(shareId: string, stoken: string, cookie: string): Promise<QuarkDriveFile[]> {
  const resp = await fetch(`https://pan.quark.cn/share/sharepage/detail`, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': cookie,
      'Content-Type': 'application/json',
      'Referer': `https://pan.quark.cn/s/${shareId}`,
      'Origin': 'https://pan.quark.cn',
    },
    body: JSON.stringify({
      shareId,
      stoken,
      pwd: '',
      pdir_fid: '',
      pdir_name: '',
      page: 1,
      size: 100,
    }),
  });

  try {
    const data = await resp.json();
    if (data?.status === 200 && data?.data?.list) {
      return data.data.list.map((f: any) => ({
        fid: f.fid || '',
        fileName: f.file_name || f.share_file_name || '',
        size: f.size || 0,
        isDir: !!f.dir,
        fileType: categorizeFile(f.file_name || '', f.dir),
      }));
    }
  } catch { /* */ }

  return [];
}

/** 根据文件名判断类型 */
function categorizeFile(filename: string, isDir: boolean): string {
  if (isDir) return 'dir';
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const videoExts = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'ts', 'rmvb', '3gp'];
  const audioExts = ['mp3', 'flac', 'wav', 'aac', 'ogg', 'm4a', 'wma'];
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md'];

  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  if (imageExts.includes(ext)) return 'image';
  if (docExts.includes(ext)) return 'document';
  return 'other';
}

/** 获取文件下载直链 */
async function getFileDownloadUrl(fid: string, shareId: string, stoken: string, cookie: string): Promise<string | null> {
  const resp = await fetch(`https://pan.quark.cn/share/sharepage/download`, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': cookie,
      'Content-Type': 'application/json',
      'Referer': `https://pan.quark.cn/s/${shareId}`,
      'Origin': 'https://pan.quark.cn',
    },
    body: JSON.stringify({
      shareId,
      stoken,
      fids: [fid],
    }),
  });

  try {
    const data = await resp.json();
    if (data?.status === 200 && data?.data?.length > 0) {
      return data.data[0].download_url || data.data[0].file_url || null;
    }
  } catch { /* */ }

  return null;
}