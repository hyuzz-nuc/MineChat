<script setup lang="ts">
/** 聊天主页面 - 三栏布局 */
</script>

<template>
  <div class="chat-layout">
    <!-- 功能导航栏 -->
    <nav class="chat-nav">
      <div class="nav-icon active">💬</div>
      <div class="nav-icon">👥</div>
      <div class="nav-icon">⚙️</div>
      <div class="nav-spacer"></div>
      <div class="nav-avatar">😊</div>
    </nav>

    <!-- 会话列表面板 -->
    <aside class="chat-sidebar glass-sidebar">
      <div class="sidebar-search">
        <input type="text" placeholder="搜索联系人或消息..." class="sidebar-search-input" />
      </div>
      <div class="sidebar-list">
        <p class="sidebar-empty">暂无会话</p>
      </div>
    </aside>

    <!-- 聊天主区域 -->
    <main class="chat-main">
      <div class="chat-header glass-panel">
        <span class="chat-header-name">选择一个会话开始聊天</span>
      </div>
      <div class="chat-messages">
        <div class="chat-empty">
          <span class="chat-empty-icon">✨</span>
          <p class="chat-empty-text">开启你的第一段对话</p>
        </div>
      </div>
      <div class="chat-input-area glass-panel">
        <input type="text" placeholder="输入消息..." class="chat-input" />
        <button class="chat-send-btn">📤</button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.chat-layout {
  height: 100vh;
  width: 100vw;
  display: flex;
  background: var(--bg-base);
  overflow: hidden;
}

/* 功能导航栏 */
.chat-nav {
  width: 64px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-4) 0;
  gap: var(--space-2);
  background: var(--bg-base);
}

.nav-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  font-size: 18px;
  cursor: pointer;
  color: rgba(255, 255, 255, .48);
  transition: color var(--duration-fast) var(--ease-out-expo),
              background var(--duration-fast) var(--ease-out-expo),
              transform var(--duration-fast) var(--ease-out-expo);
}

.nav-icon:hover {
  color: #fff;
  background: rgba(255, 255, 255, .06);
  transform: translateY(-1px);
}

.nav-icon.active {
  color: var(--accent);
  background: rgba(0, 245, 212, .08);
  box-shadow: inset 2px 0 0 var(--accent);
}

.nav-spacer {
  flex: 1;
}

.nav-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(0, 245, 212, .3), rgba(115, 167, 255, .3));
  border: 1px solid rgba(255, 255, 255, .12);
  font-size: 16px;
  cursor: pointer;
}

/* 会话列表侧栏 */
.chat-sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: var(--space-4);
  gap: var(--space-3);
}

.sidebar-search-input {
  width: 100%;
  height: 42px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, .04);
  border: 1px solid rgba(255, 255, 255, .08);
  color: var(--ink);
  font-size: var(--text-sm);
  transition: border-color var(--duration-fast) var(--ease-out-expo),
              box-shadow var(--duration-fast) var(--ease-out-expo);
}

.sidebar-search-input::placeholder {
  color: rgba(255, 255, 255, .22);
}

.sidebar-search-input:focus {
  border-color: rgba(var(--accent-rgb), .50);
  box-shadow: 0 0 0 1px rgba(var(--accent-rgb), .10), 0 0 20px rgba(var(--accent-rgb), .06);
}

.sidebar-list {
  flex: 1;
  overflow-y: auto;
}

.sidebar-empty {
  text-align: center;
  color: var(--muted);
  font-size: var(--text-sm);
  padding-top: var(--space-8);
}

/* 聊天主区域 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(0, 245, 212, .02) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(115, 167, 255, .015) 0%, transparent 50%),
    var(--bg-base);
}

.chat-header {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 var(--space-5);
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-top: none;
}

.chat-header-name {
  font-size: var(--text-md);
  font-weight: var(--weight-semibold);
  color: var(--muted);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-empty {
  text-align: center;
}

.chat-empty-icon {
  font-size: 32px;
}

.chat-empty-text {
  margin-top: var(--space-3);
  color: var(--muted);
  font-size: var(--text-base);
}

/* 输入区域 */
.chat-input-area {
  margin: var(--space-3) var(--space-4) var(--space-4);
  display: flex;
  align-items: center;
  padding: 0 var(--space-4);
  border-radius: var(--radius-xl);
  gap: var(--space-3);
}

.chat-input {
  flex: 1;
  height: 48px;
  color: var(--ink);
  font-size: var(--text-base);
}

.chat-input::placeholder {
  color: rgba(255, 255, 255, .22);
}

.chat-send-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: rgba(0, 245, 212, .12);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--duration-fast) var(--ease-out-expo),
              transform var(--duration-fast) var(--ease-out-expo);
}

.chat-send-btn:hover {
  background: rgba(0, 245, 212, .20);
  transform: translateY(-1px);
}
</style>
