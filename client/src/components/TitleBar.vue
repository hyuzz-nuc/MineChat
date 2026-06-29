<script setup lang="ts">
/**
 * 桌面版自定义标题栏组件
 * 仅在Electron环境下显示
 */
import { ref, onMounted } from 'vue';
import { isElectron, minimizeWindow, maximizeWindow, closeWindow, isWindowMaximized } from '../composables/useElectron';

const maximized = ref(false);

onMounted(async () => {
  maximized.value = await isWindowMaximized();
});

function handleMaximize() {
  maximizeWindow();
  maximized.value = !maximized.value;
}
</script>

<template>
  <div v-if="isElectron()" class="titlebar">
    <div class="titlebar-drag">
      <span class="titlebar-title">MineChat</span>
    </div>
    <div class="titlebar-controls">
      <button class="titlebar-btn" @click="minimizeWindow()" title="最小化">
        <svg width="10" height="1"><rect width="10" height="1" fill="currentColor"/></svg>
      </button>
      <button class="titlebar-btn" @click="handleMaximize()" title="最大化">
        <svg v-if="!maximized" width="10" height="10"><rect x="0" y="0" width="10" height="10" stroke="currentColor" stroke-width="1" fill="none"/></svg>
        <svg v-else width="10" height="10"><rect x="2" y="0" width="8" height="8" stroke="currentColor" stroke-width="1" fill="none"/><rect x="0" y="2" width="8" height="8" stroke="currentColor" stroke-width="1" fill="none"/></svg>
      </button>
      <button class="titlebar-btn titlebar-close" @click="closeWindow()" title="关闭">
        <svg width="10" height="10"><path d="M0 0L10 10M10 0L0 10" stroke="currentColor" stroke-width="1"/></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.titlebar {
  height: 32px;
  display: flex;
  align-items: center;
  background: var(--bg-base);
  -webkit-app-region: no-drag;
  user-select: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
}

.titlebar-drag {
  flex: 1;
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  padding-left: 12px;
}

.titlebar-title {
  font-size: 12px;
  color: var(--muted);
  letter-spacing: .05em;
}

.titlebar-controls {
  -webkit-app-region: no-drag;
  display: flex;
  gap: 0;
}

.titlebar-btn {
  width: 46px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, .48);
  transition: background var(--duration-fast), color var(--duration-fast);
}

.titlebar-btn:hover {
  background: rgba(255, 255, 255, .08);
  color: #fff;
}

.titlebar-close:hover {
  background: #e81123;
  color: #fff;
}
</style>
