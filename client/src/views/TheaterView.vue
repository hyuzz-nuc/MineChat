<script setup lang="ts">
/**
 * 演播厅主视图 - TheaterView
 * 布局：左侧视频播放区(70%) + 右侧聊天侧边栏(30%)
 * 顶部：返回按钮 + 房间名 + 成员数 + 设置
 * 视频源输入弹窗
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { useSocket } from '../composables/useSocket';
import VideoPlayer from '../components/theater/VideoPlayer.vue';
import ChatSidebar from '../components/theater/ChatSidebar.vue';
import VideoParser from '../components/theater/VideoParser.vue';
import type { DanmakuItem } from '../composables/danmakuEngine';

const router = useRouter();
const userStore = useUserStore();

// 房间状态
const roomName = ref('演播厅');
const sourceUrl = ref('');
const sourceInput = ref('');
const showSourceDialog = ref(true);
const sourceTab = ref<'direct' | 'parse'>('parse'); // 默认显示解析面板
const isOwner = ref(true);

// 聊天消息
interface TheaterMsg {
  id: string; senderId: string; senderName: string;
  content: string; type: 'TEXT' | 'SYSTEM' | 'DANMAKU'; createdAt: string;
}
const messages = ref<TheaterMsg[]>([]);
const myId = computed(() => userStore.userId);

// 成员
interface Member {
  userId: string; nickname: string; avatar: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER'; status: 'ONLINE' | 'OFFLINE' | 'AWAY';
}
const members = ref<Member[]>([]);

// 侧边栏宽度
const sidebarWidth = ref(320);
const isResizing = ref(false);

/** 加载视频源 */
function loadSource(): void {
  if (!sourceInput.value.trim()) return;
  sourceUrl.value = sourceInput.value.trim();
  showSourceDialog.value = false;
  addSystemMsg('视频源已加载');
}

/** 发送聊天消息 */
function onChatSend(content: string): void {
  const msg: TheaterMsg = {
    id: `t_${Date.now()}`, senderId: myId.value,
    senderName: userStore.nickname || userStore.username || '',
    content, type: 'TEXT', createdAt: new Date().toISOString(),
  };
  messages.value.push(msg);
  // 通过Socket广播
  const socket = useSocket();
  socket.emit('theater:chat', { content, type: 'TEXT' });
}

/** 弹幕发送回调 */
function onDanmaku(item: DanmakuItem): void {
  const msg: TheaterMsg = {
    id: item.id, senderId: myId.value,
    senderName: userStore.nickname || userStore.username || '',
    content: item.text, type: 'DANMAKU', createdAt: new Date().toISOString(),
  };
  messages.value.push(msg);
  const socket = useSocket();
  socket.emit('theater:danmaku', { text: item.text, type: item.type });
}

/** 添加系统消息 */
function addSystemMsg(text: string): void {
  messages.value.push({
    id: `sys_${Date.now()}`, senderId: '', senderName: '',
    content: text, type: 'SYSTEM', createdAt: new Date().toISOString(),
  });
}

/** 播放同步事件 */
function onPlay(time: number): void {
  const socket = useSocket();
  socket.emit('theater:play', { currentTime: time });
}
function onPause(time: number): void {
  const socket = useSocket();
  socket.emit('theater:pause', { currentTime: time });
}
function onSeek(time: number): void {
  const socket = useSocket();
  socket.emit('theater:seek', { currentTime: time });
}
function onSync(time: number, playing: boolean): void {
  const socket = useSocket();
  socket.emit('theater:sync', { currentTime: time, playing });
}

/** 侧边栏拖拽调整宽度 */
function onResizeStart(e: MouseEvent): void {
  isResizing.value = true;
  const startX = e.clientX;
  const startW = sidebarWidth.value;
  function onMove(ev: MouseEvent): void {
    const delta = startX - ev.clientX;
    sidebarWidth.value = Math.max(240, Math.min(480, startW + delta));
  }
  function onUp(): void {
    isResizing.value = false;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  }
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

/** 返回聊天页 */
function goBack(): void { router.push('/'); }

/** 切换视频源 */
function changeSource(): void { showSourceDialog.value = true; sourceInput.value = sourceUrl.value; }

/** 解析结果回调 */
function onVideoParsed(videoUrl: string, videoType: string): void {
  sourceUrl.value = videoUrl;
  showSourceDialog.value = false;
  addSystemMsg(`视频源已加载 (${videoType})`);
}

onMounted(() => {
  // 模拟初始成员
  members.value = [{
    userId: myId.value,
    nickname: userStore.nickname || userStore.username || '我',
    avatar: null, role: 'OWNER', status: 'ONLINE',
  }];
  addSystemMsg('欢迎来到演播厅！输入视频链接开始播放');
});
</script>

<template>
  <div class="theater-layout">
    <!-- 顶部栏 -->
    <header class="theater-header glass-panel">
      <button class="back-btn" @click="goBack" title="返回">← 返回</button>
      <div class="header-center">
        <h1 class="room-name">{{ roomName }}</h1>
        <span class="member-badge">👥 {{ members.length }}</span>
      </div>
      <button class="settings-btn" @click="changeSource" title="切换视频源">⚙️</button>
    </header>

    <!-- 主体 -->
    <div class="theater-body">
      <!-- 视频区 -->
      <div class="video-area">
        <VideoPlayer
          :src="sourceUrl"
          :is-owner="isOwner"
          @play="onPlay"
          @pause="onPause"
          @seek="onSeek"
          @sync="onSync"
          @danmaku="onDanmaku"
        />
      </div>

      <!-- 拖拽分割线 -->
      <div class="resize-handle" @mousedown="onResizeStart" />

      <!-- 聊天侧边栏 -->
      <div class="sidebar-area" :style="{ width: sidebarWidth + 'px' }">
        <ChatSidebar
          :messages="messages"
          :members="members"
          :my-id="myId"
          @send="onChatSend"
        />
      </div>
    </div>

    <!-- 视频源输入弹窗 -->
    <Teleport to="body">
      <div v-if="showSourceDialog" class="source-overlay" @click.self="showSourceDialog = false">
        <div class="source-dialog glass-panel">
          <h2 class="dialog-title">🎬 加载视频</h2>

          <!-- Tab切换 -->
          <div class="source-tabs">
            <button class="source-tab" :class="{ active: sourceTab === 'parse' }" @click="sourceTab = 'parse'">🔗 短视频解析</button>
            <button class="source-tab" :class="{ active: sourceTab === 'direct' }" @click="sourceTab = 'direct'">📎 直链输入</button>
          </div>

          <!-- 短视频解析面板 -->
          <template v-if="sourceTab === 'parse'">
            <VideoParser @parsed="onVideoParsed" @close="showSourceDialog = false" />
          </template>

          <!-- 直链输入面板 -->
          <template v-else>
            <p class="dialog-desc">输入视频直链URL（支持 .mp4 / .webm / .m3u8）</p>
            <input
              v-model="sourceInput"
              type="url"
              placeholder="https://example.com/video.mp4"
              class="source-input"
              @keydown.enter="loadSource"
            />
            <div class="dialog-actions">
              <button v-if="sourceUrl" class="btn-cancel" @click="showSourceDialog = false">取消</button>
              <button class="btn-load" @click="loadSource" :disabled="!sourceInput.trim()">加载播放</button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.theater-layout {
  width: 100vw; height: 100vh; display: flex; flex-direction: column;
  background: var(--bg-base); overflow: hidden;
}

/* 顶部栏 */
.theater-header {
  height: 52px; display: flex; align-items: center; padding: 0 var(--space-4);
  border-radius: 0; gap: var(--space-4); flex-shrink: 0; z-index: 10;
}
.back-btn {
  padding: 4px 12px; border-radius: var(--radius-md); font-size: var(--text-sm);
  color: var(--muted); cursor: pointer; transition: color var(--duration-fast), background var(--duration-fast);
}
.back-btn:hover { color: var(--ink); background: rgba(255,255,255,.06); }
.header-center { flex: 1; display: flex; align-items: center; gap: var(--space-3); }
.room-name {
  font-size: var(--text-md); font-weight: var(--weight-semibold); color: var(--ink);
  background: var(--gradient-brand); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.member-badge { font-size: var(--text-sm); color: var(--muted); }
.settings-btn {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  border-radius: var(--radius-md); color: var(--muted); cursor: pointer;
  transition: color var(--duration-fast), background var(--duration-fast);
}
.settings-btn:hover { color: var(--accent); background: rgba(212,175,55,.08); }

/* 主体布局 */
.theater-body { flex: 1; display: flex; overflow: hidden; min-height: 0; }

/* 视频区 */
.video-area {
  flex: 1; display: flex; align-items: center; justify-content: center;
  padding: var(--space-4); min-width: 0;
  background: radial-gradient(ellipse at 30% 40%, rgba(212,175,55,.015) 0%, transparent 60%),
              radial-gradient(ellipse at 70% 80%, rgba(139,157,175,.01) 0%, transparent 60%),
              var(--bg-base);
}

/* 拖拽分割线 */
.resize-handle {
  width: 4px; cursor: col-resize; flex-shrink: 0;
  background: rgba(255,255,255,.04); transition: background var(--duration-fast);
  position: relative;
}
.resize-handle::after {
  content: ''; position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 2px; height: 24px; border-radius: 1px;
  background: rgba(212,175,55,.2); transition: background var(--duration-fast);
}
.resize-handle:hover { background: rgba(255,255,255,.08); }
.resize-handle:hover::after { background: rgba(212,175,55,.5); }

/* 侧边栏 */
.sidebar-area { flex-shrink: 0; overflow: hidden; }

/* 弹窗遮罩 */
.source-overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(0,0,0,.6); backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  animation: fadeIn .2s var(--ease-out-expo);
}
.source-dialog {
  width: 480px; max-width: 90vw; padding: var(--space-8);
  border-radius: var(--radius-xl); animation: scaleIn .3s var(--ease-out-expo);
}
.dialog-title {
  font-size: var(--text-xl); font-weight: var(--weight-bold); color: var(--ink);
  margin-bottom: var(--space-3);
}
.source-tabs { display: flex; gap: var(--space-1); margin-bottom: var(--space-4); }
.source-tab {
  flex: 1; height: 38px; display: flex; align-items: center; justify-content: center;
  border-radius: var(--radius-lg); font-size: var(--text-sm); color: var(--muted);
  cursor: pointer; transition: color var(--duration-fast), background var(--duration-fast), border-color var(--duration-fast);
  border: 1px solid rgba(255,255,255,.06); background: rgba(255,255,255,.03);
}
.source-tab:hover { color: var(--ink-2); background: rgba(255,255,255,.06); }
.source-tab.active { color: var(--accent); background: rgba(212,175,55,.08); border-color: rgba(212,175,55,.25); }
.dialog-desc { font-size: var(--text-sm); color: var(--muted); margin-bottom: var(--space-5); }
.source-input {
  width: 100%; height: 44px; padding: 0 var(--space-4);
  border-radius: var(--radius-lg); background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.1); color: var(--ink); font-size: var(--text-base);
}
.source-input::placeholder { color: rgba(255,255,255,.22); }
.source-input:focus { border-color: rgba(var(--accent-rgb),.5); outline: none; box-shadow: 0 0 0 2px rgba(var(--accent-rgb),.1); }

.dialog-actions { display: flex; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-5); }
.btn-cancel {
  padding: 8px 20px; border-radius: var(--radius-md); font-size: var(--text-sm);
  color: var(--muted); cursor: pointer; transition: background var(--duration-fast);
}
.btn-cancel:hover { background: rgba(255,255,255,.06); }
.btn-load {
  padding: 8px 24px; border-radius: var(--radius-md); font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  background: var(--gradient-btn); color: var(--bg-base);
  cursor: pointer; transition: background var(--duration-fast);
}
.btn-load:disabled { opacity: .4; cursor: not-allowed; }
.btn-load:hover:not(:disabled) { background: var(--gradient-btn-hover); }

/* 响应式 */
@media (max-width: 768px) {
  .theater-body { flex-direction: column; }
  .video-area { padding: var(--space-2); }
  .sidebar-area { width: 100% !important; height: 240px; }
  .resize-handle { display: none; }
}
</style>