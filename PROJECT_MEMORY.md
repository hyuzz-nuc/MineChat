# MineChat 项目记忆

> 本文档记录项目的核心决策、风格偏好、技术债务和关键上下文。
> 每次开发交接前务必更新此文档。

---

## 🎯 项目定位

MineChat 是一款**沉浸式暗色聊天软件**，追求极致视觉与交互品质。设计灵感来源于 MineRadio 的深空粒子美学，将毛玻璃、微光效、丝滑动效融入聊天场景。

---

## 🎨 视觉风格偏好

### 色彩体系
- **基底色**: `#08090B` (深空黑)
- **主色调**: `#00F5D4` (赛博青绿)
- **辅助色**: `#FF4458` (警告红), `#FFB800` (忙碌黄)
- **文字色**: `rgba(255,255,255,0.88)` (主), `rgba(255,255,255,0.55)` (次)
- **选择色**: `rgba(0,245,212,0.15)` (accent微光)

### 三层毛玻璃
| 层级 | 模糊 | 背景 | 用途 |
|------|------|------|------|
| sidebar | `blur(40px)` | `rgba(12,14,20,0.72)` | 侧边栏 |
| panel | `blur(34px)` | `rgba(15,17,25,0.65)` | 面板/卡片 |
| overlay | `blur(24px)` | `rgba(18,20,28,0.58)` | 弹窗/浮层 |

### 动效曲线
- **主曲线**: `cubic-bezier(.16,1,.3,1)` (easeOutExpo)
- **弹性曲线**: `cubic-bezier(.34,1.56,.64,1)` (easeOutBack)
- **标准时长**: 200ms (微交互), 450ms (面板), 800ms (页面)

### 噪点纹理
- SVG feTurbulence filter, `baseFrequency=0.65`, `numOctaves=3`
- 覆盖在毛玻璃层上, `opacity: 0.018`
- 通过 `filter: url(#noise)` 引用

---

## 🏗️ 技术决策记录

| 决策 | 选择 | 理由 | 日期 |
|------|------|------|------|
| 前端框架 | Vue3 + Composition API | 响应式 + TypeScript 友好 | 2026-06-29 |
| 后端框架 | Express + TypeScript | 生态成熟 + 灵活 | 2026-06-29 |
| ORM | Prisma 5 | 类型安全 + 自动迁移 | 2026-06-29 |
| 实时通信 | Socket.IO | 自动重连 + 房间机制 | 2026-06-29 |
| 缓存 | Redis (ioredis) | 在线状态 + Token黑名单 | 2026-06-29 |
| 桌面端 | Electron | 跨平台 + Web复用 | 2026-06-29 |
| 包管理 | pnpm | 节省磁盘 + 严格依赖 | 2026-06-29 |
| UI组件 | 自建 | 不依赖第三方库 | 2026-06-29 |
| 用户状态枚举 | ONLINE/OFFLINE/BUSY/AWAY | AWAY为Redis集成新增 | 2026-06-29 |
| Redis DB | DB1 | 与DB0隔离 | 2026-06-29 |
| 粒子背景 | Canvas 2D (非Three.js) | 轻量 + 不影响聊天性能 | 2026-06-29 |

---

## 📂 项目结构

```
MineChat/
├── client/          # 前端 (Vue3 + Vite8)
├── server/          # 后端 (Express + Prisma + Redis)
├── desktop/         # Electron 桌面版
├── docs/            # 设计与开发文档
├── build/           # 打包资源
├── AGENTS.md        # Agent 指导
├── PROJECT_MEMORY.md # 本文档
├── CHANGELOG.md     # 变更日志
└── README.md        # 项目说明
```

---

## 🔧 开发环境

| 组件 | 版本/位置 | 说明 |
|------|-----------|------|
| PostgreSQL | 18.4 @ D:\tools\pgsql | 用户: postgres, 密码: 123456 |
| Redis | 默认6379 | DB1 用于 MineChat |
| Node.js | v24.13.0 | |
| pnpm | 11.9.0 | 需 `approve-builds` |
| 后端端口 | 3000 | |
| 前端端口 | 5173 | Vite dev server |

### 环境变量
- `DATABASE_URL=postgresql://postgres:123456@localhost:5432/minechat`
- `REDIS_URL=redis://localhost:6379/1`
- `JWT_SECRET=minechat-dev-jwt-secret-2026`
- `CLIENT_URL=http://localhost:5173`

---

## ⚠️ 技术债务

| 编号 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| TD-01 | 点击"联系人"图标无反应 | P0 | 设计文档已完成，待实现 |
| TD-02 | 缺少粒子动态特效背景 | P1 | 设计文档已完成，待实现 |
| TD-03 | 缺少文件上传功能API | P2 | multer已安装 |
| TD-04 | 缺少群聊管理功能 | P2 | 数据库已支持 |
| TD-05 | Redis限流中间件未集成 | P2 | rate-limit已安装 |
| TD-06 | 上层目录有冗余.git | P3 | 导致Git Graph报错 |

---

## 🐛 已知问题

| 编号 | 描述 | 状态 |
|------|------|------|
| BUG-01 | 后端进程占用3000端口导致EADDRINUSE | 需先停旧进程 |
| BUG-02 | pnpm 11.x 需 `approve-builds` 安装原生模块 | 交互式终端操作 |
| BUG-03 | Prisma generate 报 EPERM (进程占用dll) | 需先停后端 |

---

## 📋 开发阶段进度

- [x] 阶段1：需求分析 + UI/UX概念设计
- [x] 阶段2：技术选型 + 架构搭建
- [x] 阶段3：数据库设计
- [x] 阶段4：核心功能开发
- [x] 阶段5：API接口文档
- [x] 阶段6：UI细节打磨
- [x] 阶段7：本地联调与构建验证
- [x] 阶段8：部署方案
- [x] 阶段9：Electron桌面版 + Redis集成
- [ ] 阶段10：粒子特效 + 好友列表 + 本地测试
- [ ] 阶段11：线上部署

---

## 🔄 最近变更

### 2026-06-29
- 完成 Redis (ioredis) 集成，DB1 隔离
- 在线状态从内存 Map 迁移到 Redis
- 新增 Token 黑名单服务
- UserStatus 枚举扩展 AWAY
- DEV-1.0.0 分支创建并合并到 main
- 补全文档体系（粒子特效设计、好友功能设计、Redis集成记录、CHANGELOG）
