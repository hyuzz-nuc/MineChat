<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { DanmakuEngine, type DanmakuItem } from '../../composables/danmakuEngine';

const props = defineProps<{ src: string; mediaType?: string; isOwner?: boolean; }>();
const emit = defineEmits<{
  (e: 'play', time: number): void;
  (e: 'pause', time: number): void;
  (e: 'seek', time: number): void;
  (e: 'sync', time: number, playing: boolean): void;
  (e: 'danmaku', item: DanmakuItem): void;
}>();

const videoRef = ref<HTMLVideoElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);
const danmakuCanvasRef = ref<HTMLCanvasElement | null>(null);
const danmakuInput = ref('');
const showControls = ref(true);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(0.8);
const isMuted = ref(false);
const isFullscreen = ref(false);
const danmakuEnabled = ref(true);
const buffering = ref(false);

let danmakuEngine: DanmakuEngine | null = null;
let controlsTimer: ReturnType<typeof setTimeout> | null = null;
let syncTimer: ReturnType<typeof setInterval> | null = null;

function fmt(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function togglePlay(): void {
  if (!videoRef.value) return;
  if (videoRef.value.paused) {
    videoRef.value.play(); isPlaying.value = true; emit('play', videoRef.value.currentTime);
  } else {
    videoRef.value.pause(); isPlaying.value = false; emit('pause', videoRef.value.currentTime);
  }
}

function onProgressClick(e: MouseEvent): void {
  if (!videoRef.value || !duration.value) return;
  const bar = e.currentTarget as HTMLElement;
  const rect = bar.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const t = ratio * duration.value;
  videoRef.value.currentTime = t; currentTime.value = t; emit('seek', t);
}

function onVolumeInput(e: Event): void {
  const v = parseFloat((e.target as HTMLInputElement).value);
  volume.value = v;
  if (videoRef.value) videoRef.value.volume = v;
  isMuted.value = v === 0;
}

function toggleMute(): void {
  if (!videoRef.value) return;
  isMuted.value = !isMuted.value;
  videoRef.value.muted = isMuted.value;
}

function toggleFullscreen(): void {
  if (!containerRef.value) return;
  if (!document.fullscreenElement) { containerRef.value.requestFullscreen(); isFullscreen.value = true; }
  else { document.exitFullscreen(); isFullscreen.value = false; }
}

function toggleDanmaku(): void {
  danmakuEnabled.value = !danmakuEnabled.value;
  danmakuEngine?.toggle(danmakuEnabled.value);
}

function sendDanmaku(): void {
  const text = danmakuInput.value.trim();
  if (!text) return;
  const item: DanmakuItem = { id: `dm_${Date.now()}`, text, type: 'roll' };
  danmakuEngine?.send(item);
  danmakuInput.value = '';
  emit('danmaku', item);
}

function syncPlay(time: number): void { if (videoRef.value) { videoRef.value.currentTime = time; videoRef.value.play(); isPlaying.value = true; } }
function syncPause(time: number): void { if (videoRef.value) { videoRef.value.currentTime = time; videoRef.value.pause(); isPlaying.value = false; } }
function syncSeek(time: number): void { if (videoRef.value) { videoRef.value.currentTime = time; currentTime.value = time; } }
function receiveDanmaku(item: DanmakuItem): void { danmakuEngine?.send(item); }

function onmousemove(): void {
  showControls.value = true;
  if (controlsTimer) clearTimeout(controlsTimer);
  controlsTimer = setTimeout(() => { if (isPlaying.value) showControls.value = false; }, 3000);
}

function initDanmaku(): void {
  if (!danmakuCanvasRef.value || !containerRef.value) return;
  const r = containerRef.value.getBoundingClientRect();
  danmakuEngine = new DanmakuEngine({ width: r.width, height: r.height });
  danmakuEngine.mount(danmakuCanvasRef.value);
  danmakuEngine.start();
}

function onResize(): void {
  if (!containerRef.value || !danmakuEngine) return;
  const r = containerRef.value.getBoundingClientRect();
  danmakuEngine.resize(r.width, r.height);
}

function bindVideoEvents(): void {
  const v = videoRef.value;
  if (!v) return;
  v.addEventListener('timeupdate', () => { if (v) currentTime.value = v.currentTime; });
  v.addEventListener('loadedmetadata', () => { if (v) duration.value = v.duration; });
  v.addEventListener('waiting', () => { buffering.value = true; });
  v.addEventListener('canplay', () => { buffering.value = false; });
  v.addEventListener('play', () => { isPlaying.value = true; });
  v.addEventListener('pause', () => { isPlaying.value = false; });
}

watch(() => props.src, () => { if (videoRef.value) videoRef.value.load(); });

onMounted(() => {
  nextTick(() => {
    initDanmaku(); bindVideoEvents();
    if (props.isOwner) { syncTimer = setInterval(() => { if (videoRef.value && isPlaying.value) emit('sync', videoRef.value.currentTime, true); }, 10000); }
    window.addEventListener('resize', onResize);
    document.addEventListener('fullscreenchange', () => { isFullscreen.value = !!document.fullscreenElement; });
  });
});

onUnmounted(() => {
  danmakuEngine?.destroy();
  if (controlsTimer) clearTimeout(controlsTimer);
  if (syncTimer) clearInterval(syncTimer);
  window.removeEventListener('resize', onResize);
});

defineExpose({ syncPlay, syncPause, syncSeek, receiveDanmaku });

const progressPct = ref(0);
watch(currentTime, () => { progressPct.value = duration.value ? (currentTime.value / duration.value) * 100 : 0; });
</script>

<template>
  <div class="video-player" ref="containerRef" @mousemove="onmousemove" @mouseleave="showControls = true">
    <video ref="videoRef" class="video-el" :src="src" preload="metadata" @click="togglePlay" />
    <canvas ref="danmakuCanvasRef" class="danmaku-canvas" />
    <div v-if="buffering" class="buffering-overlay"><div class="buffering-spinner" /></div>
    <div v-if="!src" class="empty-state"><span class="empty-icon">🎬</span><p>输入视频链接开始播放</p></div>

    <div class="controls-layer" :class="{ visible: showControls || !isPlaying }">
      <!-- 顶部弹幕输入 -->
      <div class="controls-top" v-if="src">
        <div class="danmaku-input-wrap">
          <input v-model="danmakuInput" type="text" placeholder="发送弹幕..." class="danmaku-input" @keydown.enter="sendDanmaku" />
          <button class="danmaku-send-btn" @click="sendDanmaku" :disabled="!danmakuInput.trim()">发送</button>
        </div>
      </div>

      <!-- 底部控制条 -->
      <div class="controls-bottom">
        <!-- 进度条 -->
        <div class="progress-bar" @click="onProgressClick">
          <div class="progress-filled" :style="{ width: progressPct + '%' }" />
          <div class="progress-thumb" :style="{ left: progressPct + '%' }" />
        </div>

        <div class="controls-row">
          <div class="controls-left">
            <button class="ctrl-btn" @click="togglePlay">{{ isPlaying ? '⏸' : '▶' }}</button>
            <span class="time-display">{{ fmt(currentTime) }} / {{ fmt(duration) }}</span>
          </div>
          <div class="controls-right">
            <button class="ctrl-btn" :class="{ active: danmakuEnabled }" @click="toggleDanmaku" title="弹幕开关">💬</button>
            <div class="volume-wrap">
              <button class="ctrl-btn" @click="toggleMute">{{ isMuted ? '🔇' : '🔊' }}</button>
              <input type="range" min="0" max="1" step="0.05" :value="isMuted ? 0 : volume" class="volume-slider" @input="onVolumeInput" />
            </div>
            <button class="ctrl-btn" @click="toggleFullscreen" title="全屏">{{ isFullscreen ? '⤓' : '⤒' }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.video-player { position: relative; width: 100%; aspect-ratio: 16/9; background: #000; border-radius: var(--radius-lg); overflow: hidden; }
.video-el { width: 100%; height: 100%; object-fit: contain; display: block; }
.danmaku-canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2; }
.buffering-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 3; background: rgba(0,0,0,.3); }
.buffering-spinner { width: 40px; height: 40px; border: 3px solid rgba(212,175,55,.2); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 1; }
.empty-icon { font-size: 48px; opacity: .4; }
.empty-state p { color: var(--muted); font-size: var(--text-sm); margin-top: var(--space-3); }

.controls-layer { position: absolute; inset: 0; z-index: 4; display: flex; flex-direction: column; justify-content: space-between; opacity: 0; transition: opacity var(--duration-normal) var(--ease-out-expo); pointer-events: none; }
.controls-layer.visible { opacity: 1; pointer-events: auto; }
.controls-top { padding: var(--space-3) var(--space-4); background: linear-gradient(to bottom, rgba(0,0,0,.6), transparent); }
.danmaku-input-wrap { display: flex; gap: var(--space-2); max-width: 360px; }
.danmaku-input { flex: 1; height: 32px; padding: 0 var(--space-3); border-radius: var(--radius-full); background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12); color: var(--ink); font-size: var(--text-sm); }
.danmaku-input::placeholder { color: rgba(255,255,255,.3); }
.danmaku-input:focus { border-color: rgba(var(--accent-rgb),.5); outline: none; }
.danmaku-send-btn { padding: 0 14px; height: 32px; border-radius: var(--radius-full); background: var(--gradient-btn); color: var(--bg-base); font-size: var(--text-sm); font-weight: var(--weight-semibold); cursor: pointer; transition: background var(--duration-fast) var(--ease-out-expo); }
.danmaku-send-btn:disabled { opacity: .4; cursor: not-allowed; }
.danmaku-send-btn:hover:not(:disabled) { background: var(--gradient-btn-hover); }

.controls-bottom { padding: 0 var(--space-4) var(--space-3); background: linear-gradient(to top, rgba(0,0,0,.7), transparent); }
.progress-bar { position: relative; width: 100%; height: 4px; background: rgba(255,255,255,.15); border-radius: 2px; cursor: pointer; margin-bottom: var(--space-2); transition: height var(--duration-fast); }
.progress-bar:hover { height: 6px; }
.progress-filled { height: 100%; background: var(--accent); border-radius: 2px; transition: width .1s linear; }
.progress-thumb { position: absolute; top: 50%; width: 12px; height: 12px; border-radius: 50%; background: var(--accent); transform: translate(-50%, -50%); opacity: 0; transition: opacity var(--duration-fast); box-shadow: 0 0 6px rgba(var(--accent-rgb),.4); }
.progress-bar:hover .progress-thumb { opacity: 1; }

.controls-row { display: flex; align-items: center; justify-content: space-between; }
.controls-left, .controls-right { display: flex; align-items: center; gap: var(--space-2); }
.ctrl-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-md); color: rgba(255,255,255,.8); font-size: 14px; cursor: pointer; transition: color var(--duration-fast), background var(--duration-fast); }
.ctrl-btn:hover { color: #fff; background: rgba(255,255,255,.1); }
.ctrl-btn.active { color: var(--accent); }
.time-display { font-size: var(--text-sm); color: rgba(255,255,255,.7); font-variant-numeric: tabular-nums; }
.volume-wrap { display: flex; align-items: center; gap: 4px; }
.volume-slider { width: 60px; height: 4px; -webkit-appearance: none; appearance: none; background: rgba(255,255,255,.2); border-radius: 2px; outline: none; cursor: pointer; }
.volume-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 10px; height: 10px; border-radius: 50%; background: var(--accent); cursor: pointer; }
</style>