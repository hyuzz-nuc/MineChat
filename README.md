# MineChat

> 沉浸式暗色 Web 聊天软件 — 深空对话

## 项目简介

MineChat 是一款追求极致视觉与交互品质的 Web 端实时聊天软件。采用沉浸式暗色设计语言，将毛玻璃、微光效、丝滑动效融入聊天场景，打造"深空对话"般的高级感通讯体验。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue3 + Vite5 + TypeScript + Pinia |
| 后端 | Express + TypeScript + Prisma + PostgreSQL |
| 实时通信 | Socket.IO |
| 缓存 | Redis |
| 鉴权 | JWT 双令牌 |

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动前端开发
cd client && pnpm dev

# 启动后端开发
cd server && pnpm dev
```

## 文档

所有设计文档位于 `docs/` 目录：

| 文档 | 描述 |
|------|------|
| [01-需求分析文档](docs/01-需求分析文档.md) | 功能需求、用例分析、验收标准 |
| [02-UI/UX概念设计](docs/02-UI_UX概念设计文档.md) | 设计系统、毛玻璃、消息气泡、动效 |
| [03-项目总体规划](docs/03-项目总体规划文档.md) | 7阶段规划、里程碑、API预览 |
| [04-技术选型](docs/04-技术选型文档.md) | 技术栈对比、架构分层、安全 |
| [05-毛玻璃质感基线](docs/05-GLASS_TEXTURE_BASELINE.md) | 三层毛玻璃体系、SVG filter规范 |
| [06-安全准则](docs/06-SECURITY_GUIDELINES.md) | HTTPS、密码、限流、XSS |
| [07-交接文档](docs/07-HANDOFF_NEXT_CHAT.md) | 当前状态、已知验证 |

## 开发阶段

- [x] 阶段1：需求分析与UI/UX概念设计
- [ ] 阶段2：技术选型与架构搭建
- [ ] 阶段3：数据库设计
- [ ] 阶段4：核心功能开发
- [ ] 阶段5：UI细节打磨
- [ ] 阶段6：本地联调与测试
- [ ] 阶段7：部署上线

## License

MIT
