<script setup lang="ts">
/**
 * 开机动画叠加层 V3
 * 黑白灰金金属质感 + 多层金属渐变品牌文字 + 路由跳转修复
 */
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { SplashEngine } from '../composables/splashEngine';

const router = useRouter();
const show = ref(true);
const ready = ref(false);
const exiting = ref(false);
let engine: SplashEngine | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function dismiss() {
  if (!show.value || exiting.value) return;
  if (timer) { clearTimeout(timer); timer = null; }
  ready.value = false;
  exiting.value = true;
  setTimeout(() => {
    show.value = false;
    if (engine) { engine.destroy(); engine = null; }
    // 修复：splash消失后导航到登录页（未登录时）
    const token = localStorage.getItem('minechat_access_token');
    if (!token) {
      router.push('/login');
    }
  }, 1200);
}

function markReady() { ready.value = true; }

onMounted(() => {
  const canvas = document.getElementById('splash-canvas') as HTMLCanvasElement;
  if (canvas) { engine = new SplashEngine(canvas); engine.start(); }
  timer = setTimeout(markReady, 5000);
  function onInteract() {
    if (ready.value) dismiss();
    else { markReady(); setTimeout(dismiss, 300); }
  }
  document.addEventListener('click', onInteract, { once: true });
  document.addEventListener('keydown', onInteract, { once: true });
});

onUnmounted(() => {
  if (engine) { engine.destroy(); engine = null; }
  if (timer) { clearTimeout(timer); }
});
</script>

<template>
  <div v-if="show" class="splash" :class="{ ready, exiting }" @click="dismiss">
    <canvas id="splash-canvas" class="splash-canvas"></canvas>
    <div class="splash-noise"></div>
    <div class="splash-content">
      <div class="splash-wordmark">
        <span class="splash-word-mine">Mine</span><span class="splash-word-chat">Chat</span>
      </div>
      <div class="splash-signal-line"></div>
      <div class="splash-sub">real-time immersive chat</div>
      <div v-if="ready" class="splash-enter">点击进入</div>
    </div>
  </div>
</template>

<style scoped>
.splash {
  position: fixed; inset: 0; z-index: 300;
  background: #010304;
  display: flex; align-items: center; justify-content: center;
  pointer-events: auto; opacity: 1; overflow: hidden;
  transition: opacity 1180ms cubic-bezier(.16,1,.3,1), transform 1180ms cubic-bezier(.16,1,.3,1);
  box-shadow: inset 0 0 180px rgba(0,0,0,.88);
}
.splash::before {
  content: ''; position: absolute; inset: -8%; z-index: 0;
  background:
    linear-gradient(115deg, transparent 0%, rgba(201,168,76,.055) 24%, transparent 42%, rgba(244,210,138,.052) 62%, transparent 82%),
    repeating-linear-gradient(90deg, rgba(255,255,255,.030) 0 1px, transparent 1px 54px),
    repeating-linear-gradient(0deg, rgba(255,255,255,.020) 0 1px, transparent 1px 46px),
    linear-gradient(180deg, #020606 0%, #050607 42%, #000 100%);
  filter: blur(.4px); opacity: .90;
  animation: splash-field-breathe 7s ease-in-out infinite;
}
.splash::after {
  content: ''; position: absolute; inset: 0; z-index: 2;
  background:
    linear-gradient(90deg, rgba(0,0,0,.82), transparent 21%, transparent 79%, rgba(0,0,0,.82)),
    linear-gradient(180deg, rgba(0,0,0,.68), transparent 32%, transparent 64%, rgba(0,0,0,.74));
  pointer-events: none;
}
.splash.exiting { pointer-events: none; opacity: 0; transform: scale(1.018); }

.splash-canvas {
  position: absolute; inset: 0; z-index: 1; opacity: 1;
  transition: opacity 1100ms cubic-bezier(.22,1,.36,1), transform 1100ms cubic-bezier(.22,1,.36,1);
}
.splash.exiting .splash-canvas { opacity: .30; transform: scale(1.012); }

.splash-noise {
  position: absolute; inset: 0; z-index: 3; opacity: .038;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E");
  background-size: 180px 180px; mix-blend-mode: screen; pointer-events: none;
}

.splash-content {
  position: relative; z-index: 10;
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  pointer-events: none; transform: translateY(4px);
  transition: opacity 680ms cubic-bezier(.22,1,.36,1), transform 860ms cubic-bezier(.22,1,.36,1);
}

/* ──── 品牌文字：并排布局 + 鎏金shimmer ──── */
.splash-wordmark {
  position: relative; overflow: hidden;
  display: flex; align-items: baseline; justify-content: center;
  height: clamp(70px, 12vw, 136px);
  font-size: clamp(52px, 8.8vw, 112px);
  line-height: .92; font-weight: 720; letter-spacing: -.04em;
  isolation: isolate;
}

/* 鎏金波纹扫过效果 */
.splash-wordmark::after {
  content: ''; position: absolute; top: 0; left: -100%; width: 60%; height: 100%;
  background: linear-gradient(105deg,
    transparent 0%,
    rgba(244,210,138,0) 30%,
    rgba(255,248,225,0.72) 48%,
    rgba(244,210,138,0.5) 52%,
    rgba(244,210,138,0) 70%,
    transparent 100%
  );
  opacity: 0;
  animation: splash-shimmer 1.2s cubic-bezier(.22,1,.36,1) 3.3s forwards;
  pointer-events: none;
}

/* "Mine" — 多层金属渐变（暗铜→古金→金属金→白金高光→金属金→古金→暗铜） */
.splash-word-mine {
  display: inline-block; white-space: nowrap;
  will-change: opacity, transform, letter-spacing;
  background: linear-gradient(135deg,
    #8B7355 0%,
    #C9A84C 18%,
    #D4AF37 30%,
    #F5E6B8 42%,
    #FFF8E1 50%,
    #F5E6B8 58%,
    #D4AF37 70%,
    #C9A84C 82%,
    #8B7355 100%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text; background-clip: text;
  color: transparent; -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 22px 72px rgba(0,0,0,.58))
         drop-shadow(-2px 0 0 rgba(139,115,85,.22))
         drop-shadow(2px 0 0 rgba(212,175,55,.18));
  opacity: 0;
  animation: splash-mine-in 800ms cubic-bezier(.22,1,.36,1) 2.0s forwards,
             splash-metal-flow 4s ease-in-out 2.8s infinite alternate;
}

/* "Chat" — 银白金属渐变（暗银→银灰→亮银→纯白高光→亮银→银灰→暗银） */
.splash-word-chat {
  display: inline-block; white-space: nowrap; margin-left: 0.06em;
  will-change: opacity, transform, letter-spacing;
  background: linear-gradient(135deg,
    #6B7280 0%,
    #9CA3AF 18%,
    #D1D5DB 30%,
    #F9FAFB 42%,
    #FFFFFF 50%,
    #F9FAFB 58%,
    #D1D5DB 70%,
    #9CA3AF 82%,
    #6B7280 100%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text; background-clip: text;
  color: transparent; -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 22px 72px rgba(0,0,0,.58))
         drop-shadow(0 0 12px rgba(212,175,55,.15));
  opacity: 0;
  animation: splash-chat-in 800ms cubic-bezier(.22,1,.36,1) 2.5s forwards,
             splash-metal-flow 4s ease-in-out 3.3s infinite alternate;
}

.splash-signal-line {
  position: relative;
  width: min(460px, 54vw); height: 2px;
  background: linear-gradient(90deg, transparent, rgba(139,115,85,.22), rgba(255,255,255,.78), rgba(212,175,55,.66), rgba(139,115,85,.22), transparent);
  opacity: 0; transform: scaleX(.12);
  box-shadow: 0 0 18px rgba(244,210,138,.24), 0 0 34px rgba(201,168,76,.10);
  animation: splash-signal-line 4200ms cubic-bezier(.22,1,.36,1) forwards;
}
.splash-signal-line::after {
  content: ''; position: absolute; left: 50%; top: 50%;
  width: 8px; height: 8px; border-radius: 50%;
  background: rgba(255,248,225,.82);
  box-shadow: 0 0 24px rgba(244,210,138,.54);
  transform: translate(-50%, -50%) scale(.32); opacity: 0;
  animation: splash-signal-blip 4200ms cubic-bezier(.22,1,.36,1) forwards;
}

.splash-sub {
  font-size: 10px; font-weight: 600; letter-spacing: .22em;
  color: rgba(244,210,138,.34); text-transform: uppercase;
  opacity: 0; animation: splash-sub-in 4200ms cubic-bezier(.22,1,.36,1) forwards;
}

.splash-enter {
  margin-top: 8px; font-size: 11px; font-weight: 700; letter-spacing: .24em;
  color: rgba(244,210,138,.62); text-transform: uppercase;
  opacity: 0; transform: translateY(10px);
  text-shadow: 0 0 18px rgba(201,168,76,.24), 0 0 34px rgba(212,175,55,.12);
  transition: opacity 620ms cubic-bezier(.22,1,.36,1), transform 620ms cubic-bezier(.22,1,.36,1);
  animation: splash-enter-pulse 1800ms ease-in-out infinite alternate;
}

/* ──── 关键帧动画 ──── */

@keyframes splash-field-breathe {
  0% { opacity: .72; transform: scale(1) }
  100% { opacity: 1; transform: scale(1.035) }
}

/* "Mine"从左飞入+弹性回弹 */
@keyframes splash-mine-in {
  0% { opacity: 0; transform: translateX(-120px) skewX(-12deg) scaleX(1.15); letter-spacing: .08em }
  40% { opacity: 1; transform: translateX(12px) skewX(2deg) scaleX(.97); letter-spacing: -.02em }
  60% { transform: translateX(-6px) skewX(-1deg) scaleX(1.02) }
  80% { transform: translateX(2px) skewX(0) scaleX(.99) }
  100% { opacity: 1; transform: translateX(0) skewX(0) scaleX(1); letter-spacing: -.04em }
}

/* "Chat"从右飞入+弹性回弹 */
@keyframes splash-chat-in {
  0% { opacity: 0; transform: translateX(120px) skewX(12deg) scaleX(1.15); letter-spacing: .08em }
  40% { opacity: 1; transform: translateX(-12px) skewX(-2deg) scaleX(.97); letter-spacing: -.02em }
  60% { transform: translateX(6px) skewX(1deg) scaleX(1.02) }
  80% { transform: translateX(-2px) skewX(0) scaleX(.99) }
  100% { opacity: 1; transform: translateX(0) skewX(0) scaleX(1); letter-spacing: -.04em }
}

/* 鎏金渐变流动 */
@keyframes splash-metal-flow {
  0% { background-position: 0% 50% }
  100% { background-position: 100% 50% }
}

/* 鎏金shimmer波纹 */
@keyframes splash-shimmer {
  0% { left: -100%; opacity: 0 }
  20% { opacity: 1 }
  100% { left: 200%; opacity: 0 }
}

@keyframes splash-signal-line {
  0%, 28% { opacity: 0; transform: scaleX(.10) }
  44% { opacity: .98; transform: scaleX(1.05) }
  64% { opacity: .70; transform: scaleX(.82) }
  76% { opacity: 1; transform: scaleX(1.14); box-shadow: 0 0 28px rgba(244,210,138,.36), 0 0 60px rgba(201,168,76,.18) }
  100% { opacity: .30; transform: scaleX(.64) }
}

@keyframes splash-signal-blip {
  0%, 42% { opacity: 0; left: 18%; transform: translate(-50%, -50%) scale(.24) }
  62% { opacity: .94; left: 50%; transform: translate(-50%, -50%) scale(1) }
  76% { opacity: 1; left: 50%; transform: translate(-50%, -50%) scale(1.45) }
  100% { opacity: .16; left: 82%; transform: translate(-50%, -50%) scale(.46) }
}

@keyframes splash-sub-in {
  0%, 38% { opacity: 0; transform: translateY(7px) }
  56% { opacity: .58; transform: translateY(0) }
  100% { opacity: .42; transform: translateY(0) }
}

@keyframes splash-enter-pulse {
  0% { opacity: .46; text-shadow: 0 0 14px rgba(201,168,76,.16), 0 0 26px rgba(212,175,55,.08) }
  100% { opacity: .78; text-shadow: 0 0 22px rgba(244,210,138,.30), 0 0 42px rgba(212,175,55,.16) }
}
</style>
