# 07 - Redis 集成记录文档

> 版本: v1.0 | 日期: 2026-06-29 | 状态: 已完成

## 1. 集成概述

2026-06-29 完成 Redis (ioredis) 集成，使用 **DB1** 隔离 MineChat 数据，避免与其他应用冲突。

## 2. 技术决策

| 决策 | 选择 | 理由 |
|------|------|------|
| Redis客户端 | ioredis | 比 node-redis 功能更全，支持 pipeline/集群/Lua脚本 |
| 数据库编号 | DB1 | 与 DB0 (默认) 隔离，避免键名冲突 |
| 连接方式 | lazyConnect | 延迟连接，首次命令时才建立，减少启动时间 |
| 单例模式 | globalForPrisma 模式 | 避免开发环境热重载创建多个连接 |

## 3. 新增文件

| 文件 | 行数 | 说明 |
|------|------|------|
| `server/src/config/redis.ts` | 62 | Redis客户端单例，DB1，自动重连 |
| `server/src/services/presence.service.ts` | 67 | 在线状态服务（替代内存Map） |
| `server/src/services/token-blacklist.service.ts` | 28 | Token黑名单（登出/改密码吊销） |

## 4. 修改文件

| 文件 | 变更 |
|------|------|
| `server/src/app.ts` | 引入Redis，启动时 `redis.connect()` |
| `server/src/socket/handlers/message.ts` | 在线状态从内存Map迁移到Redis |
| `server/prisma/schema.prisma` | UserStatus 枚举新增 AWAY |
| `server/package.json` | 新增 ioredis 依赖 |
| `server/.env` / `.env.example` | REDIS_URL 改为 `redis://localhost:6379/1` |

## 5. Redis Key 命名规范

```
minechat:presence:online           — SET    所有在线userId
minechat:presence:{userId}:sockets — SET    该用户的socketId集合
minechat:presence:{userId}:status  — STRING 用户自定义状态
minechat:token:blacklist:{jti}     — STRING Token黑名单(TTL自动过期)
minechat:rate:{ip}:{path}          — STRING API限流计数(预留)
```

> 注意：当前实现未使用 `minechat:` 前缀，因为使用了 DB1 隔离。后续如需切换到 DB0，需添加前缀。

## 6. 数据迁移

### 6.1 从内存Map到Redis

**之前（内存）**:
```typescript
const onlineUsers = new Map<string, Set<string>>();
```

**之后（Redis）**:
```typescript
// 上线
await redis.sadd('presence:online', userId);
await redis.sadd(`presence:${userId}:sockets`, socketId);

// 下线
await redis.srem(`presence:${userId}:sockets`, socketId);
const remaining = await redis.scard(`presence:${userId}:sockets`);
if (remaining === 0) {
  await redis.srem('presence:online', userId);
}
```

### 6.2 优势

| 维度 | 内存Map | Redis |
|------|---------|-------|
| 多进程共享 | ❌ | ✅ |
| 重启持久 | ❌ | ✅ (RDB/AOF) |
| 集群部署 | ❌ | ✅ |
| 内存占用 | Node进程内 | 独立进程 |
| 查询灵活性 | 遍历 | O(1) 集合操作 |

## 7. 验证结果

```
2026-06-29 19:45:58 [info]: 🔴 Redis connected (DB1)
2026-06-29 19:45:58 [info]: 🚀 MineChat server running on http://localhost:3000
2026-06-29 19:45:58 [info]: 📡 Socket.IO ready on the same port
```

Redis 连接成功，后端正常启动。
