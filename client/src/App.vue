<script setup lang="ts">
/**
 * MineChat 根组件
 * 包含SVG噪点纹理定义 + 路由出口
 */
</script>

<template>
  <!-- SVG 噪点纹理滤镜（全局复用） -->
  <svg class="svg-filters" aria-hidden="true">
    <defs>
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
    </defs>
  </svg>
  <router-view />
</template>

<style>
/* SVG滤镜容器：不可见，不影响布局 */
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
