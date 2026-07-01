<script setup lang="ts">
/**
 * 开机动画叠加层
 * 参照 MineRadio splash 效果
 * 全屏覆盖 → 粒子动画+品牌文字 → 用户交互 → 退出过渡
 */
import { ref, onMounted, onUnmounted } from 'vue';
import { SplashEngine } from '../composables/splashEngine';

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
  // 退出动画1.18s
  setTimeout(() => {
    show.value = false;
    if (engine) { engine.destroy(); engine = null; }
  }, 1200);
}

function markReady() {
  ready.value = true;
}

onMounted(() => {
  const canvas = document.getElementById('splash-canvas') as HTMLCanvasElement;
  if (canvas) {
    engine = new SplashEngine(canvas);
    engine.start();
  }
  // 5秒后自动允许进入
  timer = setTimeout(markReady, 5000);

  // 点击或按键退出
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
        <span class="splash-word-mine">Mine</span>
        <span class="splash-word-chat">Chat</span>
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
    linear-gradient(115deg, transparent 0%, rgba(0,245,212,.055) 24%, transparent 42%, rgba(244,210,138,.052) 62%, transparent 82%),
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
.splash.exiting {
  pointer-events: none; opacity: 0; transform: scale(1.018);
}

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

.splash-wordmark {
  position: relative;
  display: flex; align-items: baseline; justify-content: center;
  height: clamp(70px, 12vw, 136px);
  min-width: min(74vw, 760px);
  font-size: clamp(52px, 8.8vw, 112px);
  line-height: .92; font-weight: 720; letter-spacing: -.055em;
  color: #f8f8f2;
  text-shadow: 0 20px 82px rgba(0,0,0,.68), -2px 0 18px rgba(0,245,212,.16), 2px 0 18px rgba(115,167,255,.12);
  isolation: isolate;
  filter: drop-shadow(0 0 22px rgba(0,245,212,.075));
}

.splash-word-mine {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  white-space: nowrap; will-change: opacity, transform, letter-spacing;
  opacity: 0;
  animation: splash-mine-in 5200ms cubic-bezier(.22,1,.36,1) forwards;
  text-shadow: -2px 0 0 rgba(0,245,212,.24), 2px 0 0 rgba(115,167,255,.18), 0 22px 72px rgba(0,0,0,.58), 0 0 34px rgba(0,245,212,.10);
}

.splash-word-chat {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  white-space: nowrap; will-change: opacity, transform, letter-spacing;
  opacity: 0; letter-spacing: -.018em;
  background: linear-gradient(94deg, rgba(255,255,255,.06), #fff 26%, rgba(0,245,212,.98) 48%, rgba(244,210,138,.90) 68%, rgba(255,255,255,.82));
  background-size: 300% 100%;
  -webkit-background-clip: text; background-clip: text;
  color: transparent; -webkit-text-fill-color: transparent;
  animation: splash-chat-in 5200ms cubic-bezier(.22,1,.36,1) forwards;
}

.splash-signal-line {
  position: relative;
  width: min(460px, 54vw); height: 2px;
  background: linear-gradient(90deg, transparent, rgba(0,245,212,.22), rgba(255,255,255,.78), rgba(244,210,138,.66), rgba(115,167,255,.22), transparent);
  opacity: 0; transform: scaleX(.12);
  box-shadow: 0 0 18px rgba(0,245,212,.24), 0 0 34px rgba(244,210,138,.10);
  animation: splash-signal-line 4200ms cubic-bezier(.22,1,.36,1) forwards;
}
.splash-signal-line::after {
  content: ''; position: absolute; left: 50%; top: 50%;
  width: 8px; height: 8px; border-radius: 50%;
  background: rgba(255,255,255,.82);
  box-shadow: 0 0 24px rgba(0,245,212,.54);
  transform: translate(-50%, -50%) scale(.32); opacity: 0;
  animation: splash-signal-blip 4200ms cubic-bezier(.22,1,.36,1) forwards;
}

.splash-sub {
  font-size: 10px; font-weight: 600; letter-spacing: .22em;
  color: rgba(255,255,255,.34); text-transform: uppercase;
  opacity: 0; animation: splash-sub-in 4200ms cubic-bezier(.22,1,.36,1) forwards;
}

.splash-enter {
  margin-top: 8px; font-size: 11px; font-weight: 700; letter-spacing: .24em;
  color: rgba(255,255,255,.62); text-transform: uppercase;
  opacity: 0; transform: translateY(10px);
  text-shadow: 0 0 18px rgba(0,245,212,.24), 0 0 34px rgba(244,210,138,.12);
  transition: opacity 620ms cubic-bezier(.22,1,.36,1), transform 620ms cubic-bezier(.22,1,.36,1);
  animation: splash-enter-pulse 1800ms ease-in-out infinite alternate;
}

@keyframes splash-field-breathe {
  0% { opacity: .72; transform: scale(1) }
  100% { opacity: 1; transform: scale(1.035) }
}

@keyframes splash-mine-in {
  0% { opacity: 0; clip-path: inset(48% 0 49% 0); transform: translate(calc(-50% - 10px), -42%) skewX(-10deg) scaleX(1.08); letter-spacing: .055em }
  14% { opacity: .92; clip-path: inset(40% 0 42% 0); transform: translate(calc(-50% - 4px), -50%) skewX(-4deg) scaleX(1.04); letter-spacing: .014em }
  26% { opacity: 1; clip-path: inset(0); transform: translate(-50%, -50%) skewX(0) scaleX(1); letter-spacing: -.040em }
  48% { opacity: 1; transform: translate(-50%, -50%) scale(1) }
  67% { opacity: 1; transform: translate(calc(-50% - 2px), -50%) }
  100% { opacity: 1; transform: translate(-50%, -50%) }
}

@keyframes splash-chat-in {
  0%, 32% { opacity: 0; clip-path: inset(52% 0 44% 0); transform: translate(calc(-50% + 80px), -50%) skewX(9deg) scaleX(1.06); background-position: 0 0 }
  48% { opacity: .88; clip-path: inset(34% 0 32% 0); transform: translate(calc(-50% + 72px), -50%) skewX(3deg) scaleX(1.02); background-position: 52% 0 }
  66% { opacity: 1; clip-path: inset(0); transform: translate(calc(-50% + 70px), -50%) scale(1); background-position: 76% 0 }
  100% { opacity: 1; transform: translate(-50%, -50%); background-position: 100% 0 }
}

@keyframes splash-signal-line {
  0%, 28% { opacity: 0; transform: scaleX(.10) }
  44% { opacity: .98; transform: scaleX(1.05) }
  64% { opacity: .70; transform: scaleX(.82) }
  76% { opacity: 1; transform: scaleX(1.14); box-shadow: 0 0 28px rgba(0,245,212,.36), 0 0 60px rgba(244,210,138,.18) }
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
  0% { opacity: .46; text-shadow: 0 0 14px rgba(0,245,212,.16), 0 0 26px rgba(244,210,138,.08) }
  100% { opacity: .78; text-shadow: 0 0 22px rgba(0,245,212,.30), 0 0 42px rgba(244,210,138,.16) }
}
</style>
