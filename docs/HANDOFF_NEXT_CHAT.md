# MineChat 交接文档

## 当前状态

**分支**: `DEV-1.0.0` (已合并到 main)
**最新提交**: `1f361af` feat: 集成Redis(DB1) - 在线状态/Token黑名单/用户状态枚举扩展AWAY
**远程仓库**: `git@github.com:hyuzz-nuc/MineChat.git`

## 已完成阶段

| 阶段 | 内容 | 状态 |
|------|------|------|
| 1 | 需求分析与UI/UX概念设计 | ✅ |
| 2 | 技术选型与架构搭建 | ✅ |
| 3 | 数据库设计 (Prisma + PostgreSQL) | ✅ |
| 4 | 核心功能开发 (用户/消息/社交) | ✅ |
| 5 | API接口文档 | ✅ |
| 6 | UI细节打磨 (毛玻璃/噪点/微动效) | ✅ |
| 7 | 本地联调与构建验证 | ✅ |
| 8 | 部署方案文档 | ✅ |
| 9 | Electron桌面版 + Redis集成 | ✅ |

## 中间件状态

| 组件 | 状态 | 说明 |
|------|------|------|
| PostgreSQL 18.4 | ✅ 运行中 | `minechat` 数据库, 用户: postgres, 密码: 123456 |
| Redis | ✅ 运行中 | DB1 隔离 MineChat 数据 |
| 后端 Express | ✅ 运行中 | http://localhost:3000 |
| 前端 Vite | ⏳ 待启动 | http://localhost:5173 |

## Redis 集成详情

- **配置**: `server/src/config/redis.ts` — ioredis 单例, DB1, 自动重连
- **在线状态**: `server/src/services/presence.service.ts` — 替代内存 Map, 支持多进程
- **Token黑名单**: `server/src/services/token-blacklist.service.ts` — 登出/改密码时吊销
- **Key规范**:
  - `presence:online` — SET, 在线用户集合
  - `presence:{userId}:sockets` — SET, socketId 集合
  - `presence:{userId}:status` — STRING, 用户状态
  - `token:blacklist:{jti}` — STRING+TTL, 黑名单

## 待完成

- [ ] 阶段10: 本地完整功能测试 (前后端联调)
- [ ] 阶段11: 线上部署
- [ ] Redis 限流中间件集成 (rate-limit-redis)
- [ ] 文件上传功能 (multer 已安装, API 未实现)
- [ ] 群聊管理功能 (创建/踢人/转让)
