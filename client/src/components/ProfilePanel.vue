<script setup lang="ts">
/**
 * 个人中心侧面板
 * Discord式侧边弹出，展示+编辑个人信息
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '../stores/user';
import { getProfileApi, updateProfileApi } from '../api/auth';
import { useSocket } from '../composables/useSocket';

const userStore = useUserStore();

// 完整个人信息
const profile = ref<{
  uid: string;
  username: string;
  nickname: string;
  avatar: string | null;
  bio: string | null;
  status: string;
  createdAt: string;
} | null>(null);

// 编辑状态
const editingNickname = ref(false);
const editingBio = ref(false);
const nicknameInput = ref('');
const bioInput = ref('');
const showStatusMenu = ref(false);
const copyToast = ref(false);

// 加载个人信息
async function fetchProfile() {
  try {
    const res: any = await getProfileApi();
    profile.value = res.data;
  } catch (err) {
    console.error('获取个人信息失败:', err);
  }
}

// 保存昵称
async function saveNickname() {
  if (!nicknameInput.value.trim()) return;
  try {
    await updateProfileApi({ nickname: nicknameInput.value.trim() });
    if (profile.value) profile.value.nickname = nicknameInput.value.trim();
    editingNickname.value = false;
  } catch (err) {
    console.error('更新昵称失败:', err);
  }
}

// 保存签名
async function saveBio() {
  try {
    await updateProfileApi({ bio: bioInput.value.trim() || '' });
    if (profile.value) profile.value.bio = bioInput.value.trim();
    editingBio.value = false;
  } catch (err) {
    console.error('更新签名失败:', err);
  }
}

// 切换状态
function setStatus(status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'AWAY') {
  const socket = useSocket();
  socket.emit('presence:update', { status });
  if (profile.value) profile.value.status = status;
  showStatusMenu.value = false;
}

// 复制UID
async function copyUid() {
  if (!profile.value) return;
  try {
    await navigator.clipboard.writeText(profile.value.uid);
    copyToast.value = true;
    setTimeout(() => { copyToast.value = false; }, 2000);
  } catch {
    // fallback
  }
}

// 格式化日期
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

// 状态文字映射
const statusMap: Record<string, { label: string; emoji: string }> = {
  ONLINE: { label: '在线', emoji: '🟢' },
  OFFLINE: { label: '离线', emoji: '⚫' },
  BUSY: { label: '忙碌', emoji: '🔴' },
  AWAY: { label: '离开', emoji: '🟡' },
};

const currentStatus = computed(() => {
  const s = profile.value?.status || 'OFFLINE';
  return statusMap[s] || statusMap.OFFLINE;
});

// 点击外部关闭状态菜单
function onClickOutside(e: MouseEvent) {
  if (showStatusMenu.value) showStatusMenu.value = false;
}

onMounted(() => { fetchProfile(); document.addEventListener('click', onClickOutside); });
onUnmounted(() => { document.removeEventListener('click', onClickOutside); });

const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <div class="profile-panel glass-panel" @click.stop>
    <!-- 关闭按钮 -->
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

      <!-- 个性签名 -->
      <div class="profile-section">
        <div class="profile-section-title">签名</div>
        <div v-if="editingBio" class="profile-edit-row">
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
  background: linear-gradient(135deg, rgba(0,245,212,.3), rgba(115,167,255,.3));
  border: 2px solid rgba(0,245,212,.3);
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
  background: rgba(255,255,255,.06); border: 1px solid rgba(0,245,212,.3);
  color: var(--ink); font-size: var(--text-sm); outline: none;
}
.profile-input:focus { border-color: var(--accent); box-shadow: 0 0 0 1px rgba(var(--accent-rgb),.2); }

.profile-textarea {
  width: 100%; padding: 8px 10px; border-radius: var(--radius-md);
  background: rgba(255,255,255,.06); border: 1px solid rgba(0,245,212,.3);
  color: var(--ink); font-size: var(--text-sm); outline: none; resize: none;
  font-family: inherit;
}
.profile-textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 1px rgba(var(--accent-rgb),.2); }
.profile-edit-actions { display: flex; gap: 4px; margin-top: 4px; }

.profile-save-btn {
  padding: 2px 8px; border-radius: var(--radius-sm); background: rgba(0,245,212,.15);
  color: var(--accent); border: 1px solid rgba(0,245,212,.3); cursor: pointer; font-size: 13px;
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
.profile-uid:hover { background: rgba(0,245,212,.08); }
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
.status-option:hover { background: rgba(0,245,212,.08); }

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
</style>
