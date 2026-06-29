# MineChat API 接口文档

> 版本：v1.0  
> 基础路径：`/api/v1`  
> 统一响应格式：`{ code: number, message: string, data: T | null }`  
> 认证方式：Bearer Token（Authorization 请求头）

---

## 一、认证模块

### 1.1 注册

- **POST** `/auth/register`
- 无需鉴权

**请求体：**
```json
{
  "username": "alice",
  "email": "alice@minechat.dev",
  "password": "Test1234!",
  "nickname": "爱丽丝"
}
```

**成功响应（201）：**
```json
{
  "code": 0,
  "message": "注册成功",
  "data": {
    "user": { "id": "clx...", "username": "alice", "email": "alice@minechat.dev", "nickname": "爱丽丝", "avatar": null, "bio": null, "createdAt": "..." },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

### 1.2 登录

- **POST** `/auth/login`
- 无需鉴权

**请求体：**
```json
{
  "account": "alice",
  "password": "Test1234!"
}
```
> `account` 支持用户名或邮箱

**成功响应（200）：**
```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "user": { "id": "clx...", "username": "alice", "nickname": "爱丽丝", "avatar": null, "status": "ONLINE" },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

### 1.3 刷新令牌

- **POST** `/auth/refresh`
- 无需鉴权

**请求体：**
```json
{ "refreshToken": "eyJhbG..." }
```

**成功响应（200）：**
```json
{ "code": 0, "message": "刷新成功", "data": { "accessToken": "eyJhbG..." } }
```

---

## 二、用户模块

### 2.1 获取当前用户信息

- **GET** `/user/profile`
- 🔒 需要鉴权

**成功响应（200）：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "clx...", "username": "alice", "email": "alice@minechat.dev",
    "nickname": "爱丽丝", "avatar": null, "bio": "探索数字世界",
    "status": "ONLINE", "lastSeenAt": "...", "createdAt": "..."
  }
}
```

### 2.2 更新用户信息

- **PATCH** `/user/profile`
- 🔒 需要鉴权

**请求体：**
```json
{ "nickname": "新昵称", "avatar": "https://...", "bio": "新签名" }
```

### 2.3 搜索用户

- **GET** `/user/search?keyword=ali`
- 🔒 需要鉴权

**成功响应（200）：**
```json
{
  "code": 0,
  "data": [
    { "id": "clx...", "username": "alice", "nickname": "爱丽丝", "avatar": null, "status": "ONLINE" }
  ]
}
```

---

## 三、消息模块

### 3.1 获取会话列表

- **GET** `/conversations`
- 🔒 需要鉴权

**成功响应（200）：**
```json
{
  "code": 0,
  "data": [
    {
      "roomId": "clx...", "type": "DIRECT", "displayName": "鲍勃", "displayAvatar": null,
      "lastMessage": { "id": "...", "content": "你好", "type": "TEXT", "sender": {...}, "createdAt": "..." },
      "unreadCount": 2, "lastMsgAt": "...",
      "members": [{ "userId": "...", "username": "bob", "nickname": "鲍勃", "avatar": null, "status": "ONLINE", "role": "MEMBER" }],
      "group": null
    }
  ]
}
```

### 3.2 创建私聊房间

- **POST** `/rooms/direct`
- 🔒 需要鉴权

**请求体：**
```json
{ "targetUserId": "clx..." }
```

### 3.3 发送消息

- **POST** `/messages`
- 🔒 需要鉴权

**请求体：**
```json
{ "roomId": "clx...", "type": "TEXT", "content": "你好！", "replyTo": null }
```

### 3.4 获取房间消息

- **GET** `/rooms/:roomId/messages?cursor=&limit=30`
- 🔒 需要鉴权

### 3.5 标记已读

- **PATCH** `/rooms/:roomId/read`
- 🔒 需要鉴权

---

## 四、好友模块

### 4.1 发送好友请求

- **POST** `/friends/request`
- 🔒 需要鉴权

**请求体：**
```json
{ "targetUserId": "clx..." }
```

### 4.2 同意好友请求

- **PATCH** `/friends/:friendshipId/accept`
- 🔒 需要鉴权

### 4.3 拒绝好友请求

- **PATCH** `/friends/:friendshipId/reject`
- 🔒 需要鉴权

### 4.4 获取好友列表

- **GET** `/friends`
- 🔒 需要鉴权

### 4.5 获取待处理好友请求

- **GET** `/friends/pending`
- 🔒 需要鉴权

---

## 五、WebSocket 事件

> 连接地址：`ws://localhost:3000`  
> 认证方式：`handshake.auth.token` 传入 accessToken

### 5.1 客户端发送事件

| 事件 | 数据 | 说明 |
|------|------|------|
| `message:send` | `{ roomId, type, content, replyTo? }` | 发送消息 |
| `typing:start` | `{ roomId }` | 开始打字 |
| `typing:stop` | `{ roomId }` | 停止打字 |
| `message:read` | `{ roomId }` | 标记已读 |
| `ping` | - | 心跳 |

### 5.2 服务端推送事件

| 事件 | 数据 | 说明 |
|------|------|------|
| `message:new` | Message对象 | 新消息 |
| `conversation:update` | `{ roomId, lastMessage, lastMsgAt }` | 会话更新 |
| `typing:start` | `{ userId, roomId }` | 对方开始打字 |
| `typing:stop` | `{ userId, roomId }` | 对方停止打字 |
| `presence:update` | `{ userId, status, lastSeenAt }` | 在线状态变更 |
| `pong` | `{ timestamp }` | 心跳响应 |

---

## 六、错误码

| HTTP状态码 | 业务码 | 说明 |
|-----------|--------|------|
| 400 | 40001 | 参数验证失败 |
| 400 | 40002 | 不能和自己私聊 |
| 401 | 40101 | 未提供认证令牌 |
| 401 | 40102 | 认证令牌无效或已过期 |
| 401 | 40103 | 账号或密码错误 |
| 403 | 40301 | 不在此房间中 |
| 404 | -404 | 接口不存在 |
| 404 | 40401 | 用户不存在 |
| 409 | 40901 | 用户名已被占用 |
| 409 | 40902 | 邮箱已被注册 |
| 500 | -500 | 服务器内部错误 |
