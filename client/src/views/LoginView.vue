<script setup lang="ts">
/**
 * 登录页 V3
 * 多方式登录（账号密码/手机号/邮箱） + 高级感宇宙背景
 */
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { loginApi, sendLoginCodeApi, loginByCodeApi } from '../api/auth';
import ParticleBackground from '../components/ParticleBackground.vue';

const router = useRouter();
const userStore = useUserStore();

// Tab 切换
type LoginTab = 'account' | 'phone' | 'email';
const activeTab = ref<LoginTab>('account');

// 账号密码登录
const account = ref('');
const password = ref('');

// 手机号登录
const phone = ref('');
const phoneCode = ref('');
const phoneCountdown = ref(0);

// 邮箱登录
const email = ref('');
const emailCode = ref('');
const emailCountdown = ref(0);

const loading = ref(false);
const errorMsg = ref('');

/** 倒计时 */
function startCountdown(type: 'phone' | 'email') {
  const ref_var = type === 'phone' ? phoneCountdown : emailCountdown;
  ref_var.value = 60;
  const timer = setInterval(() => {
    ref_var.value--;
    if (ref_var.value <= 0) clearInterval(timer);
  }, 1000);
}

/** 发送验证码 */
async function handleSendCode(type: 'phone' | 'email') {
  const target = type === 'phone' ? phone.value.trim() : email.value.trim();
  if (!target) {
    errorMsg.value = type === 'phone' ? '请输入手机号' : '请输入邮箱';
    return;
  }
  try {
    await sendLoginCodeApi({ type, target });
    startCountdown(type);
    errorMsg.value = '';
  } catch (err: any) {
    errorMsg.value = err.message || '发送失败';
  }
}

/** 登录 */
async function handleLogin() {
  loading.value = true;
  errorMsg.value = '';

  try {
    let res: any;
    if (activeTab.value === 'account') {
      if (!account.value.trim() || !password.value) {
        errorMsg.value = '请输入账号和密码';
        loading.value = false;
        return;
      }
      res = await loginApi({ account: account.value.trim(), password: password.value });
    } else if (activeTab.value === 'phone') {
      if (!phone.value.trim() || !phoneCode.value) {
        errorMsg.value = '请输入手机号和验证码';
        loading.value = false;
        return;
      }
      res = await loginByCodeApi({ type: 'phone', target: phone.value.trim(), code: phoneCode.value });
    } else {
      if (!email.value.trim() || !emailCode.value) {
        errorMsg.value = '请输入邮箱和验证码';
        loading.value = false;
        return;
      }
      res = await loginByCodeApi({ type: 'email', target: email.value.trim(), code: emailCode.value });
    }

    userStore.setLogin({
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
      userId: res.data.user.id,
      uid: res.data.user.uid,
      username: res.data.user.username,
      nickname: res.data.user.nickname || '',
      avatar: res.data.user.avatar || '',
    });
    router.push('/');
  } catch (err: any) {
    errorMsg.value = err.message || '登录失败，请重试';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <!-- 宇宙动态背景 -->
    <ParticleBackground />
    <div class="galaxy-vortex"></div>
    <div class="galaxy-vortex galaxy-vortex-2"></div>

    <!-- 登录卡片 -->
    <div class="login-card glass-panel">
      <h1 class="login-title">MineChat</h1>
      <div class="login-signal-line"></div>

      <!-- Tab 切换 -->
      <div class="login-tabs">
        <button
          class="login-tab"
          :class="{ active: activeTab === 'account' }"
          @click="activeTab = 'account'"
        >账号密码</button>
        <button
          class="login-tab"
          :class="{ active: activeTab === 'phone' }"
          @click="activeTab = 'phone'"
        >手机号</button>
        <button
          class="login-tab"
          :class="{ active: activeTab === 'email' }"
          @click="activeTab = 'email'"
        >邮箱</button>
      </div>

      <!-- 错误提示 -->
      <transition name="fade">
        <p v-if="errorMsg" class="login-error">{{ errorMsg }}</p>
      </transition>

      <!-- 账号密码表单 -->
      <form v-if="activeTab === 'account'" class="login-form" @submit.prevent="handleLogin">
        <div class="login-field">
          <input v-model="account" type="text" placeholder="用户名 / 邮箱" class="login-input" autocomplete="username" :disabled="loading" />
        </div>
        <div class="login-field">
          <input v-model="password" type="password" placeholder="密码" class="login-input" autocomplete="current-password" :disabled="loading" />
        </div>
        <button class="login-btn" type="submit" :disabled="loading">
          {{ loading ? '登录中...' : '登 录' }}
        </button>
      </form>

      <!-- 手机号表单 -->
      <form v-if="activeTab === 'phone'" class="login-form" @submit.prevent="handleLogin">
        <div class="login-field">
          <input v-model="phone" type="tel" placeholder="手机号" class="login-input" :disabled="loading" />
        </div>
        <div class="login-field code-field">
          <input v-model="phoneCode" type="text" placeholder="验证码" maxlength="6" class="login-input code-input" :disabled="loading" />
          <button type="button" class="send-code-btn" :disabled="phoneCountdown > 0" @click="handleSendCode('phone')">
            {{ phoneCountdown > 0 ? `${phoneCountdown}s` : '发送验证码' }}
          </button>
        </div>
        <button class="login-btn" type="submit" :disabled="loading">
          {{ loading ? '登录中...' : '登 录' }}
        </button>
      </form>

      <!-- 邮箱表单 -->
      <form v-if="activeTab === 'email'" class="login-form" @submit.prevent="handleLogin">
        <div class="login-field">
          <input v-model="email" type="email" placeholder="邮箱" class="login-input" :disabled="loading" />
        </div>
        <div class="login-field code-field">
          <input v-model="emailCode" type="text" placeholder="验证码" maxlength="6" class="login-input code-input" :disabled="loading" />
          <button type="button" class="send-code-btn" :disabled="emailCountdown > 0" @click="handleSendCode('email')">
            {{ emailCountdown > 0 ? `${emailCountdown}s` : '发送验证码' }}
          </button>
        </div>
        <button class="login-btn" type="submit" :disabled="loading">
          {{ loading ? '登录中...' : '登 录' }}
        </button>
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
  position: relative;
  overflow: hidden;
  background: var(--bg-base);
}

/* 星系旋涡 — CSS缓慢旋转螺旋光晕 */
.galaxy-vortex {
  position: absolute;
  top: 40%; left: 50%;
  width: min(60vw, 60vh);
  height: min(60vw, 60vh);
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(139,115,85,.04) 0%,
    rgba(212,175,55,.02) 30%,
    rgba(201,168,76,.01) 60%,
    transparent 100%
  );
  animation: galaxy-rotate 60s linear infinite;
  pointer-events: none;
  z-index: 0;
}
.galaxy-vortex-2 {
  top: 55%; left: 55%;
  width: min(40vw, 40vh);
  height: min(40vw, 40vh);
  opacity: .6;
  animation: galaxy-rotate-reverse 80s linear infinite;
}

@keyframes galaxy-rotate {
  0% { transform: translate(-50%, -50%) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
}
@keyframes galaxy-rotate-reverse {
  0% { transform: translate(-50%, -50%) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(-360deg); }
}

.login-card {
  width: min(420px, 88vw);
  padding: 40px 36px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  position: relative;
  z-index: 10;
  background: linear-gradient(
    135deg,
    rgba(139,115,85,.06) 0%,
    rgba(20,23,28,.82) 50%,
    rgba(8,9,11,.88) 100%
  );
  backdrop-filter: blur(34px) saturate(1.34);
  border: 1px solid rgba(212,175,55,.15);
  box-shadow:
    0 22px 64px rgba(0,0,0,.30),
    0 0 34px rgba(212,175,55,.052),
    inset 0 1px 0 rgba(245,230,184,.16);
}

.login-title {
  font-size: 32px;
  font-weight: 720;
  letter-spacing: -.02em;
  background: linear-gradient(135deg, #8B7355 0%, #C9A84C 20%, #D4AF37 35%, #F5E6B8 50%, #D4AF37 65%, #C9A84C 80%, #8B7355 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  animation: login-metal-flow 4s ease-in-out infinite alternate;
}

@keyframes login-metal-flow {
  0% { background-position: 0% 50% }
  100% { background-position: 100% 50% }
}

.login-signal-line {
  width: 60%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(139,115,85,.22), rgba(255,255,255,.78), rgba(212,175,55,.66), rgba(139,115,85,.22), transparent);
  border-radius: 999px;
  box-shadow: 0 0 18px rgba(212,175,55,.24);
}

/* Tab 切换 */
.login-tabs {
  display: flex;
  gap: 0;
  width: 100%;
  border-bottom: 1px solid rgba(212,175,55,.12);
  margin-bottom: 4px;
}
.login-tab {
  flex: 1;
  padding: 10px 0;
  background: none;
  border: none;
  color: var(--muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  transition: color .2s;
}
.login-tab:hover {
  color: var(--ink-2);
}
.login-tab.active {
  color: var(--accent);
}
.login-tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 20%;
  width: 60%;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  border-radius: 1px;
}

.login-error {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255, 71, 87, .10);
  border: 1px solid rgba(255, 71, 87, .24);
  color: #ff4757;
  font-size: 13px;
  text-align: center;
}

.login-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-field {
  width: 100%;
}

.code-field {
  display: flex;
  gap: 8px;
}

.code-input {
  flex: 1;
}

.send-code-btn {
  flex-shrink: 0;
  padding: 0 14px;
  height: 48px;
  border-radius: 12px;
  background: rgba(212,175,55,.1);
  color: var(--accent);
  border: 1px solid rgba(212,175,55,.2);
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  transition: background .2s;
}
.send-code-btn:hover:not(:disabled) {
  background: rgba(212,175,55,.2);
}
.send-code-btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.login-input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, .04);
  border: 1px solid rgba(212,175,55,.12);
  color: var(--ink);
  font-size: 14px;
  transition: border-color .2s, box-shadow .2s;
}
.login-input::placeholder {
  color: rgba(255, 255, 255, .22);
}
.login-input:focus {
  outline: none;
  border-color: rgba(212,175,55,.50);
  box-shadow: 0 0 0 1px rgba(212,175,55,.10), 0 0 28px rgba(212,175,55,.08);
}
.login-input:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.login-btn {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #C9A84C, #D4AF37, #C9A84C);
  border: 1px solid rgba(212,175,55,.34);
  color: #08090B;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: .2em;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(212,175,55,.3);
  transition: background .2s, transform .2s, box-shadow .2s;
}
.login-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #D4AF37, #F5E6B8, #D4AF37);
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(212,175,55,.4);
}
.login-btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.login-switch {
  font-size: 13px;
  color: var(--muted);
}
.login-switch a {
  color: var(--accent);
  text-decoration: none;
}
.login-switch a:hover {
  text-decoration: underline;
}
</style>
