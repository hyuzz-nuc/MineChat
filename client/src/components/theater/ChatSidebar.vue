<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';

interface ChatMsg { id: string; senderId: string; senderName: string; content: string; type: 'TEXT' | 'SYSTEM' | 'DANMAKU'; createdAt: string; }
interface Member { userId: string; nickname: string; avatar: string | null; role: 'OWNER' | 'ADMIN' | 'MEMBER'; status: 'ONLINE' | 'OFFLINE' | 'AWAY'; }

const props = defineProps<{ messages: ChatMsg[]; members: Member[]; myId: string; }>();
const emit = defineEmits<{ (e: 'send', content: string): void; }>();
const inputVal = ref('');
const msgContainer = ref<HTMLElement | null>(null);
const showMembers = ref(false);

function send(): void { const c = inputVal.value.trim(); if (!c) return; emit('send', c); inputVal.value = ''; }
function fmtTime(d: string): string { return new Date(d).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }); }
function roleLabel(r: string): string { return r === 'OWNER' ? '房主' : r === 'ADMIN' ? '管理' : ''; }
function statusColor(s: string): string { return s === 'ONLINE' ? '#D4AF37' : s === 'AWAY' ? '#FFA500' : '#5A6068'; }

watch(() => props.messages.length, () => {
  nextTick(() => { if (msgContainer.value) msgContainer.value.scrollTop = msgContainer.value.scrollHeight; });
});
</script>

<template>
  <div class="theater-chat-sidebar">
    <div class="sidebar-tabs">
      <button class="tab-btn" :class="{ active: !showMembers }" @click="showMembers = false">聊天</button>
      <button class="tab-btn" :class="{ active: showMembers }" @click="showMembers = true">
        成员 <span v-if="members.length" class="member-count">{{ members.length }}</span>
      </button>
    </div>

    <template v-if="!showMembers">
      <div class="msg-list" ref="msgContainer">
        <div v-for="msg in messages" :key="msg.id" class="msg-item"
          :class="{ system: msg.type === 'SYSTEM', self: msg.senderId === myId }">
          <template v-if="msg.type === 'SYSTEM'">
            <span class="sys-text">{{ msg.content }}</span>
          </template>
          <template v-else>
            <div class="msg-av">{{ msg.senderName?.charAt(0) || '?' }}</div>
            <div class="msg-body">
              <div class="msg-meta">
                <span class="msg-name">{{ msg.senderName }}</span>
                <span class="msg-time">{{ fmtTime(msg.createdAt) }}</span>
              </div>
              <div class="msg-bubble">{{ msg.content }}</div>
            </div>
          </template>
        </div>
        <div v-if="messages.length === 0" class="empty-hint">暂无消息</div>
      </div>
      <div class="input-area">
        <input v-model="inputVal" type="text" placeholder="发送消息..." class="chat-input" @keydown.enter="send" />
        <button class="send-btn" @click="send" :disabled="!inputVal.trim()">发送</button>
      </div>
    </template>

    <template v-else>
      <div class="member-list">
        <div v-for="m in members" :key="m.userId" class="member-row">
          <div class="m-av">
            <span>{{ m.nickname?.charAt(0) || '?' }}</span>
            <span class="m-dot" :style="{ background: statusColor(m.status) }" />
          </div>
          <div class="m-info">
            <span class="m-name">{{ m.nickname }}</span>
            <span v-if="m.role !== 'MEMBER'" class="m-role">{{ roleLabel(m.role) }}</span>
          </div>
        </div>
        <div v-if="members.length === 0" class="empty-hint">暂无成员</div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.theater-chat-sidebar {
  width: 100%; height: 100%; display: flex; flex-direction: column;
  background: var(--glass-sidebar-bg);
  backdrop-filter: var(--glass-sidebar-filter);
  -webkit-backdrop-filter: var(--glass-sidebar-filter);
  border-left: var(--glass-sidebar-border);
}
.sidebar-tabs { display: flex; border-bottom: 1px solid rgba(255,255,255,.06); }
.tab-btn {
  flex: 1; height: 40px; display: flex; align-items: center; justify-content: center; gap: 4px;
  font-size: var(--text-sm); color: var(--muted); cursor: pointer;
  transition: color var(--duration-fast), border-color var(--duration-fast);
  border-bottom: 2px solid transparent;
}
.tab-btn:hover { color: var(--ink-2); }
.tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
.member-count {
  min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px;
  background: rgba(212,175,55,.15); color: var(--accent); font-size: 10px; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center;
}
.msg-list {
  flex: 1; overflow-y: auto; padding: var(--space-3);
  display: flex; flex-direction: column; gap: var(--space-2);
}
.msg-item { display: flex; gap: var(--space-2); animation: fadeInUp .25s var(--ease-out-expo); }
.msg-item.system { justify-content: center; }
.sys-text {
  font-size: 11px; color: var(--muted); padding: 2px 8px; border-radius: var(--radius-full);
  background: rgba(255,255,255,.04);
}
.msg-item.self { flex-direction: row-reverse; }
.msg-av {
  width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(212,175,55,.2), rgba(139,157,175,.2));
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 600; color: #fff;
}
.msg-body { max-width: 75%; }
.msg-meta { display: flex; gap: var(--space-1); margin-bottom: 2px; }
.msg-item.self .msg-meta { flex-direction: row-reverse; }
.msg-name { font-size: 11px; color: var(--muted); }
.msg-time { font-size: 10px; color: rgba(255,255,255,.2); }
.msg-bubble {
  font-size: var(--text-sm); color: var(--ink); padding: 6px 10px; border-radius: 12px;
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.06);
  word-break: break-word;
}
.msg-item.self .msg-bubble { background: rgba(212,175,55,.08); border-color: rgba(212,175,55,.15); }
.empty-hint { text-align: center; color: var(--muted); font-size: var(--text-sm); padding-top: var(--space-8); }

.input-area {
  padding: var(--space-3); display: flex; gap: var(--space-2);
  border-top: 1px solid rgba(255,255,255,.06);
}
.chat-input {
  flex: 1; height: 36px; padding: 0 var(--space-3); border-radius: var(--radius-full);
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
  color: var(--ink); font-size: var(--text-sm);
}
.chat-input::placeholder { color: rgba(255,255,255,.22); }
.chat-input:focus { border-color: rgba(var(--accent-rgb),.5); outline: none; }
.send-btn {
  padding: 0 14px; height: 36px; border-radius: var(--radius-full);
  background: var(--gradient-btn); color: var(--bg-base);
  font-size: var(--text-sm); font-weight: var(--weight-semibold);
  cursor: pointer; transition: background var(--duration-fast);
}
.send-btn:disabled { opacity: .4; cursor: not-allowed; }
.send-btn:hover:not(:disabled) { background: var(--gradient-btn-hover); }

.member-list {
  flex: 1; overflow-y: auto; padding: var(--space-3);
  display: flex; flex-direction: column; gap: var(--space-1);
}
.member-row {
  display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2);
  border-radius: var(--radius-md); transition: background var(--duration-fast);
}
.member-row:hover { background: rgba(255,255,255,.04); }
.m-av {
  width: 32px; height: 32px; border-radius: 50%; position: relative;
  background: linear-gradient(135deg, rgba(212,175,55,.2), rgba(139,157,175,.2));
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 600; color: #fff;
}
.m-dot {
  position: absolute; bottom: 0; right: 0; width: 8px; height: 8px;
  border-radius: 50%; border: 2px solid var(--bg-paper);
}
.m-info { display: flex; align-items: center; gap: var(--space-2); }
.m-name { font-size: var(--text-sm); color: var(--ink); }
.m-role {
  font-size: 10px; color: var(--accent); padding: 1px 6px;
  border-radius: var(--radius-sm); background: rgba(212,175,55,.1);
  border: 1px solid rgba(212,175,55,.2);
}
</style>