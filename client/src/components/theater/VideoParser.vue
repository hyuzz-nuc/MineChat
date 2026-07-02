<script setup lang="ts">
/**
 * 视频解析面板
 * - Tab1: 短视频直链解析（抖音/快手/B站/小红书/微博）
 * - Tab2: 网盘视频解析（百度网盘/夸克网盘，需用户Cookie）
 */
import { ref, onMounted } from 'vue';
import {
  parseVideoApi, parseDriveApi,
  type ParseResult, type DriveFile, type DriveParseResult
} from '../../api/video-parser';

const emit = defineEmits<{
  (e: 'parsed', videoUrl: string, videoType: string): void;
  (e: 'close'): void;
}>();

type TabKey = 'short' | 'drive';
const activeTab = ref<TabKey>('short');

/* ===== 短视频解析 ===== */
const inputUrl = ref('');
const parsing = ref(false);
const parseProgress = ref(0);
const result = ref<ParseResult | null>(null);
const errorMsg = ref('');
const copied = ref(false);

interface HistoryItem { url: string; platform: string; videoUrl: string; title?: string; timestamp: number }
const history = ref<HistoryItem[]>([]);
const HISTORY_KEY = 'minechat_parse_history';

function loadHistory() {
  try { const r = localStorage.getItem(HISTORY_KEY); if (r) history.value = JSON.parse(r); } catch {}
}
function saveHistory(item: HistoryItem) {
  history.value.unshift(item);
  if (history.value.length > 20) history.value = history.value.slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value));
}
function clearHistory() { history.value = []; localStorage.removeItem(HISTORY_KEY); }

let progressTimer: ReturnType<typeof setInterval> | null = null;
function startProgress() {
  parseProgress.value = 0;
  progressTimer = setInterval(() => {
    if (parseProgress.value < 90) { parseProgress.value += Math.random() * 15; if (parseProgress.value > 90) parseProgress.value = 90; }
  }, 200);
}
function stopProgress() { if (progressTimer) { clearInterval(progressTimer); progressTimer = null; } parseProgress.value = 100; }

async function startParse() {
  const url = inputUrl.value.trim();
  if (!url) return;
  parsing.value = true; errorMsg.value = ''; result.value = null; copied.value = false;
  startProgress();
  try {
    const res = await parseVideoApi(url);
    const data = res.data?.data || (res.data as any);
    stopProgress();
    if (data?.success && data.videoUrl) {
      result.value = data;
      saveHistory({ url, platform: data.platform, videoUrl: data.videoUrl, title: data.title, timestamp: Date.now() });
    } else { errorMsg.value = data?.errorMsg || '解析失败，未能提取视频直链'; }
  } catch (err: any) { stopProgress(); errorMsg.value = err?.response?.data?.message || err?.message || '网络请求失败'; }
  finally { parsing.value = false; }
}

async function copyUrl(url: string) {
  try { await navigator.clipboard.writeText(url); } catch {
    const inp = document.createElement('input'); inp.value = url; document.body.appendChild(inp); inp.select(); document.execCommand('copy'); document.body.removeChild(inp);
  }
  copied.value = true; setTimeout(() => { copied.value = false; }, 2000);
}
function useResult(v: string, t: string) { emit('parsed', v, t); }
function useHistory(item: HistoryItem) { emit('parsed', item.videoUrl, 'mp4'); }

/* ===== 网盘解析 ===== */
const driveUrl = ref('');
const drivePwd = ref('');
const driveCookie = ref('');
const driveParsing = ref(false);
const driveProgress = ref(0);
const driveResult = ref<DriveParseResult | null>(null);
const driveError = ref('');
const showCookieHelp = ref(false);
const DRIVE_COOKIE_KEY = 'minechat_drive_cookie';

function loadDriveCookie() { try { const r = localStorage.getItem(DRIVE_COOKIE_KEY); if (r) driveCookie.value = r; } catch {} }
function saveDriveCookie() { try { localStorage.setItem(DRIVE_COOKIE_KEY, driveCookie.value.trim()); } catch {} }

let driveTimer: ReturnType<typeof setInterval> | null = null;
function startDriveProgress() {
  driveProgress.value = 0;
  driveTimer = setInterval(() => {
    if (driveProgress.value < 85) { driveProgress.value += Math.random() * 10; if (driveProgress.value > 85) driveProgress.value = 85; }
  }, 300);
}
function stopDriveProgress() { if (driveTimer) { clearInterval(driveTimer); driveTimer = null; } driveProgress.value = 100; }

function detectDrivePlatform(url: string): string {
  if (/pan\.baidu\.com/i.test(url)) return '百度网盘';
  if (/pan\.quark\.cn/i.test(url)) return '夸克网盘';
  return '';
}
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + u[i];
}

async function startDriveParse() {
  const url = driveUrl.value.trim();
  const cookie = driveCookie.value.trim();
  if (!url) return;
  if (!cookie) { driveError.value = '请输入Cookie，网盘解析必须提供登录Cookie'; return; }
  if (!detectDrivePlatform(url)) { driveError.value = '无法识别网盘平台，目前仅支持百度网盘和夸克网盘'; return; }
  driveParsing.value = true; driveError.value = ''; driveResult.value = null;
  startDriveProgress(); saveDriveCookie();
  try {
    const res = await parseDriveApi(url, drivePwd.value.trim(), cookie);
    const data = res.data?.data || (res.data as any);
    stopDriveProgress();
    if (data?.success && data.files?.length > 0) { driveResult.value = data; }
    else { driveError.value = data?.errorMsg || '解析失败，未找到视频文件'; }
  } catch (err: any) { stopDriveProgress(); driveError.value = err?.response?.data?.message || err?.message || '网络请求失败'; }
  finally { driveParsing.value = false; }
}

function useDriveFile(file: DriveFile) { if (file.videoUrl) emit('parsed', file.videoUrl, 'mp4'); }

onMounted(() => { loadHistory(); loadDriveCookie(); });
</script>

<template>
  <div class="parser-panel">
    <!-- Tab 切换 -->
    <div class="parser-tabs">
      <button class="tab-btn" :class="{ active: activeTab === 'short' }" @click="activeTab = 'short'">🔗 短视频解析</button>
      <button class="tab-btn" :class="{ active: activeTab === 'drive' }" @click="activeTab = 'drive'">☁️ 网盘解析</button>
    </div>

    <!-- ===== Tab1: 短视频 ===== -->
    <template v-if="activeTab === 'short'">
      <p class="parser-desc">粘贴抖音、快手、B站等分享链接，自动提取视频直链</p>
      <div class="parser-input-area">
        <input v-model="inputUrl" type="url" placeholder="粘贴短视频分享链接..." class="parser-input" :disabled="parsing" @keydown.enter="startParse" />
        <button class="parse-btn" @click="startParse" :disabled="!inputUrl.trim() || parsing">
          <span v-if="parsing" class="parse-loading" /><template v-else>解析</template>
        </button>
      </div>
      <div v-if="parsing" class="progress-wrap">
        <div class="progress-bar"><div class="progress-fill" :style="{ width: parseProgress + '%' }" /></div>
        <span class="progress-text">正在解析中...</span>
      </div>
      <div v-if="errorMsg" class="error-msg"><span class="error-icon">⚠️</span><span>{{ errorMsg }}</span></div>
      <div v-if="result && result.success" class="result-card glass-panel">
        <div class="result-header">
          <span class="result-platform">{{ result.platform }}</span>
          <span class="result-type">{{ result.videoType }}</span>
        </div>
        <p v-if="result.title" class="result-title">{{ result.title }}</p>
        <div class="result-url-row">
          <input type="text" :value="result.videoUrl" class="result-url-input" readonly />
          <button class="copy-btn" :class="{ copied }" @click="copyUrl(result.videoUrl!)">{{ copied ? '✓' : '复制' }}</button>
        </div>
        <button class="use-btn" @click="useResult(result.videoUrl!, result.videoType || 'mp4')">使用此链接播放</button>
      </div>
      <div v-if="history.length > 0" class="history-section">
        <div class="history-header">
          <span class="history-label">历史解析</span>
          <button class="history-clear" @click="clearHistory">清空</button>
        </div>
        <div class="history-list">
          <div v-for="(item, idx) in history.slice(0, 5)" :key="idx" class="history-item" @click="useHistory(item)">
            <span class="history-platform">{{ item.platform }}</span>
            <span class="history-title">{{ item.title || item.url.slice(0, 30) + '...' }}</span>
            <span class="history-time">{{ new Date(item.timestamp).toLocaleDateString('zh-CN') }}</span>
          </div>
        </div>
      </div>
      <div class="supported-platforms">
        <span class="platform-tag">🎵 抖音</span>
        <span class="platform-tag">🎬 快手</span>
        <span class="platform-tag">📺 B站</span>
        <span class="platform-tag">📕 小红书</span>
        <span class="platform-tag">📰 微博</span>
      </div>
    </template>
    <template v-if="activeTab === 'drive'">
      <p class="parser-desc">解析百度网盘/夸克网盘分享链接中的视频文件</p>
      <div class="drive-input-group">
        <label class="drive-label">分享链接</label>
        <input v-model="driveUrl" type="url" placeholder="粘贴网盘分享链接..." class="parser-input" :disabled="driveParsing" />
      </div>
      <div class="drive-input-row">
        <div class="drive-input-group flex-1">
          <label class="drive-label">提取码</label>
          <input v-model="drivePwd" type="text" placeholder="无提取码可留空" class="parser-input drive-pwd-input" :disabled="driveParsing" maxlength="4" />
        </div>
        <div v-if="driveUrl" class="drive-platform-badge">{{ detectDrivePlatform(driveUrl) || '未知平台' }}</div>
      </div>
      <div class="drive-input-group">
        <div class="drive-label-row">
          <label class="drive-label">登录Cookie</label>
          <button class="cookie-help-btn" @click="showCookieHelp = !showCookieHelp">{{ showCookieHelp ? '收起' : '如何获取?' }}</button>
        </div>
        <textarea v-model="driveCookie" placeholder="粘贴网盘登录Cookie..." class="drive-cookie-input" :disabled="driveParsing" rows="3" />
        <div v-if="showCookieHelp" class="cookie-help-box">
          <p><b>百度网盘Cookie获取：</b></p>
          <ol><li>浏览器登录 pan.baidu.com</li><li>按 F12 打开开发者工具 → Network</li><li>刷新页面，点击任意请求</li><li>在 Request Headers 中找到 Cookie 字段，完整复制</li></ol>
          <p style="margin-top:8px"><b>夸克网盘Cookie获取：</b></p>
          <ol><li>浏览器登录 pan.quark.cn</li><li>同上操作，复制Cookie</li></ol>
          <p style="margin-top:8px;color:var(--accent)">⚠️ Cookie仅在本地面板中使用，不会上传到服务器存储</p>
        </div>
      </div>
      <button class="parse-btn drive-parse-btn" @click="startDriveParse" :disabled="!driveUrl.trim() || !driveCookie.trim() || driveParsing">
        <span v-if="driveParsing" class="parse-loading" /><template v-else>解析网盘</template>
      </button>
      <div v-if="driveParsing" class="progress-wrap">
        <div class="progress-bar"><div class="progress-fill" :style="{ width: driveProgress + '%' }" /></div>
        <span class="progress-text">正在解析网盘文件...</span>
      </div>
      <div v-if="driveError" class="error-msg"><span class="error-icon">⚠️</span><span>{{ driveError }}</span></div>
      <div v-if="driveResult && driveResult.success" class="drive-result">
        <div class="drive-result-header">
          <span class="result-platform">{{ driveResult.platform }}</span>
          <span class="drive-file-count">找到 {{ driveResult.files.length }} 个文件</span>
        </div>
        <div class="drive-file-list">
          <div v-for="(file, idx) in driveResult.files" :key="idx" class="drive-file-item">
            <div class="drive-file-info">
              <span class="drive-file-icon">{{ file.isDir ? '📁' : '🎬' }}</span>
              <div class="drive-file-detail">
                <span class="drive-file-name">{{ file.serverFilename || file.fileName }}</span>
                <span class="drive-file-size">{{ file.isDir ? '文件夹' : formatSize(file.size) }}</span>
              </div>
            </div>
            <button v-if="file.videoUrl" class="drive-use-btn" @click="useDriveFile(file)">使用</button>
            <span v-else-if="!file.isDir" class="drive-no-link">无直链</span>
          </div>
        </div>
      </div>
      <div class="supported-platforms">
        <span class="platform-tag">☁️ 百度网盘</span>
        <span class="platform-tag">☁️ 夸克网盘</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.parser-panel { display: flex; flex-direction: column; gap: var(--space-4); }
.parser-tabs { display: flex; gap: 2px; background: rgba(255,255,255,.04); border-radius: var(--radius-lg); padding: 3px; }
.tab-btn { flex:1; padding:8px 0; border-radius:var(--radius-md); font-size:var(--text-sm); color:var(--muted); cursor:pointer; transition:all var(--duration-fast); background:transparent; text-align:center; }
.tab-btn:hover { color:var(--ink); background:rgba(255,255,255,.04); }
.tab-btn.active { background:rgba(212,175,55,.12); color:var(--accent); font-weight:var(--weight-semibold); }
.parser-desc { font-size:var(--text-sm); color:var(--muted); }
.parser-input-area { display:flex; gap:var(--space-2); }
.parser-input { flex:1; height:44px; padding:0 var(--space-4); border-radius:var(--radius-lg); background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.1); color:var(--ink); font-size:var(--text-sm); }
.parser-input::placeholder { color:rgba(255,255,255,.22); }
.parser-input:focus { border-color:rgba(var(--accent-rgb),.5); outline:none; box-shadow:0 0 0 2px rgba(var(--accent-rgb),.1); }
.parser-input:disabled { opacity:.5; }
.parse-btn { padding:0 20px; height:44px; border-radius:var(--radius-lg); background:var(--gradient-btn); color:var(--bg-base); font-size:var(--text-sm); font-weight:var(--weight-semibold); cursor:pointer; transition:background var(--duration-fast); white-space:nowrap; display:flex; align-items:center; justify-content:center; }
.parse-btn:disabled { opacity:.4; cursor:not-allowed; }
.parse-btn:hover:not(:disabled) { background:var(--gradient-btn-hover); }
.parse-loading { width:16px; height:16px; border:2px solid rgba(0,0,0,.2); border-top-color:var(--bg-base); border-radius:50%; animation:spin .6s linear infinite; }
.progress-wrap { display:flex; flex-direction:column; gap:var(--space-1); }
.progress-bar { height:4px; background:rgba(255,255,255,.08); border-radius:2px; overflow:hidden; }
.progress-fill { height:100%; background:var(--accent); border-radius:2px; transition:width .2s ease; }
.progress-text { font-size:11px; color:var(--accent); }
.error-msg { display:flex; align-items:center; gap:var(--space-2); padding:var(--space-3); border-radius:var(--radius-md); background:rgba(255,83,103,.08); border:1px solid rgba(255,83,103,.2); color:#ff5367; font-size:var(--text-sm); }
.result-card { padding:var(--space-4); border-radius:var(--radius-lg); }
.result-header { display:flex; align-items:center; gap:var(--space-2); margin-bottom:var(--space-2); }
.result-platform { padding:2px 8px; border-radius:var(--radius-sm); background:rgba(212,175,55,.12); color:var(--accent); font-size:12px; font-weight:var(--weight-semibold); }
.result-type { padding:2px 6px; border-radius:var(--radius-sm); background:rgba(255,255,255,.06); color:var(--muted); font-size:11px; }
.result-title { font-size:var(--text-sm); color:var(--ink); margin-bottom:var(--space-3); line-height:1.4; }
.result-url-row { display:flex; gap:var(--space-2); margin-bottom:var(--space-3); }
.result-url-input { flex:1; height:32px; padding:0 var(--space-3); border-radius:var(--radius-md); background:rgba(0,0,0,.3); border:1px solid rgba(255,255,255,.08); color:var(--accent); font-size:11px; font-family:var(--font-mono); }
.copy-btn { padding:0 12px; height:32px; border-radius:var(--radius-md); background:rgba(212,175,55,.12); color:var(--accent); font-size:12px; border:1px solid rgba(212,175,55,.25); cursor:pointer; transition:background var(--duration-fast); }
.copy-btn:hover { background:rgba(212,175,55,.22); }
.copy-btn.copied { background:rgba(212,175,55,.25); color:#4CAF50; border-color:rgba(76,175,80,.3); }
.use-btn { width:100%; height:40px; border-radius:var(--radius-lg); background:var(--gradient-btn); color:var(--bg-base); font-size:var(--text-sm); font-weight:var(--weight-semibold); cursor:pointer; transition:background var(--duration-fast); }
.use-btn:hover { background:var(--gradient-btn-hover); }
.history-section { margin-top:var(--space-2); }
.history-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-2); }
.history-label { font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:1px; }
.history-clear { font-size:11px; color:var(--muted); cursor:pointer; transition:color var(--duration-fast); }
.history-clear:hover { color:var(--red); }
.history-list { display:flex; flex-direction:column; gap:2px; }
.history-item { display:flex; align-items:center; gap:var(--space-2); padding:var(--space-2) var(--space-3); border-radius:var(--radius-md); cursor:pointer; transition:background var(--duration-fast); }
.history-item:hover { background:rgba(255,255,255,.04); }
.history-platform { font-size:11px; color:var(--accent); flex-shrink:0; }
.history-title { flex:1; font-size:11px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.history-time { font-size:10px; color:rgba(255,255,255,.2); flex-shrink:0; }
.supported-platforms { display:flex; flex-wrap:wrap; gap:var(--space-1); margin-top:var(--space-2); }
.platform-tag { padding:2px 8px; border-radius:var(--radius-sm); background:rgba(255,255,255,.04); color:var(--muted); font-size:11px; border:1px solid rgba(255,255,255,.06); }
/* 网盘解析 */
.drive-input-group { display:flex; flex-direction:column; gap:4px; }
.drive-input-group.flex-1 { flex:1; }
.drive-label { font-size:12px; color:var(--muted); font-weight:var(--weight-semibold); }
.drive-label-row { display:flex; justify-content:space-between; align-items:center; }
.cookie-help-btn { font-size:11px; color:var(--accent); cursor:pointer; background:none; border:none; padding:0; }
.cookie-help-btn:hover { text-decoration:underline; }
.drive-pwd-input { height:38px!important; }
.drive-input-row { display:flex; gap:var(--space-3); align-items:flex-end; }
.drive-platform-badge { padding:4px 10px; border-radius:var(--radius-md); white-space:nowrap; background:rgba(212,175,55,.1); color:var(--accent); font-size:12px; font-weight:var(--weight-semibold); height:38px; display:flex; align-items:center; }
.drive-cookie-input { width:100%; padding:var(--space-3); border-radius:var(--radius-lg); background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.1); color:var(--ink); font-size:12px; font-family:var(--font-mono); resize:vertical; min-height:60px; }
.drive-cookie-input::placeholder { color:rgba(255,255,255,.22); }
.drive-cookie-input:focus { border-color:rgba(var(--accent-rgb),.5); outline:none; }
.drive-cookie-input:disabled { opacity:.5; }
.cookie-help-box { padding:var(--space-3); border-radius:var(--radius-md); background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06); font-size:12px; color:var(--muted); line-height:1.6; }
.cookie-help-box ol { padding-left:16px; margin:4px 0; }
.cookie-help-box li { margin:2px 0; }
.drive-parse-btn { width:100%; }
.drive-result { display:flex; flex-direction:column; gap:var(--space-3); }
.drive-result-header { display:flex; align-items:center; gap:var(--space-2); }
.drive-file-count { font-size:12px; color:var(--muted); }
.drive-file-list { display:flex; flex-direction:column; gap:4px; max-height:240px; overflow-y:auto; }
.drive-file-item { display:flex; align-items:center; justify-content:space-between; padding:var(--space-2) var(--space-3); border-radius:var(--radius-md); background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06); transition:background var(--duration-fast); }
.drive-file-item:hover { background:rgba(255,255,255,.06); }
.drive-file-info { display:flex; align-items:center; gap:var(--space-2); flex:1; min-width:0; }
.drive-file-icon { font-size:16px; flex-shrink:0; }
.drive-file-detail { display:flex; flex-direction:column; min-width:0; }
.drive-file-name { font-size:12px; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.drive-file-size { font-size:10px; color:var(--muted); }
.drive-use-btn { padding:4px 12px; border-radius:var(--radius-md); background:rgba(212,175,55,.15); color:var(--accent); font-size:11px; font-weight:var(--weight-semibold); cursor:pointer; border:1px solid rgba(212,175,55,.25); white-space:nowrap; transition:background var(--duration-fast); }
.drive-use-btn:hover { background:rgba(212,175,55,.25); }
.drive-no-link { font-size:10px; color:rgba(255,255,255,.2); }
@keyframes spin { to { transform:rotate(360deg); } }
</style>