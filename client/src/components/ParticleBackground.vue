<script setup lang="ts">
/**
 * 粒子动态背景组件
 * Canvas 2D 深空粒子效果，z-index:0 置于所有UI之下
 */
import { ref, onMounted, onUnmounted } from 'vue';
import { ParticleEngine } from '../composables/particleEngine';

const canvasRef = ref<HTMLCanvasElement | null>(null);
let engine: ParticleEngine | null = null;

onMounted(() => {
  if (!canvasRef.value) return;
  engine = new ParticleEngine(canvasRef.value, {
    dustCount: 160,
    glowCount: 40,
    linkDistance: 120,
    pulseCount: 6,
    targetFps: 30,
    mouseRadius: 200,
    mouseForce: 0.3,
  });
  engine.start();
});

onUnmounted(() => {
  engine?.stop();
  engine = null;
});
</script>

<template>
  <canvas
    ref="canvasRef"
    class="particle-bg"
    aria-hidden="true"
  />
</template>

<style scoped>
.particle-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
