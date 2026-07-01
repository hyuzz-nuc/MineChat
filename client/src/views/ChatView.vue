<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue';
import { useUserStore } from '../stores/user';
import { useChatStore, type ChatMessage } from '../stores/chat';
import { useSocket, disconnectSocket } from '../composables/useSocket';
import { useRouter } from 'vue-router';
import ProfilePanel from '../components/ProfilePanel.vue';

const router = useRouter();
const userStore = useUserStore();
const chatStore = useChatStore();
const messageInput = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const showProfile = ref(false);
let typingTimer: ReturnType<typeof setTimeout> | null = null;

const myId = computed(() => userStore.userId);
const hasActiveChat = computed(() => !!chatStore.currentRoomId);

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function isSelfMessage(msg: ChatMessage): boolean { return msg.senderId === myId.value; }

function sendMessage() {
  const content = messageInput.value.trim();
  if (!content || !chatStore.currentRoomId) return;
  const socket = useSocket();
  socket.emit('message:send', { roomId: chatStore.currentRoomId, type: 'TEXT', content });
  messageInput.value = '';
  socket.emit('typing:stop', { roomId: chatStore.currentRoomId });
}

function onInputChange() {
  if (!chatStore.currentRoomId) return;
  const socket = useSocket();
  socket.emit('typing:start', { roomId: chatStore.currentRoomId });
  if (typingTimer) clearTimeout(typingTimer);
  typingTimer = setTimeout(() => { socket.emit('typing:stop', { roomId: chatStore.currentRoomId }); }, 3000);
}

function handleLogout() {
  chatStore.removeSocketListeners();
  disconnectSocket();
  userStore.clearLogin();
  router.push('/login');
}

function scrollToBottom() {
  nextTick(() => { if (messagesContainer.value) messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight; });
}

function onNavClick(view: 'conversations' | 'friends') { chatStore.switchSidebar(view); }
async function onFriendClick(userId: string) { try { await chatStore.startChatWithFriend(userId); } catch { /* handled */ } }
function onAcceptRequest(friendshipId: string) { chatStore.acceptRequest(friendshipId); }
function onRejectRequest(friendshipId: string) { chatStore.rejectRequest(friendshipId); }

/** 搜索用户 */
const friendSearchKeyword = ref('');
let searchDebounce: ReturnType<typeof setTimeout> | null = null;
function onFriendSearchInput() {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    chatStore.searchUsers(friendSearchKeyword.value);
  }, 400);
}

/** 添加好友 */
async function onAddFriend(userId: string) {
  try { await chatStore.sendFriendRequest(userId); } catch { /* handled */ }
}

/** 获取好友状态按钮文本和样式 */
function getFriendStatusInfo(status: string) {
  switch (status) {
    case 'PENDING_SENT': return { text: '已发送邀请', class: 'btn-status-sent', disabled: true };
    case 'PENDING_RECEIVED': return { text: '待处理请求', class: 'btn-status-received', disabled: true };
    case 'ACCEPTED': return { text: '已是好友', class: 'btn-status-friend', disabled: true };
    case 'REJECTED': return { text: '重新发送', class: 'btn-add-friend', disabled: false };
    default: return { text: '添加好友', class: 'btn-add-friend', disabled: false };
  }
}

watch(() => chatStore.currentMessages.length, () => scrollToBottom());

onMounted(async () => { await chatStore.fetchConversations(); chatStore.registerSocketListeners(); });
onUnmounted(() => { chatStore.removeSocketListeners(); if (typingTimer) clearTimeout(typingTimer); });
</script>

<template>
  <div class="chat-layout">
    <nav class="chat-nav">
      <div class="nav-logo">M</div>
      <div class="nav-icon" :class="{ active: chatStore.sidebarView === 'conversations' }" title="消息" @click="onNavClick('conversations')">💬</div>
      <div class="nav-icon" :class="{ active: chatStore.sidebarView === 'friends' }" title="联系人" @click="onNavClick('friends')">👥</div>
      <div class="nav-spacer"></div>
      <div class="nav-avatar" @click="showProfile = !showProfile" title="个人中心">{{ userStore.username?.charAt(0)?.toUpperCase() || '?' }}</div>
    </nav>

    <aside class="chat-sidebar glass-sidebar">
      <!-- 会话列表 -->
      <template v-if="chatStore.sidebarView === 'conversations'">
        <div class="sidebar-search"><input type="text" placeholder="搜索联系人或消息..." class="sidebar-search-input" /></div>
        <div class="sidebar-list">
          <div v-if="chatStore.loadingConversations" class="sidebar-loading"><span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span></div>
          <p v-else-if="chatStore.conversations.length === 0" class="sidebar-empty">暂无会话</p>
          <div v-for="conv in chatStore.conversations" :key="conv.roomId" class="conv-item" :class="{ active: conv.roomId === chatStore.currentRoomId }" @click="chatStore.selectConversation(conv.roomId)">
            <div class="conv-avatar">
              <img v-if="conv.displayAvatar" :src="conv.displayAvatar" alt="" />
              <span v-else class="conv-avatar-text">{{ conv.displayName?.charAt(0)?.toUpperCase() || '?' }}</span>
              <span v-if="conv.type === 'DIRECT' && conv.members.some(m => m.userId !== myId && m.status === 'ONLINE')" class="conv-online-dot"></span>
            </div>
            <div class="conv-info">
              <div class="conv-top">
                <span class="conv-name">{{ conv.displayName }}</span>
                <span class="conv-time" v-if="conv.lastMessage">{{ formatTime(conv.lastMessage.createdAt) }}</span>
              </div>
              <div class="conv-bottom">
                <span class="conv-preview" v-if="conv.lastMessage">
                  <template v-if="conv.lastMessage.type === 'SYSTEM'">{{ conv.lastMessage.content }}</template>
                  <template v-else>{{ conv.lastMessage.sender?.nickname }}: {{ conv.lastMessage.content }}</template>
                </span>
                <span v-if="conv.unreadCount > 0" class="conv-badge">{{ conv.unreadCount > 99 ? '99+' : conv.unreadCount }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 好友列表 -->
      <template v-else>
        <div class="sidebar-title">
          <span>好友</span>
          <span v-if="chatStore.pendingRequests.length > 0" class="friend-request-badge">{{ chatStore.pendingRequests.length }}</span>
        </div>
        <!-- 搜索用户（支持UID/用户名） -->
        <div class="sidebar-search">
          <input v-model="friendSearchKeyword" type="text" placeholder="输入UID或用户名搜索..." class="sidebar-search-input" @input="onFriendSearchInput" />
        </div>
        <!-- 搜索结果 -->
        <div v-if="chatStore.searchResults.length > 0" class="search-results">
          <div class="friend-section-label">搜索结果</div>
          <div v-for="user in chatStore.searchResults" :key="user.id" class="conv-item">
            <div class="conv-avatar">
              <img v-if="user.avatar" :src="user.avatar" alt="" />
              <span v-else class="conv-avatar-text">{{ user.nickname?.charAt(0) || '?' }}</span>
              <span v-if="user.status === 'ONLINE'" class="conv-online-dot"></span>
            </div>
            <div class="conv-info">
              <div class="conv-top">
                <span class="conv-name">{{ user.nickname || user.username }}</span>
                <span class="user-uid">#{{ user.uid }}</span>
              </div>
              <button
                :class="getFriendStatusInfo(user.friendStatus).class"
                :disabled="getFriendStatusInfo(user.friendStatus).disabled"
                @click="!getFriendStatusInfo(user.friendStatus).disabled && onAddFriend(user.id)"
              >{{ getFriendStatusInfo(user.friendStatus).text }}</button>
            </div>
          </div>
        </div>
        <!-- 收到的请求 -->
        <div v-if="chatStore.pendingRequests.length > 0" class="friend-requests">
          <div class="friend-section-label">收到的请求</div>
          <div v-for="req in chatStore.pendingRequests" :key="req.friendshipId" class="friend-request-item">
            <div class="conv-avatar"><span class="conv-avatar-text">{{ req.requester?.nickname?.charAt(0) || '?' }}</span></div>
            <div class="friend-info">
              <span class="friend-name">{{ req.requester?.nickname || req.requester?.username }}</span>
              <div class="friend-request-actions">
                <button class="btn-accept" @click="onAcceptRequest(req.friendshipId)">同意</button>
                <button class="btn-reject" @click="onRejectRequest(req.friendshipId)">拒绝</button>
              </div>
            </div>
          </div>
        </div>
        <!-- 发出的请求 -->
        <div v-if="chatStore.sentRequests.length > 0" class="friend-requests">
          <div class="friend-section-label">发出的请求</div>
          <div v-for="req in chatStore.sentRequests" :key="req.friendshipId" class="friend-request-item">
            <div class="conv-avatar">
              <img v-if="req.addressee?.avatar" :src="req.addressee.avatar" alt="" />
              <span v-else class="conv-avatar-text">{{ req.addressee?.nickname?.charAt(0) || '?' }}</span>
            </div>
            <div class="friend-info">
              <span class="friend-name">{{ req.addressee?.nickname || req.addressee?.username }}</span>
              <span class="friend-status-text">等待对方同意</span>
            </div>
          </div>
        </div>
        <!-- 我的好友 -->
        <div class="friend-section-label">我的好友</div>
        <div class="sidebar-list">
          <div v-if="chatStore.loadingFriends" class="sidebar-loading"><span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span></div>
          <p v-else-if="chatStore.friends.length === 0" class="sidebar-empty">暂无好友</p>
          <div v-for="friend in chatStore.friends" :key="friend.friendshipId" class="conv-item" @click="onFriendClick(friend.userId)">
            <div class="conv-avatar">
              <img v-if="friend.avatar" :src="friend.avatar" alt="" />
              <span v-else class="conv-avatar-text">{{ friend.nickname?.charAt(0) || friend.username?.charAt(0) || '?' }}</span>
              <span v-if="friend.status === 'ONLINE'" class="conv-online-dot"></span>
            </div>
            <div class="conv-info">
              <div class="conv-top">
                <span class="conv-name">{{ friend.nickname || friend.username }}</span>
                <span class="user-uid">#{{ friend.uid || '' }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </aside>

    <!-- 个人中心面板 -->
    <ProfilePanel v-if="showProfile" @close="showProfile = false" />

    <main class="chat-main">
      <template v-if="hasActiveChat && chatStore.currentConversation">
        <div class="chat-header glass-panel"><span class="chat-header-name">{{ chatStore.currentConversation.displayName }}</span></div>
        <div class="chat-messages" ref="messagesContainer">
          <div v-if="chatStore.loadingMessages" class="messages-loading">加载中...</div>
          <div v-for="msg in chatStore.currentMessages" :key="msg.id" class="msg-row" :class="{ self: isSelfMessage(msg) }">
            <div v-if="msg.type === 'SYSTEM'" class="msg-system">{{ msg.content }}</div>
            <template v-else>
              <div class="msg-avatar"><span>{{ msg.sender?.nickname?.charAt(0) || '?' }}</span></div>
              <div class="msg-body">
                <div class="msg-meta">
                  <span class="msg-sender">{{ msg.sender?.nickname || msg.sender?.username }}</span>
                  <span class="msg-time">{{ formatTime(msg.createdAt) }}</span>
                </div>
                <div class="msg-bubble" :class="isSelfMessage(msg) ? 'glass-bubble-self' : 'glass-bubble-other'">{{ msg.content }}</div>
              </div>
            </template>
          </div>
        </div>
        <div v-if="chatStore.typingUsers[chatStore.currentRoomId]?.length" class="typing-indicator">
          <span class="typing-dots"><span class="t-dot"></span><span class="t-dot"></span><span class="t-dot"></span></span>
          <span>对方正在输入...</span>
        </div>
        <div class="chat-input-area glass-panel">
          <input v-model="messageInput" type="text" placeholder="输入消息..." class="chat-input" @keydown.enter="sendMessage" @input="onInputChange" />
          <button class="chat-send-btn" @click="sendMessage" :disabled="!messageInput.trim()">📤</button>
        </div>
      </template>
      <template v-else>
        <div class="chat-empty-full">
          <span class="chat-empty-icon">✨</span>
          <p class="chat-empty-text">选择一个会话开始聊天</p>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.chat-layout { height: 100vh; width: 100vw; display: flex; background: var(--bg-base); overflow: hidden; }
.chat-nav { width: 64px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; padding: var(--space-4) 0; gap: var(--space-2); background: var(--bg-base); }
.nav-logo { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: var(--accent); margin-bottom: var(--space-2); }
.nav-icon { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-md); font-size: 18px; cursor: pointer; color: rgba(255,255,255,.48); transition: color var(--duration-fast) var(--ease-out-expo), background var(--duration-fast) var(--ease-out-expo), transform var(--duration-fast) var(--ease-out-expo); }
.nav-icon:hover { color: #fff; background: rgba(255,255,255,.06); transform: translateY(-1px); }
.nav-icon.active { color: var(--accent); background: rgba(212,175,55,.08); box-shadow: inset 2px 0 0 var(--accent); }
.nav-spacer { flex: 1; }
.nav-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(212,175,55,.3), rgba(139,157,175,.3)); border: 1px solid rgba(255,255,255,.12); font-size: 14px; font-weight: 600; color: #fff; cursor: pointer; transition: transform var(--duration-fast) var(--ease-out-expo); }
.nav-avatar:hover { transform: scale(1.05); }

.chat-sidebar { width: 280px; flex-shrink: 0; display: flex; flex-direction: column; padding: var(--space-4); gap: var(--space-3); }
.sidebar-search-input { width: 100%; height: 42px; padding: 0 var(--space-4); border-radius: var(--radius-lg); background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); color: var(--ink); font-size: var(--text-sm); transition: border-color var(--duration-fast) var(--ease-out-expo), box-shadow var(--duration-fast) var(--ease-out-expo); }
.sidebar-search-input::placeholder { color: rgba(255,255,255,.22); }
.sidebar-search-input:focus { outline: none; border-color: rgba(var(--accent-rgb),.50); box-shadow: 0 0 0 1px rgba(var(--accent-rgb),.10), 0 0 20px rgba(var(--accent-rgb),.06); }
.sidebar-list { flex: 1; overflow-y: auto; }
.sidebar-loading { display: flex; justify-content: center; gap: 4px; padding-top: var(--space-8); }
.loading-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: typingDot 1.4s infinite ease-in-out; }
.loading-dot:nth-child(2) { animation-delay: .2s; }
.loading-dot:nth-child(3) { animation-delay: .4s; }
.sidebar-empty { text-align: center; color: var(--muted); font-size: var(--text-sm); padding-top: var(--space-8); }

.sidebar-title { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-md); font-weight: var(--weight-semibold); color: var(--ink); }
.friend-request-badge { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: #FF4757; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.friend-section-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; padding: var(--space-2) 0; }
.friend-requests { margin-bottom: var(--space-2); }
.friend-request-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3); border-radius: var(--radius-lg); }
.friend-info { flex: 1; min-width: 0; }
.friend-name { font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--ink); }
.friend-status-text { font-size: 11px; color: var(--muted); font-style: italic; }
.friend-request-actions { display: flex; gap: var(--space-2); margin-top: 4px; }
.btn-accept { padding: 2px 12px; border-radius: var(--radius-md); background: rgba(212,175,55,.15); color: var(--accent); border: 1px solid rgba(212,175,55,.3); font-size: 12px; cursor: pointer; transition: background var(--duration-fast) var(--ease-out-expo); }
.btn-accept:hover { background: rgba(212,175,55,.25); }
.btn-reject { padding: 2px 12px; border-radius: var(--radius-md); background: rgba(255,71,87,.1); color: #FF4757; border: 1px solid rgba(255,71,87,.2); font-size: 12px; cursor: pointer; transition: background var(--duration-fast) var(--ease-out-expo); }
.btn-reject:hover { background: rgba(255,71,87,.2); }
.friend-status { font-size: 11px; color: var(--muted); }
.friend-status.online { color: var(--accent); }
.user-uid { font-size: 11px; color: var(--accent); opacity: .7; font-family: monospace; }
.btn-add-friend { margin-top: 4px; padding: 2px 12px; border-radius: var(--radius-md); background: rgba(212,175,55,.12); color: var(--accent); border: 1px solid rgba(212,175,55,.25); font-size: 12px; cursor: pointer; transition: background var(--duration-fast) var(--ease-out-expo); }
.btn-add-friend:hover { background: rgba(212,175,55,.22); }
.btn-status-sent { margin-top: 4px; padding: 2px 12px; border-radius: var(--radius-md); background: rgba(255,255,255,.04); color: var(--muted); border: 1px solid rgba(255,255,255,.08); font-size: 12px; cursor: not-allowed; opacity: .6; }
.btn-status-received { margin-top: 4px; padding: 2px 12px; border-radius: var(--radius-md); background: rgba(212,175,55,.08); color: rgba(212,175,55,.6); border: 1px solid rgba(212,175,55,.15); font-size: 12px; cursor: not-allowed; }
.btn-status-friend { margin-top: 4px; padding: 2px 12px; border-radius: var(--radius-md); background: rgba(255,255,255,.04); color: var(--muted); border: 1px solid rgba(255,255,255,.06); font-size: 12px; cursor: not-allowed; opacity: .5; }
.search-results { margin-bottom: var(--space-2); }

.conv-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); border-radius: var(--radius-lg); cursor: pointer; transition: background var(--duration-fast) var(--ease-out-expo); }
.conv-item:hover { background: rgba(255,255,255,.04); }
.conv-item.active { background: rgba(212,175,55,.08); }
.conv-avatar { width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0; position: relative; overflow: hidden; background: linear-gradient(135deg, rgba(212,175,55,.2), rgba(139,157,175,.2)); display: flex; align-items: center; justify-content: center; }
.conv-avatar img { width: 100%; height: 100%; object-fit: cover; }
.conv-avatar-text { font-size: 16px; font-weight: 600; color: #fff; }
.conv-online-dot { position: absolute; bottom: 1px; right: 1px; width: 10px; height: 10px; border-radius: 50%; background: #D4AF37; border: 2px solid var(--bg-base); animation: statusBreathe 2s ease-in-out infinite; }
.conv-info { flex: 1; min-width: 0; }
.conv-top { display: flex; justify-content: space-between; align-items: center; }
.conv-name { font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.conv-time { font-size: 11px; color: var(--muted); flex-shrink: 0; margin-left: var(--space-2); }
.conv-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 2px; }
.conv-preview { font-size: 12px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.conv-badge { flex-shrink: 0; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: var(--accent); color: var(--bg-base); font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-left: var(--space-2); animation: badgePulse 2s ease-in-out infinite; }

.chat-main { flex: 1; display: flex; flex-direction: column; background: radial-gradient(ellipse at 20% 50%, rgba(212,175,55,.02) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(139,157,175,.015) 0%, transparent 50%), var(--bg-base); }
.chat-header { height: 60px; display: flex; align-items: center; padding: 0 var(--space-5); border-radius: 0; }
.chat-header-name { font-size: var(--text-md); font-weight: var(--weight-semibold); color: var(--ink); }

.chat-messages { flex: 1; overflow-y: auto; padding: var(--space-4) var(--space-5); display: flex; flex-direction: column; gap: var(--space-3); }
.messages-loading { text-align: center; color: var(--muted); padding: var(--space-4); }
.msg-row { display: flex; gap: var(--space-2); animation: messageAppear .3s var(--ease-out-expo); }
.msg-row.self { flex-direction: row-reverse; }
.msg-system { text-align: center; color: var(--muted); font-size: var(--text-sm); padding: var(--space-2) 0; width: 100%; }
.msg-avatar { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; background: linear-gradient(135deg, rgba(212,175,55,.2), rgba(139,157,175,.2)); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: #fff; }
.msg-body { max-width: 65%; }
.msg-meta { display: flex; gap: var(--space-2); margin-bottom: 2px; }
.msg-sender { font-size: 11px; color: var(--muted); }
.msg-time { font-size: 11px; color: rgba(255,255,255,.2); }
.msg-row.self .msg-meta { flex-direction: row-reverse; }

.typing-indicator { display: flex; align-items: center; gap: 4px; padding: 0 var(--space-5); font-size: 12px; color: var(--muted); }
.typing-dots { display: flex; gap: 2px; }
.t-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--accent); animation: typingDot 1.4s infinite ease-in-out; }
.t-dot:nth-child(2) { animation-delay: .2s; }
.t-dot:nth-child(3) { animation-delay: .4s; }

.chat-input-area { margin: var(--space-3) var(--space-4) var(--space-4); display: flex; align-items: center; padding: 0 var(--space-4); border-radius: var(--radius-xl); gap: var(--space-3); }
.chat-input { flex: 1; height: 48px; color: var(--ink); font-size: var(--text-base); background: none; border: none; outline: none; }
.chat-input::placeholder { color: rgba(255,255,255,.22); }
.chat-send-btn { width: 36px; height: 36px; border-radius: var(--radius-md); background: rgba(212,175,55,.12); color: var(--accent); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background var(--duration-fast) var(--ease-out-expo), transform var(--duration-fast) var(--ease-out-expo); border: none; font-size: 16px; }
.chat-send-btn:hover:not(:disabled) { background: rgba(212,175,55,.20); transform: translateY(-1px); }
.chat-send-btn:disabled { opacity: .4; cursor: not-allowed; }

.chat-empty-full { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.chat-empty-icon { font-size: 48px; }
.chat-empty-text { margin-top: var(--space-4); color: var(--muted); font-size: var(--text-base); }
</style>
