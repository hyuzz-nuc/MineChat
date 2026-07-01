<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '../stores/user';
import { getProfileApi, updateProfileApi, sendCodeApi, bindAccountApi, unbindAccountApi } from '../api/auth';
import { useSocket } from '../composables/useSocket';

const userStore = useUserStore();
const profile = ref<any>(null);
const editingNickname = ref(false);
const editingBio = ref(false);
const nicknameInput = ref('');
const bioInput = ref('');
const showStatusMenu = ref(false);
const copyToast = ref(false);
const showBindModal = ref(false);
const bindType = ref<'email' | 'phone'>('email');
const bindTarget = ref('');
const bindCode = ref('');
const bindCooldown = ref(0);
const bindLoading = ref(false);
const bindError = ref('');
const bindSuccess = ref('');
const isUnbindMode = ref(false);
let cooldownTimer: ReturnType<typeof setInterval> | null = null;

async function fetchProfile() {
  try {
    const r: any = await getProfileApi();
    profile.value = r.data;
  } catch (e) { console.error(e); }
}

async function saveNickname() {
  if (!nicknameInput.value.trim()) return;
  try {
    await updateProfileApi({ nickname: nicknameInput.value.trim() });
    if (profile.value) profile.value.nickname = nicknameInput.value.trim();
    editingNickname.value = false;
  } catch (e) { console.error(e); }
}

async function saveBio() {
  try {
    await updateProfileApi({ bio: bioInput.value.trim() || '' });
    if (profile.value) profile.value.bio = bioInput.value.trim();
    editingBio.value = false;
  } catch (e) { console.error(e); }
}

function setStatus(s: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'AWAY') {
  const socket = useSocket();
  socket.emit('presence:update', { status: s });
  if (profile.value) profile.value.status = s;
  showStatusMenu.value = false;
}

async function copyUid() {
  if (!profile.value) return;
  try {
    await navigator.clipboard.writeText(profile.value.uid);
    copyToast.value = true;
    setTimeout(() => { copyToast.value = false; }, 2000);
  } catch { /* fallback */ }
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

const statusMap: Record<string, { label: string; emoji: string }> = {
  ONLINE: { label: '在线', emoji: '🟢' },
  OFFLINE: { label: '离线', emoji: '⚫' },
  BUSY: { label: '忙碌', emoji: '🔴' },
  AWAY: { label: '离开', emoji: '🟡' },
};
const currentStatus = computed(() => statusMap[profile.value?.status || 'OFFLINE'] || statusMap.OFFLINE);

/* ──── 绑定相关 ──── */

function startCooldown() {
  bindCooldown.value = 60;
  if (cooldownTimer) clearInterval(cooldownTimer);
  cooldownTimer = setInterval(() => {
    bindCooldown.value--;
    if (bindCooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
    }
  }, 1000);
}

function openBindModal(type: 'email' | 'phone') {
  bindType.value = type;
  bindTarget.value = '';
  bindCode.value = '';
  bindCooldown.value = 0;
  bindLoading.value = false;
  bindError.value = '';
  bindSuccess.value = '';
  isUnbindMode.value = false;
  showBindModal.value = true;
}

async function sendBindCode() {
  bindError.value = '';
  if (bindType.value === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bindTarget.value)) {
    bindError.value = '邮箱格式不正确';
    return;
  }
  if (bindType.value === 'phone' && !/^1[3-9]\d{9}$/.test(bindTarget.value)) {
    bindError.value = '手机号格式不正确';
    return;
  }
  try {
    await sendCodeApi({ type: bindType.value, target: bindTarget.value, purpose: isUnbindMode.value ? 'unbind' : 'bind' });
    startCooldown();
  } catch (e: any) { bindError.value = e.message || '发送失败'; }
}

async function confirmBind() {
  bindError.value = '';
  if (!bindTarget.value.trim()) { bindError.value = '请输入邮箱或手机号'; return; }
  if (!bindCode.value || bindCode.value.length !== 6) { bindError.value = '请输入6位验证码'; return; }
  bindLoading.value = true;
  try {
    const r: any = await bindAccountApi({ type: bindType.value, target: bindTarget.value, code: bindCode.value });
    if (profile.value) {
      if (bindType.value === 'email') {
        profile.value.email = r.data.email;
        profile.value.emailVerified = r.data.emailVerified;
      } else {
        profile.value.phone = r.data.phone;
        profile.value.phoneVerified = r.data.phoneVerified;
      }
    }
    bindSuccess.value = '绑定成功！';
    setTimeout(() => { showBindModal.value = false; }, 1500);
  } catch (e: any) { bindError.value = e.message || '绑定失败'; }
  finally { bindLoading.value = false; }
}

async function doUnbind(type: 'email' | 'phone') {
  const t = type === 'email' ? profile.value?.email : profile.value?.phone;
  if (!t) return;
  try {
    await sendCodeApi({ type, target: t, purpose: 'unbind' });
    bindType.value = type;
    bindTarget.value = t;
    bindCode.value = '';
    bindError.value = '';
    bindSuccess.value = '';
    bindLoading.value = false;
    isUnbindMode.value = true;
    showBindModal.value = true;
    startCooldown();
  } catch (e: any) {
    bindError.value = e.message || '发送验证码失败';
    showBindModal.value = true;
  }
}

async function confirmUnbind() {
  bindError.value = '';
  if (!bindCode.value || bindCode.value.length !== 6) { bindError.value = '请输入6位验证码'; return; }
  bindLoading.value = true;
  try {
    await unbindAccountApi({ type: bindType.value, code: bindCode.value });
    if (profile.value) {
      if (bindType.value === 'email') {
        profile.value.email = '';
        profile.value.emailVerified = false;
      } else {
        profile.value.phone = null;
        profile.value.phoneVerified = false;
      }
    }
    bindSuccess.value = '解绑成功！';
    setTimeout(() => { showBindModal.value = false; isUnbindMode.value = false; }, 1500);
  } catch (e: any) { bindError.value = e.message || '解绑失败'; }
  finally { bindLoading.value = false; }
}

function handleSubmit() { isUnbindMode.value ? confirmUnbind() : confirmBind(); }

function closeBindModal() {
  showBindModal.value = false;
  isUnbindMode.value = false;
  if (cooldownTimer) { clearInterval(cooldownTimer); cooldownTimer = null; }
  bindCooldown.value = 0;
}

function onClickOutside() { if (showStatusMenu.value) showStatusMenu.value = false; }

onMounted(() => { fetchProfile(); document.addEventListener('click', onClickOutside); });
onUnmounted(() => {
  document.removeEventListener('click', onClickOutside);
  if (cooldownTimer) { clearInterval(cooldownTimer); cooldownTimer = null; }
});

const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <div class="profile-panel glass-panel" @click.stop>
    <button class="profile-close" @click="emit('close')">←</button>
    <div v-if="profile" class="profile-content">
      <!-- 头像 -->
      <div class="profile-avatar-wrap">
        <div class="profile-avatar">
          <img v-if="profile.avatar" :src="profile.avatar" alt="" />
          <span v-else class="profile-avatar-text">{{ profile.nickname?.charAt(0)?.toUpperCase() || '?' }}</span>
        </div>
      </div>
      <!-- 昵称 -->
      <div class="profile-field">
        <div v-if="editingNickname" class="profile-edit-row">
          <input v-model="nicknameInput" class="profile-input" maxlength="32" @keydown.enter="saveNickname" @keydown.esc="editingNickname = false" />
          <button class="profile-save-btn" @click="saveNickname">✓</button>
          <button class="profile-cancel-btn" @click="editingNickname = false">✕</button>
        </div>
        <div v-else class="profile-display-row">
          <span class="profile-nickname">{{ profile.nickname }}</span>
          <button class="profile-edit-btn" @click="nicknameInput = profile.nickname; editingNickname = true">✏️</button>
        </div>
      </div>
      <!-- 用户名 -->
      <div class="profile-username">@{{ profile.username }}</div>
      <!-- UID -->
      <div class="profile-uid" @click="copyUid">
        <span class="uid-text">#{{ profile.uid }}</span>
        <span class="uid-copy">📋</span>
      </div>
      <div v-if="copyToast" class="copy-toast">UID已复制</div>
      <!-- 在线状态 -->
      <div class="profile-section">
        <div class="profile-section-title">状态</div>
        <div class="status-selector" @click.stop="showStatusMenu = !showStatusMenu">
          <span>{{ currentStatus.emoji }} {{ currentStatus.label }}</span>
          <span class="status-arrow">▼</span>
        </div>
        <div v-if="showStatusMenu" class="status-menu" @click.stop>
          <div class="status-option" @click="setStatus('ONLINE')">🟢 在线</div>
          <div class="status-option" @click="setStatus('BUSY')">🔴 忙碌</div>
          <div class="status-option" @click="setStatus('AWAY')">🟡 离开</div>
          <div class="status-option" @click="setStatus('OFFLINE')">⚫ 离线</div>
        </div>
      </div>
      <!-- 账号绑定 -->
      <div class="profile-section">
        <div class="profile-section-title">账号绑定</div>
        <!-- 邮箱 -->
        <div class="bind-item">
          <div class="bind-info">
            <span class="bind-icon">📧</span>
            <span class="bind-label">邮箱</span>
          </div>
          <div v-if="profile.emailVerified" class="bind-status">
            <span class="bind-value">{{ profile.email }}</span>
            <span class="bind-verified">✅</span>
            <button class="bind-action-btn" @click="doUnbind('email')">解绑</button>
          </div>
          <div v-else class="bind-status">
            <span class="bind-unbound">未绑定</span>
            <button class="bind-action-btn bind-btn-primary" @click="openBindModal('email')">绑定</button>
          </div>
        </div>
        <!-- 手机 -->
        <div class="bind-item">
          <div class="bind-info">
            <span class="bind-icon">📱</span>
            <span class="bind-label">手机</span>
          </div>
          <div v-if="profile.phoneVerified" class="bind-status">
            <span class="bind-value">{{ profile.phone }}</span>
            <span class="bind-verified">✅</span>
            <button class="bind-action-btn" @click="doUnbind('phone')">解绑</button>
          </div>
          <div v-else class="bind-status">
            <span class="bind-unbound">未绑定</span>
            <button class="bind-action-btn bind-btn-primary" @click="openBindModal('phone')">绑定</button>
          </div>
        </div>
      </div>
      <!-- 个性签名 -->
      <div class="profile-section">
        <div class="profile-section-title">签名</div>
        <div v-if="editingBio" class="profile-edit-col">
          <textarea v-model="bioInput" class="profile-textarea" maxlength="200" rows="3" @keydown.esc="editingBio = false"></textarea>
          <div class="profile-edit-actions">
            <button class="profile-save-btn" @click="saveBio">✓</button>
            <button class="profile-cancel-btn" @click="editingBio = false">✕</button>
          </div>
        </div>
        <div v-else class="profile-display-row">
          <span class="profile-bio">{{ profile.bio || '还没有签名' }}</span>
          <button class="profile-edit-btn" @click="bioInput = profile.bio || ''; editingBio = true">✏️</button>
        </div>
      </div>
      <!-- 注册时间 -->
      <div class="profile-section">
        <div class="profile-section-title">信息</div>
        <div class="profile-meta">📅 注册于 {{ formatDate(profile.createdAt) }}</div>
      </div>
      <!-- 退出登录 -->
      <div class="profile-section profile-logout">
        <button class="btn-logout" @click="userStore.clearLogin(); $router.push('/login')">退出登录</button>
      </div>
    </div>

    <!-- 绑定/解绑弹窗 -->
    <div v-if="showBindModal" class="bind-modal-overlay" @click.self="closeBindModal">
      <div class="bind-modal glass-panel">
        <div class="bind-modal-title">{{ isUnbindMode ? '解绑' : '绑定' }}{{ bindType === 'email' ? '邮箱' : '手机号' }}</div>
        <!-- 目标输入（解绑模式只读） -->
        <div v-if="!isUnbindMode" class="bind-field">
          <label class="bind-field-label">{{ bindType === 'email' ? '邮箱地址' : '手机号' }}</label>
          <input v-model="bindTarget" class="profile-input" :placeholder="bindType === 'email' ? 'example@email.com' : '13800138000'" />
        </div>
        <div v-else class="bind-field">
          <label class="bind-field-label">{{ bindType === 'email' ? '邮箱地址' : '手机号' }}</label>
          <div class="bind-target-display">{{ bindTarget }}</div>
        </div>
        <!-- 验证码 -->
        <div class="bind-field">
          <label class="bind-field-label">验证码</label>
          <div class="code-row">
            <input v-model="bindCode" class="profile-input code-input" maxlength="6" placeholder="6位验证码" />
            <button class="send-code-btn" :disabled="bindCooldown > 0" @click="sendBindCode">
              {{ bindCooldown > 0 ? `${bindCooldown}s` : '发送验证码' }}
            </button>
          </div>
        </div>
        <!-- 错误/成功提示 -->
        <div v-if="bindError" class="bind-msg bind-error">{{ bindError }}</div>
        <div v-if="bindSuccess" class="bind-msg bind-success">{{ bindSuccess }}</div>
        <!-- 操作按钮 -->
        <div class="bind-modal-actions">
          <button class="profile-cancel-btn" @click="closeBindModal">取消</button>
          <button class="profile-save-btn bind-confirm-btn" :disabled="bindLoading" @click="handleSubmit">
            {{ bindLoading ? '处理中...' : isUnbindMode ? '确认解绑' : '确认绑定' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-panel {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: var(--space-4);
  gap: var(--space-3);
  animation: slideInLeft .3s var(--ease-out-expo);
}

@keyframes slideInLeft {
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.profile-close {
  align-self: flex-start;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: var(--radius-md);
  color: var(--muted);
  cursor: pointer;
  font-size: 16px;
  padding: 4px 12px;
  transition: background var(--duration-fast) var(--ease-out-expo), color var(--duration-fast) var(--ease-out-expo);
}
.profile-close:hover { background: rgba(255,255,255,.1); color: #fff; }

.profile-content { display: flex; flex-direction: column; gap: var(--space-3); }

.profile-avatar-wrap { display: flex; justify-content: center; }
.profile-avatar {
  width: 80px; height: 80px; border-radius: 50%; overflow: hidden;
  background: linear-gradient(135deg, rgba(212,175,55,.3), rgba(139,157,175,.3));
  border: 2px solid rgba(212,175,55,.3);
  display: flex; align-items: center; justify-content: center;
}
.profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
.profile-avatar-text { font-size: 28px; font-weight: 700; color: #fff; }

.profile-field { text-align: center; }
.profile-display-row { display: flex; align-items: center; justify-content: center; gap: var(--space-2); }
.profile-nickname { font-size: var(--text-lg); font-weight: 700; color: var(--ink); }
.profile-edit-btn { opacity: 0; background: none; border: none; cursor: pointer; font-size: 14px; transition: opacity var(--duration-fast); }
.profile-display-row:hover .profile-edit-btn { opacity: 1; }

.profile-edit-row { display: flex; align-items: center; gap: var(--space-2); }
.profile-input {
  flex: 1; padding: 6px 10px; border-radius: var(--radius-md);
  background: rgba(255,255,255,.06); border: 1px solid rgba(212,175,55,.3);
  color: var(--ink); font-size: var(--text-sm); outline: none;
}
.profile-input:focus { border-color: var(--accent); box-shadow: 0 0 0 1px rgba(var(--accent-rgb),.2); }

.profile-textarea {
  width: 100%; padding: 8px 10px; border-radius: var(--radius-md);
  background: rgba(255,255,255,.06); border: 1px solid rgba(212,175,55,.3);
  color: var(--ink); font-size: var(--text-sm); outline: none; resize: none;
  font-family: inherit;
}
.profile-textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 1px rgba(var(--accent-rgb),.2); }
.profile-edit-actions { display: flex; gap: 4px; margin-top: 4px; }
.profile-edit-col { display: flex; flex-direction: column; gap: 4px; }

.profile-save-btn {
  padding: 2px 8px; border-radius: var(--radius-sm); background: rgba(212,175,55,.15);
  color: var(--accent); border: 1px solid rgba(212,175,55,.3); cursor: pointer; font-size: 13px;
}
.profile-cancel-btn {
  padding: 2px 8px; border-radius: var(--radius-sm); background: rgba(255,71,87,.1);
  color: #FF4757; border: 1px solid rgba(255,71,87,.2); cursor: pointer; font-size: 13px;
}

.profile-username { text-align: center; font-size: 12px; color: var(--muted); }

.profile-uid {
  text-align: center; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;
  padding: 4px 0; border-radius: var(--radius-md); transition: background var(--duration-fast);
}
.profile-uid:hover { background: rgba(212,175,55,.08); }
.uid-text { font-family: monospace; font-size: 13px; color: var(--accent); font-weight: 600; }
.uid-copy { font-size: 12px; opacity: .5; }

.copy-toast {
  text-align: center; font-size: 12px; color: var(--accent);
  animation: fadeInUp .3s var(--ease-out-expo);
}

.profile-section { margin-top: var(--space-2); }
.profile-section-title {
  font-size: 11px; color: var(--muted); text-transform: uppercase;
  letter-spacing: 1px; margin-bottom: var(--space-2);
  padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,.06);
}

.status-selector {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 10px; border-radius: var(--radius-md);
  background: rgba(255,255,255,.04); cursor: pointer; font-size: var(--text-sm);
  color: var(--ink); transition: background var(--duration-fast);
}
.status-selector:hover { background: rgba(255,255,255,.08); }
.status-arrow { font-size: 10px; color: var(--muted); }

.status-menu {
  margin-top: 4px; border-radius: var(--radius-md);
  background: rgba(20,21,30,.95); border: 1px solid rgba(255,255,255,.1);
  overflow: hidden;
}
.status-option {
  padding: 8px 12px; cursor: pointer; font-size: var(--text-sm);
  color: var(--ink); transition: background var(--duration-fast);
}
.status-option:hover { background: rgba(212,175,55,.08); }

.profile-bio { font-size: var(--text-sm); color: var(--muted); line-height: 1.5; }

.profile-meta { font-size: 12px; color: var(--muted); }

.profile-logout { margin-top: auto; }
.btn-logout {
  width: 100%; padding: 8px; border-radius: var(--radius-md);
  background: rgba(255,71,87,.1); color: #FF4757;
  border: 1px solid rgba(255,71,87,.2); font-size: var(--text-sm);
  cursor: pointer; transition: background var(--duration-fast);
}
.btn-logout:hover { background: rgba(255,71,87,.2); }

/* ──── 账号绑定样式 ──── */
.bind-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,.04);
}
.bind-info { display: flex; align-items: center; gap: 6px; }
.bind-icon { font-size: 14px; }
.bind-label { font-size: var(--text-sm); color: var(--ink); }
.bind-status { display: flex; align-items: center; gap: 6px; }
.bind-value { font-size: 12px; color: var(--muted); max-width: 120px; overflow: hidden; text-overflow: ellipsis; }
.bind-verified { font-size: 12px; }
.bind-unbound { font-size: 12px; color: rgba(255,255,255,.3); }
.bind-action-btn {
  padding: 3px 10px; border-radius: var(--radius-sm); font-size: 12px; cursor: pointer;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
  color: var(--muted); transition: all var(--duration-fast);
}
.bind-action-btn:hover { background: rgba(255,255,255,.1); color: var(--ink); }
.bind-btn-primary {
  background: rgba(212,175,55,.1); color: var(--accent); border-color: rgba(212,175,55,.2);
}
.bind-btn-primary:hover { background: rgba(212,175,55,.2); }

/* ──── 绑定弹窗 ──── */
.bind-modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(4px);
}
.bind-modal {
  width: 340px; padding: var(--space-4); border-radius: var(--radius-lg);
  display: flex; flex-direction: column; gap: var(--space-3);
}
.bind-modal-title {
  font-size: var(--text-lg); font-weight: 700; color: var(--ink); text-align: center;
}
.bind-field { display: flex; flex-direction: column; gap: 4px; }
.bind-field-label { font-size: 12px; color: var(--muted); }
.bind-target-display {
  padding: 6px 10px; border-radius: var(--radius-md);
  background: rgba(255,255,255,.04); font-size: var(--text-sm); color: var(--muted);
}
.code-row { display: flex; gap: 8px; }
.code-input { width: 140px; }
.send-code-btn {
  flex: 1; padding: 6px 10px; border-radius: var(--radius-md);
  background: rgba(212,175,55,.1); color: var(--accent);
  border: 1px solid rgba(212,175,55,.2); cursor: pointer;
  font-size: var(--text-sm); transition: all var(--duration-fast);
  white-space: nowrap;
}
.send-code-btn:hover:not(:disabled) { background: rgba(212,175,55,.2); }
.send-code-btn:disabled { opacity: .5; cursor: not-allowed; }

.bind-msg { font-size: 12px; text-align: center; padding: 4px 0; }
.bind-error { color: #FF4757; }
.bind-success { color: var(--accent); }

.bind-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
.bind-confirm-btn { padding: 4px 16px; font-size: 13px; }
.bind-confirm-btn:disabled { opacity: .5; cursor: not-allowed; }
</style>
