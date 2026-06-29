<div align="center">

# 💬 MineChat

**深空对话 · 沉浸式暗色聊天软件**

[![Vue3](https://img.shields.io/badge/Vue3-4FC08D?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?logo=socketdotio&logoColor=white)](https://socket.io/)
[![Electron](https://img.shields.io/badge/Electron-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

> 🌌 在深邃的数字星空里，每一次对话都值得被温柔以待。

MineChat 不仅仅是一个聊天软件——它是一场**视觉与交互的深空之旅**。毛玻璃折射着星光，消息气泡透着微光，丝滑动效让每一步操作都像在宇宙中滑行。打开 MineChat 的那一刻，就像踏入了一艘安静的星际飞船，远离喧嚣，专注对话。

## ✨ 亮点特性

| 🎨 视觉 | ⚡ 交互 | 🏗️ 架构 |
|---------|---------|---------|
| 三层毛玻璃体系 | 丝滑 cubic-bezier 动效 | Vue3 + Vite8 前端 |
| SVG 噪点纹理叠加 | 实时打字状态感知 | Express + TypeScript 后端 |
| 沉浸式暗色设计 | 在线状态实时同步 | Socket.IO 双向通信 |
| 微光消息气泡 | 会话列表即时刷新 | JWT 双令牌鉴权 |
| 自定义 accent 色 | 消息已读回执 | Redis 在线状态/黑名单 |

## 🛸 同时支持 Web 和桌面

```
🌐 Web 版 → 浏览器访问，即开即聊
🚀 EXE 版 → Electron 打包，独立运行
📦 同一套代码，两种打开方式
```

## 🏗️ 技术栈

```
┌─────────────────────────────────────────────┐
│  Frontend  │  Vue3 + Vite8 + TypeScript     │
│            │  Pinia + Vue Router 4           │
│            │  Axios + Socket.IO Client       │
├────────────┤─────────────────────────────────┤
│  Backend   │  Express + TypeScript           │
│            │  Prisma 5 + PostgreSQL 15+      │
│            │  Socket.IO + Redis (ioredis)    │
│            │  JWT + bcrypt + Zod + Winston   │
├────────────┤─────────────────────────────────┤
│  Desktop   │  Electron + electron-builder    │
│            │  自定义无边框窗口 + 标题栏      │
└─────────────────────────────────────────────┘
```

## 📁 项目结构

```
MineChat/
├── client/          🎨 前端 (Vue3 + Vite)
│   └── src/
│       ├── api/         Axios 请求层
│       ├── components/  UI 组件
│       ├── composables/ 组合式函数 (Socket/Electron)
│       ├── router/      路由配置
│       ├── stores/      Pinia 状态管理
│       ├── styles/      设计系统 (变量/玻璃/动画)
│       └── views/       页面视图
├── server/          ⚙️ 后端 (Express + Prisma)
│   └── src/
│       ├── config/      配置 (数据库/Redis)
│       ├── controllers/ 控制器
│       ├── middleware/   中间件 (鉴权/验证/错误)
│       ├── routes/      路由
│       ├── services/    业务逻辑
│       ├── socket/      WebSocket 处理
│       ├── utils/       工具 (JWT/日志)
│       └── validators/  Zod 校验
├── desktop/         🖥️ Electron 桌面版
├── docs/            📚 设计与开发文档
└── build/           📦 打包资源
```

## 🚀 快速开始

### 环境要求

- **Node.js** ≥ 18
- **pnpm** ≥ 9
- **PostgreSQL** 15+
- **Redis** (可选，推荐)

### 1️⃣ 创建数据库

```sql
CREATE DATABASE minechat;
```

### 2️⃣ 启动后端

```bash
cd server
pnpm install
cp .env.example .env     # 编辑 .env，填入数据库密码等
pnpm db:generate          # 生成 Prisma Client
pnpm db:push              # 同步数据库表结构
pnpm db:seed              # 填充测试数据 🌱
pnpm dev                  # 🚀 后端起飞 → http://localhost:3000
```

### 3️⃣ 启动前端

```bash
cd client
pnpm install
pnpm dev                  # 🎨 前端就绪 → http://localhost:5173
```

### 4️⃣ 桌面版（可选）

```bash
cd desktop
pnpm install
pnpm start:dev            # 开发模式启动 Electron
```

### 🧪 测试账号

| 用户 | 密码 | 说明 |
|------|------|------|
| alice | Test1234! | 四个好朋友 |
| bob | Test1234! | 互相加了好友 |
| charlie | Test1234! | 有群聊有私聊 |
| diana | Test1234! | 随时开聊 |

## 📚 文档

所有设计文档位于 `docs/` 目录：

| 文档 | 说明 |
|------|------|
| [需求分析](docs/01-需求分析文档.md) | P0/P1/P2 功能、用例、验收标准 |
| [UI/UX概念设计](docs/02-UI_UX概念设计文档.md) | 设计系统、毛玻璃、动效规范 |
| [项目总体规划](docs/03-项目总体规划文档.md) | 阶段规划、里程碑、目录结构 |
| [技术选型](docs/04-技术选型文档.md) | 技术栈对比、架构分层 |
| [数据库设计](docs/08-数据库设计文档.md) | ER 图、表结构、索引策略 |
| [API 接口](docs/09-API接口文档.md) | REST + WebSocket 完整规范 |
| [本地运行指南](docs/10-本地开发环境配置与运行指南.md) | 环境搭建、命令速查 |
| [部署方案](docs/11-部署方案文档.md) | Nginx + PM2 + PostgreSQL |
| [毛玻璃基线](docs/GLASS_TEXTURE_BASELINE.md) | 三层毛玻璃体系规范 |
| [安全准则](docs/SECURITY_GUIDELINES.md) | HTTPS、密码、限流 |

## 🗺️ 开发路线

- [x] ✅ 阶段 1：需求分析与 UI/UX 概念设计
- [x] ✅ 阶段 2：技术选型与架构搭建
- [x] ✅ 阶段 3：数据库设计
- [x] ✅ 阶段 4：核心功能开发（用户/消息/社交）
- [x] ✅ 阶段 5：API 接口文档
- [x] ✅ 阶段 6：UI 细节打磨（毛玻璃/噪点/微动效）
- [x] ✅ 阶段 7：本地联调与构建验证
- [x] ✅ 阶段 8：部署方案
- [x] ✅ 阶段 9：Electron 桌面版 + Redis 集成
- [ ] 🔲 阶段 10：本地完整功能测试
- [ ] 🔲 阶段 11：线上部署

## 🤝 参与贡献

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交改动 (`git commit -m 'feat: 添加超酷功能'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 发起 Pull Request

## 📄 License

[MIT](LICENSE) © 2026 MineChat

---

<div align="center">

**用 💬 对话，用 ✨ 体验，用 🌌 连接**

</div>
