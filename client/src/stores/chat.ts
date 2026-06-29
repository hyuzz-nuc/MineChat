/**
 * 聊天状态管理
 * 管理会话列表、当前聊天、消息列表
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getConversationsApi, getRoomMessagesApi, markReadApi, createDirectRoomApi } from '../api/message';
import { useSocket } from '../composables/useSocket';

/** 会话项类型 */
export interface Conversation {
  roomId: string;
  type: 'DIRECT' | 'GROUP';
  displayName: string;
  displayAvatar: string;
  lastMessage: {
    id: string;
    content: string;
    type: string;
    sender: { id: string; username: string; nickname: string; avatar: string | null };
    createdAt: string;
  } | null;
  unreadCount: number;
  lastMsgAt: string;
  members: Array<{
    userId: string;
    username: string;
    nickname: string;
    avatar: string | null;
    status: string;
    role: string;
  }>;
  group?: { description: string | null; announcement: string | null };
}

/** 消息类型 */
export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  content: string;
  status: string;
  replyTo: string | null;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    nickname: string;
    avatar: string | null;
  };
}

export const useChatStore = defineStore('chat', () => {
  /** 会话列表 */
  const conversations = ref<Conversation[]>([]);
  /** 当前选中的房间ID */
  const currentRoomId = ref('');
  /** 当前房间的消息列表 */
  const currentMessages = ref<ChatMessage[]>([]);
  /** 加载状态 */
  const loadingConversations = ref(false);
  const loadingMessages = ref(false);
  /** 打字状态：roomId -> userId[] */
  const typingUsers = ref<Record<string, string[]>>({});

  /** 当前会话 */
  const currentConversation = computed(() =>
    conversations.value.find((c) => c.roomId === currentRoomId.value),
  );

  /** 总未读数 */
  const totalUnread = computed(() =>
    conversations.value.reduce((sum, c) => sum + c.unreadCount, 0),
  );

  /** 加载会话列表 */
  async function fetchConversations() {
    loadingConversations.value = true;
    try {
      const res: any = await getConversationsApi();
      conversations.value = res.data;
    } catch (err) {
      console.error('获取会话列表失败:', err);
    } finally {
      loadingConversations.value = false;
    }
  }

  /** 选择会话（切换聊天房间） */
  async function selectConversation(roomId: string) {
    currentRoomId.value = roomId;
    currentMessages.value = [];
    await fetchMessages(roomId);
    // 标记已读
    try {
      await markReadApi(roomId);
      // 更新本地未读数
      const conv = conversations.value.find((c) => c.roomId === roomId);
      if (conv) conv.unreadCount = 0;
    } catch {
      // 忽略已读标记失败
    }
  }

  /** 加载房间消息 */
  async function fetchMessages(roomId: string, cursor?: string) {
    loadingMessages.value = true;
    try {
      const res: any = await getRoomMessagesApi(roomId, { cursor, limit: 30 });
      if (cursor) {
        // 加载更多，拼接到前面
        currentMessages.value = [...res.data, ...currentMessages.value];
      } else {
        currentMessages.value = res.data;
      }
    } catch (err) {
      console.error('获取消息失败:', err);
    } finally {
      loadingMessages.value = false;
    }
  }

  /** 创建私聊房间 */
  async function startDirectChat(targetUserId: string) {
    try {
      const res: any = await createDirectRoomApi(targetUserId);
      const roomId = res.data.roomId;
      if (res.data.isNew) {
        // 新房间，刷新会话列表
        await fetchConversations();
      }
      await selectConversation(roomId);
      return roomId;
    } catch (err) {
      console.error('创建私聊失败:', err);
      throw err;
    }
  }

  /** 接收新消息（Socket推送） */
  function onNewMessage(message: ChatMessage) {
    if (message.roomId === currentRoomId.value) {
      currentMessages.value.push(message);
    }
    // 更新会话列表中的最后消息
    const conv = conversations.value.find((c) => c.roomId === message.roomId);
    if (conv) {
      conv.lastMessage = {
        id: message.id,
        content: message.content,
        type: message.type,
        sender: message.sender,
        createdAt: message.createdAt,
      };
      conv.lastMsgAt = message.createdAt;
      // 如果不是当前房间，增加未读数
      if (message.roomId !== currentRoomId.value) {
        conv.unreadCount++;
      }
    }
  }

  /** 会话更新（Socket推送） */
  function onConversationUpdate(data: { roomId: string; lastMessage: any; lastMsgAt: string }) {
    const conv = conversations.value.find((c) => c.roomId === data.roomId);
    if (conv) {
      conv.lastMessage = data.lastMessage;
      conv.lastMsgAt = data.lastMsgAt;
    }
  }

  /** 设置打字状态 */
  function setTyping(roomId: string, userId: string, isTyping: boolean) {
    if (!typingUsers.value[roomId]) {
      typingUsers.value[roomId] = [];
    }
    const list = typingUsers.value[roomId];
    if (isTyping) {
      if (!list.includes(userId)) list.push(userId);
    } else {
      const idx = list.indexOf(userId);
      if (idx > -1) list.splice(idx, 1);
    }
  }

  /** 注册Socket事件监听 */
  function registerSocketListeners() {
    const socket = useSocket();

    socket.on('message:new', onNewMessage);
    socket.on('conversation:update', onConversationUpdate);
    socket.on('typing:start', (data: { userId: string; roomId: string }) => {
      setTyping(data.roomId, data.userId, true);
    });
    socket.on('typing:stop', (data: { userId: string; roomId: string }) => {
      setTyping(data.roomId, data.userId, false);
    });
    socket.on('presence:update', (data: { userId: string; status: string }) => {
      // 更新会话列表中成员的在线状态
      conversations.value.forEach((conv) => {
        const member = conv.members.find((m) => m.userId === data.userId);
        if (member) {
          member.status = data.status;
        }
      });
    });
  }

  /** 移除Socket事件监听 */
  function removeSocketListeners() {
    try {
      const socket = useSocket();
      socket.off('message:new', onNewMessage);
      socket.off('conversation:update', onConversationUpdate);
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('presence:update');
    } catch {
      // socket可能未连接
    }
  }

  return {
    conversations,
    currentRoomId,
    currentMessages,
    loadingConversations,
    loadingMessages,
    typingUsers,
    currentConversation,
    totalUnread,
    fetchConversations,
    selectConversation,
    fetchMessages,
    startDirectChat,
    onNewMessage,
    onConversationUpdate,
    setTyping,
    registerSocketListeners,
    removeSocketListeners,
  };
});
