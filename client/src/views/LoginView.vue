<script setup lang="ts">
/** 登录页 */
</script>

<template>
  <div class="login-page">
    <div class="login-card glass-panel">
      <h1 class="login-title">MineChat</h1>
      <div class="login-signal-line"></div>
      <form class="login-form" @submit.prevent>
        <div class="login-field">
          <input type="text" placeholder="用户名" class="login-input" />
        </div>
        <div class="login-field">
          <input type="password" placeholder="密码" class="login-input" />
        </div>
        <button class="login-btn">登 录</button>
      </form>
      <p class="login-switch">
        还没有账号？<router-link to="/register">注册</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(0, 245, 212, .02) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(115, 167, 255, .015) 0%, transparent 50%),
    linear-gradient(180deg, var(--bg-base) 0%, var(--bg-paper) 100%);
}

.login-card {
  width: min(400px, 90vw);
  padding: var(--space-8);
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-5);
}

.login-title {
  font-size: var(--text-2xl);
  font-weight: var(--weight-bold);
  letter-spacing: -.02em;
  background: linear-gradient(94deg, #fff 26%, rgba(0, 245, 212, .98) 68%, rgba(255, 255, 255, .82));
  background-size: 300% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

.login-signal-line {
  width: 60%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(0, 245, 212, .22), rgba(255, 255, 255, .78), rgba(0, 245, 212, .22), transparent);
  border-radius: 999px;
  box-shadow: 0 0 18px rgba(0, 245, 212, .24);
}

.login-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.login-field {
  width: 100%;
}

.login-input {
  width: 100%;
  height: 48px;
  padding: 0 var(--space-5);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, .04);
  border: 1px solid rgba(255, 255, 255, .08);
  color: var(--ink);
  font-size: var(--text-base);
  transition: border-color var(--duration-fast) var(--ease-out-expo),
              box-shadow var(--duration-fast) var(--ease-out-expo);
}

.login-input::placeholder {
  color: rgba(255, 255, 255, .22);
}

.login-input:focus {
  border-color: rgba(var(--accent-rgb), .50);
  box-shadow: 0 0 0 1px rgba(var(--accent-rgb), .10), 0 0 28px rgba(var(--accent-rgb), .08);
}

.login-btn {
  width: 100%;
  height: 48px;
  border-radius: var(--radius-lg);
  background: rgba(0, 245, 212, .12);
  border: 1px solid rgba(0, 245, 212, .34);
  color: var(--accent);
  font-size: var(--text-md);
  font-weight: var(--weight-bold);
  letter-spacing: .2em;
  transition: background var(--duration-fast) var(--ease-out-expo),
              border-color var(--duration-fast) var(--ease-out-expo),
              transform var(--duration-fast) var(--ease-out-expo),
              box-shadow var(--duration-fast) var(--ease-out-expo);
}

.login-btn:hover {
  background: rgba(0, 245, 212, .20);
  border-color: rgba(0, 245, 212, .58);
  transform: translateY(-1px);
  box-shadow: 0 16px 42px rgba(0, 0, 0, .30), 0 0 22px rgba(0, 245, 212, .06), inset 0 1px 0 rgba(255, 255, 255, .10);
}

.login-switch {
  font-size: var(--text-sm);
  color: var(--muted);
}

.login-switch a {
  color: var(--accent);
}
</style>
