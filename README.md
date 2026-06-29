# MineChat

> 沉浸式暗色 Web 聊天软件 — 深空对话

## 项目简介

MineChat 是一款追求极致视觉与交互品质的实时聊天软件，同时支持 **Web 版** 和 **Electron 桌面版 (EXE)**。采用沉浸式暗色设计语言，将毛玻璃、微光效、丝滑动效融入聊天场景，打造"深空对话"般的高级感通讯体验。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue3 + Vite8 + TypeScript + Pinia + Vue Router 4 |
| 后端 | Express + TypeScript + Prisma 5 + PostgreSQL 15+ |
| 实时通信 | Socket.IO |
| 缓存 | Redis (可选) |
| 鉴权 | JWT 双令牌 (Access + Refresh) |
| 桌面端 | Electron + electron-builder |

## 项目结构

```
MineChat/
├── client/          # 前端 (Vue3 + Vite)
├── server/          # 后端 (Express + Prisma)
├── desktop/         # Electron 桌面版
├── build/           # 打包图标资源
├── docs/            # 设计与开发文档
└── README.md
```

## 快速开始

### 环境要求

- Node.js ≥ 18
- pnpm ≥ 9
- PostgreSQL 15+

### 1. 创建数据库

```sql
CREATE DATABASE minechat;
```

### 2. 启动后端

```bash
cd server
pnpm install
# 编辑 .env 文件，配置 DATABASE_URL 等环境变量
pnpm db:generate    # 生成 Prisma Client
pnpm db:push        # 同步数据库表结构
pnpm db:seed        # 填充测试数据
pnpm dev            # 启动后端 → http://localhost:3000
```

### 3. 启动前端（新终端）

```bash
cd client
pnpm install
pnpm dev            # 启动前端 → http://localhost:5173
```

### 4. 桌面版开发（可选）

```bash
cd desktop
pnpm install
pnpm start:dev      # 开发模式启动 Electron
```

### 测试账号

| 用户名 | 密码 |
|--------|------|
| alice | Test1234! |
| bob | Test1234! |
| charlie | Test1234! |
| diana | Test1234! |

## 文档

所有设计文档位于 `docs/` 目录：

| 文档 | 描述 |
|------|------|
| [01-需求分析文档](docs/01-需求分析文档.md) | 功能需求、用例分析、验收标准 |
| [02-UI/UX概念设计](docs/02-UI_UX概念设计文档.md) | 设计系统、毛玻璃、消息气泡、动效 |
| [03-项目总体规划](docs/03-项目总体规划文档.md) | 阶段规划、里程碑、目录结构 |
| [04-技术选型](docs/04-技术选型文档.md) | 技术栈对比、架构分层、安全 |
| [08-数据库设计](docs/08-数据库设计文档.md) | ER图、表结构、索引策略 |
| [09-API接口文档](docs/09-API接口文档.md) | REST + WebSocket API规范 |
| [10-本地开发环境配置与运行指南](docs/10-本地开发环境配置与运行指南.md) | 环境搭建、命令速查 |
| [11-部署方案文档](docs/11-部署方案文档.md) | Nginx + PM2 + PostgreSQL 部署 |
| [毛玻璃质感基线](docs/GLASS_TEXTURE_BASELINE.md) | 三层毛玻璃体系、SVG filter规范 |
| [安全准则](docs/SECURITY_GUIDELINES.md) | HTTPS、密码、限流、XSS |
| [交接文档](docs/HANDOFF_NEXT_CHAT.md) | 当前状态、已知问题 |

## 开发阶段

- [x] 阶段1：需求分析与UI/UX概念设计
- [x] 阶段2：技术选型与架构搭建
- [x] 阶段3：数据库设计
- [x] 阶段4：核心功能开发（用户系统、消息系统、社交系统）
- [x] 阶段5：API接口文档
- [x] 阶段6：UI细节打磨（毛玻璃气泡、噪点纹理、微动效）
- [x] 阶段7：本地联调与构建验证
- [x] 阶段8：部署方案文档
- [x] 阶段9：Electron桌面版支持（Web版 + EXE版共存）
- [ ] 阶段10：本地完整功能测试
- [ ] 阶段11：线上部署

## License

MIT
