<script setup lang="ts">
/**
 * 短视频直链解析面板
 * - 粘贴分享链接 → 自动识别平台 → 调用解析接口 → 显示直链
 * - 一键复制 → 粘贴到视频源输入框
 * - 历史解析记录(localStorage)
 */
import { ref, onMounted } from 'vue';
import { parseVideoApi, type ParseResult } from '../../api/video-parser';

const emit = defineEmits<{
  (e: 'parsed', videoUrl: string, videoType: string): void;
  (e: 'close'): void;
}>();

const inputUrl = ref('');
const parsing = ref(false);
const parseProgress = ref(0);
const result = ref<ParseResult | null>(null);
const errorMsg = ref('');
const copied = ref(false);

/** 历史记录 */
interface HistoryItem {
  url: string;
  platform: string;
  videoUrl: string;
  title?: string;
  timestamp: number;
}
const history = ref<HistoryItem[]>([]);
const HISTORY_KEY = 'minechat_parse_history';

/** 加载历史 */
function loadHistory(): void {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) history.value = JSON.parse(raw);
  } catch { /* */ }
}

/** 保存历史 */
function saveHistory(item: HistoryItem): void {
  history.value.unshift(item);
  if (history.value.length > 20) history.value = history.value.slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value));
}

/** 清空历史 */
function clearHistory(): void {
  history.value = [];
  localStorage.removeItem(HISTORY_KEY);
}

/** 模拟进度条 */
let progressTimer: ReturnType<typeof setInterval> | null = null;
function startProgress(): void {
  parseProgress.value = 0;
  progressTimer = setInterval(() => {
    if (parseProgress.value < 90) {
      parseProgress.value += Math.random() * 15;
      if (parseProgress.value > 90) parseProgress.value = 90;
    }
  }, 200);
}
function stopProgress(): void {
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
  parseProgress.value = 100;
}

/** 开始解析 */
async function startParse(): Promise<void> {
  const url = inputUrl.value.trim();
  if (!url) return;

  parsing.value = true;
  errorMsg.value = '';
  result.value = null;
  copied.value = false;
  startProgress();

  try {
    const res = await parseVideoApi(url);
    const data = res.data?.data || (res.data as any);
    stopProgress();

    if (data?.success && data.videoUrl) {
      result.value = data;
      saveHistory({
        url,
        platform: data.platform,
        videoUrl: data.videoUrl,
        title: data.title,
        timestamp: Date.now(),
      });
    } else {
      errorMsg.value = data?.errorMsg || '解析失败，未能提取视频直链';
    }
  } catch (err: any) {
    stopProgress();
    errorMsg.value = err?.response?.data?.message || err?.message || '网络请求失败';
  } finally {
    parsing.value = false;
  }
}

/** 复制直链到剪贴板 */
async function copyUrl(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {
    // fallback
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  }
}

/** 使用解析结果 */
function useResult(videoUrl: string, videoType: string): void {
  emit('parsed', videoUrl, videoType);
}

/** 使用历史记录 */
function useHistory(item: HistoryItem): void {
  emit('parsed', item.videoUrl, 'mp4');
}

onMounted(() => { loadHistory(); });
</script>

<template>
  <div class="parser-panel">
    <div class="parser-header">
      <h3 class="parser-title">🔗 短视频解析</h3>
      <p class="parser-desc">粘贴抖音、快手、B站等分享链接，自动提取视频直链</p>
    </div>

    <!-- 输入区 -->
    <div class="parser-input-area">
      <input
        v-model="inputUrl"
        type="url"
        placeholder="粘贴短视频分享链接..."
        class="parser-input"
        :disabled="parsing"
        @keydown.enter="startParse"
      />
      <button class="parse-btn" @click="startParse" :disabled="!inputUrl.trim() || parsing">
        <span v-if="parsing" class="parse-loading" />
        <template v-else>解析</template>
      </button>
    </div>

    <!-- 进度条 -->
    <div v-if="parsing" class="progress-wrap">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: parseProgress + '%' }" />
      </div>
      <span class="progress-text">正在解析中...</span>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="error-msg">
      <span class="error-icon">⚠️</span>
      <span>{{ errorMsg }}</span>
    </div>

    <!-- 解析结果 -->
    <div v-if="result && result.success" class="result-card glass-panel">
      <div class="result-header">
        <span class="result-platform">{{ result.platform }}</span>
        <span class="result-type">{{ result.videoType }}</span>
      </div>
      <p v-if="result.title" class="result-title">{{ result.title }}</p>
      <div class="result-url-row">
        <input type="text" :value="result.videoUrl" class="result-url-input" readonly />
        <button class="copy-btn" :class="{ copied }" @click="copyUrl(result.videoUrl!)">
          {{ copied ? '✓ 已复制' : '复制' }}
        </button>
      </div>
      <button class="use-btn" @click="useResult(result.videoUrl!, result.videoType || 'mp4')">
        使用此链接播放
      </button>
    </div>

    <!-- 历史记录 -->
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

    <!-- 支持平台 -->
    <div class="supported-platforms">
      <span class="platform-tag">🎵 抖音</span>
      <span class="platform-tag">🎬 快手</span>
      <span class="platform-tag">📺 B站</span>
      <span class="platform-tag">📕 小红书</span>
      <span class="platform-tag">📰 微博</span>
    </div>
  </div>
</template>

<style scoped>
.parser-panel { display: flex; flex-direction: column; gap: var(--space-4); }
.parser-header {}
.parser-title { font-size: var(--text-lg); font-weight: var(--weight-bold); color: var(--ink); }
.parser-desc { font-size: var(--text-sm); color: var(--muted); margin-top: var(--space-1); }

.parser-input-area { display: flex; gap: var(--space-2); }
.parser-input {
  flex: 1; height: 44px; padding: 0 var(--space-4); border-radius: var(--radius-lg);
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1);
  color: var(--ink); font-size: var(--text-sm);
}
.parser-input::placeholder { color: rgba(255,255,255,.22); }
.parser-input:focus { border-color: rgba(var(--accent-rgb),.5); outline: none; box-shadow: 0 0 0 2px rgba(var(--accent-rgb),.1); }
.parser-input:disabled { opacity: .5; }
.parse-btn {
  padding: 0 20px; height: 44px; border-radius: var(--radius-lg);
  background: var(--gradient-btn); color: var(--bg-base);
  font-size: var(--text-sm); font-weight: var(--weight-semibold);
  cursor: pointer; transition: background var(--duration-fast); white-space: nowrap;
  display: flex; align-items: center; justify-content: center;
}
.parse-btn:disabled { opacity: .4; cursor: not-allowed; }
.parse-btn:hover:not(:disabled) { background: var(--gradient-btn-hover); }

.parse-loading {
  width: 16px; height: 16px; border: 2px solid rgba(0,0,0,.2); border-top-color: var(--bg-base);
  border-radius: 50%; animation: spin .6s linear infinite;
}

.progress-wrap { display: flex; flex-direction: column; gap: var(--space-1); }
.progress-bar { height: 4px; background: rgba(255,255,255,.08); border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width .2s ease; }
.progress-text { font-size: 11px; color: var(--accent); }

.error-msg {
  display: flex; align-items: center; gap: var(--space-2);
  padding: var(--space-3); border-radius: var(--radius-md);
  background: rgba(255,83,103,.08); border: 1px solid rgba(255,83,103,.2);
  color: #ff5367; font-size: var(--text-sm);
}

.result-card { padding: var(--space-4); border-radius: var(--radius-lg); }
.result-header { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2); }
.result-platform {
  padding: 2px 8px; border-radius: var(--radius-sm);
  background: rgba(212,175,55,.12); color: var(--accent);
  font-size: 12px; font-weight: var(--weight-semibold);
}
.result-type {
  padding: 2px 6px; border-radius: var(--radius-sm);
  background: rgba(255,255,255,.06); color: var(--muted); font-size: 11px;
}
.result-title { font-size: var(--text-sm); color: var(--ink); margin-bottom: var(--space-3); line-height: 1.4; }
.result-url-row { display: flex; gap: var(--space-2); margin-bottom: var(--space-3); }
.result-url-input {
  flex: 1; height: 32px; padding: 0 var(--space-3); border-radius: var(--radius-md);
  background: rgba(0,0,0,.3); border: 1px solid rgba(255,255,255,.08);
  color: var(--accent); font-size: 11px; font-family: var(--font-mono);
}
.copy-btn {
  padding: 0 12px; height: 32px; border-radius: var(--radius-md);
  background: rgba(212,175,55,.12); color: var(--accent); font-size: 12px;
  border: 1px solid rgba(212,175,55,.25); cursor: pointer;
  transition: background var(--duration-fast);
}
.copy-btn:hover { background: rgba(212,175,55,.22); }
.copy-btn.copied { background: rgba(212,175,55,.25); color: #4CAF50; border-color: rgba(76,175,80,.3); }

.use-btn {
  width: 100%; height: 40px; border-radius: var(--radius-lg);
  background: var(--gradient-btn); color: var(--bg-base);
  font-size: var(--text-sm); font-weight: var(--weight-semibold);
  cursor: pointer; transition: background var(--duration-fast);
}
.use-btn:hover { background: var(--gradient-btn-hover); }

.history-section { margin-top: var(--space-2); }
.history-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2); }
.history-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
.history-clear { font-size: 11px; color: var(--muted); cursor: pointer; transition: color var(--duration-fast); }
.history-clear:hover { color: var(--red); }
.history-list { display: flex; flex-direction: column; gap: 2px; }
.history-item {
  display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md); cursor: pointer;
  transition: background var(--duration-fast);
}
.history-item:hover { background: rgba(255,255,255,.04); }
.history-platform { font-size: 11px; color: var(--accent); flex-shrink: 0; }
.history-title { flex: 1; font-size: 11px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.history-time { font-size: 10px; color: rgba(255,255,255,.2); flex-shrink: 0; }

.supported-platforms { display: flex; flex-wrap: wrap; gap: var(--space-1); margin-top: var(--space-2); }
.platform-tag {
  padding: 2px 8px; border-radius: var(--radius-sm);
  background: rgba(255,255,255,.04); color: var(--muted); font-size: 11px;
  border: 1px solid rgba(255,255,255,.06);
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>