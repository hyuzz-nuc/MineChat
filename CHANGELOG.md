# MineChat 变更日志

所有重要变更都记录在此文档中。格式参照 [Keep a Changelog](https://keepachangelog.com/zh-CN/)。

## [0.1.0] - 2026-06-29

### 新增
- 🎨 沉浸式暗色设计系统（三层毛玻璃 + SVG噪点纹理 + 微光效）
- 👤 用户系统（注册/登录/JWT双令牌鉴权）
- 💬 实时消息（Socket.IO 双向通信/打字状态/已读回执/在线状态）
- 👥 社交系统（好友请求/接受/拒绝/好友列表/用户搜索）
- 🗄️ 数据库设计（Prisma + PostgreSQL, 7张表）
- 📡 Redis 集成（ioredis DB1隔离/在线状态/Token黑名单）
- 🖥️ Electron 桌面版（自定义无边框窗口/标题栏/NSIS安装包）
- 📚 完整设计文档体系（11篇文档覆盖需求→部署）
- 🔄 前端构建验证通过（Vite build 141模块 839ms）
- 🔐 安全准则（bcrypt/Rate-limit/Zod验证/CORS）

### 待实现
- 粒子动态特效背景（Canvas 2D）
- 好友列表UI面板 + 从好友发起私聊
- 文件上传功能
- 群聊管理（创建/踢人/转让）
- 线上部署
