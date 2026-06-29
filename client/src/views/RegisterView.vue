<script setup lang="ts">
/** 注册页 */
</script>

<template>
  <div class="register-page">
    <div class="register-card glass-panel">
      <h1 class="register-title">MineChat</h1>
      <p class="register-sub">创建新账号</p>
      <form class="register-form" @submit.prevent>
        <div class="register-field">
          <input type="text" placeholder="用户名" class="register-input" />
        </div>
        <div class="register-field">
          <input type="email" placeholder="邮箱" class="register-input" />
        </div>
        <div class="register-field">
          <input type="password" placeholder="密码" class="register-input" />
        </div>
        <button class="register-btn">注 册</button>
      </form>
      <p class="register-switch">
        已有账号？<router-link to="/login">登录</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.register-page {
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

.register-card {
  width: min(400px, 90vw);
  padding: var(--space-8);
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}

.register-title {
  font-size: var(--text-2xl);
  font-weight: var(--weight-bold);
  background: linear-gradient(94deg, #fff 26%, rgba(0, 245, 212, .98) 68%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

.register-sub {
  font-size: var(--text-sm);
  color: var(--muted);
  letter-spacing: .1em;
}

.register-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.register-input {
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

.register-input::placeholder {
  color: rgba(255, 255, 255, .22);
}

.register-input:focus {
  border-color: rgba(var(--accent-rgb), .50);
  box-shadow: 0 0 0 1px rgba(var(--accent-rgb), .10), 0 0 28px rgba(var(--accent-rgb), .08);
}

.register-btn {
  width: 100%;
  height: 48px;
  margin-top: var(--space-2);
  border-radius: var(--radius-lg);
  background: rgba(0, 245, 212, .12);
  border: 1px solid rgba(0, 245, 212, .34);
  color: var(--accent);
  font-size: var(--text-md);
  font-weight: var(--weight-bold);
  letter-spacing: .2em;
  transition: background var(--duration-fast) var(--ease-out-expo),
              border-color var(--duration-fast) var(--ease-out-expo),
              transform var(--duration-fast) var(--ease-out-expo);
}

.register-btn:hover {
  background: rgba(0, 245, 212, .20);
  border-color: rgba(0, 245, 212, .58);
  transform: translateY(-1px);
}

.register-switch {
  font-size: var(--text-sm);
  color: var(--muted);
}

.register-switch a {
  color: var(--accent);
}
</style>
