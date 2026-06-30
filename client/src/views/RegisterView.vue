<script setup lang="ts">
/**
 * 注册页
 * 用户名 + 邮箱 + 密码 + 昵称
 */
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { registerApi } from '../api/auth';

const router = useRouter();
const userStore = useUserStore();

const username = ref('');
const email = ref('');
const password = ref('');
const nickname = ref('');
const loading = ref(false);
const errorMsg = ref('');

/** 注册 */
async function handleRegister() {
  // 前端基础校验
  if (!username.value.trim()) {
    errorMsg.value = '请输入用户名';
    return;
  }
  if (username.value.trim().length < 3) {
    errorMsg.value = '用户名至少3个字符';
    return;
  }
  if (!email.value.trim()) {
    errorMsg.value = '请输入邮箱';
    return;
  }
  if (password.value.length < 8) {
    errorMsg.value = '密码至少8个字符';
    return;
  }
  if (!nickname.value.trim()) {
    errorMsg.value = '请输入昵称';
    return;
  }

  loading.value = true;
  errorMsg.value = '';

  try {
    const res: any = await registerApi({
      username: username.value.trim(),
      email: email.value.trim(),
      password: password.value,
      nickname: nickname.value.trim(),
    });

    // 注册成功自动登录
    userStore.setLogin({
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
      userId: res.data.user.id,
      uid: res.data.user.uid,
      username: res.data.user.username,
      avatar: res.data.user.avatar || '',
    });

    router.push('/');
  } catch (err: any) {
    errorMsg.value = err.message || '注册失败，请重试';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="register-page">
    <div class="register-card glass-panel">
      <h1 class="register-title">MineChat</h1>
      <p class="register-sub">创建新账号</p>

      <!-- 错误提示 -->
      <transition name="fade">
        <p v-if="errorMsg" class="register-error">{{ errorMsg }}</p>
      </transition>

      <form class="register-form" @submit.prevent="handleRegister">
        <div class="register-field">
          <input
            v-model="username"
            type="text"
            placeholder="用户名（3-32位字母数字下划线）"
            class="register-input"
            autocomplete="username"
            :disabled="loading"
          />
        </div>
        <div class="register-field">
          <input
            v-model="email"
            type="email"
            placeholder="邮箱"
            class="register-input"
            autocomplete="email"
            :disabled="loading"
          />
        </div>
        <div class="register-field">
          <input
            v-model="nickname"
            type="text"
            placeholder="昵称"
            class="register-input"
            :disabled="loading"
          />
        </div>
        <div class="register-field">
          <input
            v-model="password"
            type="password"
            placeholder="密码（8位以上，含字母和数字）"
            class="register-input"
            autocomplete="new-password"
            :disabled="loading"
          />
        </div>
        <button class="register-btn" type="submit" :disabled="loading">
          {{ loading ? '注册中...' : '注 册' }}
        </button>
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

.register-error {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: rgba(255, 71, 87, .10);
  border: 1px solid rgba(255, 71, 87, .24);
  color: #ff4757;
  font-size: var(--text-sm);
  text-align: center;
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
  outline: none;
  border-color: rgba(var(--accent-rgb), .50);
  box-shadow: 0 0 0 1px rgba(var(--accent-rgb), .10), 0 0 28px rgba(var(--accent-rgb), .08);
}

.register-input:disabled {
  opacity: .5;
  cursor: not-allowed;
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
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out-expo),
              border-color var(--duration-fast) var(--ease-out-expo),
              transform var(--duration-fast) var(--ease-out-expo),
              box-shadow var(--duration-fast) var(--ease-out-expo);
}

.register-btn:hover:not(:disabled) {
  background: rgba(0, 245, 212, .20);
  border-color: rgba(0, 245, 212, .58);
  transform: translateY(-1px);
  box-shadow: 0 16px 42px rgba(0, 0, 0, .30), 0 0 22px rgba(0, 245, 212, .06), inset 0 1px 0 rgba(255, 255, 255, .10);
}

.register-btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.register-switch {
  font-size: var(--text-sm);
  color: var(--muted);
}

.register-switch a {
  color: var(--accent);
  text-decoration: none;
  transition: opacity var(--duration-fast);
}

.register-switch a:hover {
  opacity: .8;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--duration-fast);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
