<script setup lang="ts">
/**
 * MineChat 根组件
 * 开机动画 + 粒子动态背景 + SVG噪点纹理 + Electron标题栏 + 路由出口
 */
import SplashOverlay from './components/SplashOverlay.vue';
import ParticleBackground from './components/ParticleBackground.vue';
import TitleBar from './components/TitleBar.vue';
</script>

<template>
  <!-- 开机动画（z-index:300, 最顶层，5秒后消失） -->
  <SplashOverlay />
  <!-- 粒子动态背景（z-index:0, 最底层） -->
  <ParticleBackground />
  <!-- SVG 噪点纹理滤镜（全局复用） -->
  <svg class="svg-filters" aria-hidden="true">
    <defs>
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
    </defs>
  </svg>
  <!-- Electron 桌面版标题栏（Web版自动隐藏） -->
  <TitleBar />
  <router-view />
</template>

<style>
/* SVG滤镜容器 */
.svg-filters {
  position: fixed;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  pointer-events: none;
  z-index: -1;
}
</style>
