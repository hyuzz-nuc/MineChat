# MineChat Project Memory

> 这个文件用于解决新开对话时"失忆"的问题。每次关键决策、风格偏好、技术约束都要记录在这里。

---

## Stable Project Facts

- 项目名称：MineChat
- 项目类型：Web端实时聊天软件
- 视觉风格：沉浸式暗色+毛玻璃+微光效设计语言
- 当前源码位置：`E:\vibecoding\MineChat\MineChat\MineChat`
- 当前阶段：阶段2 - 技术选型与架构搭建

## 技术栈决策

- 前端：Vue3 + Vite5 + TypeScript + Pinia
- 后端：Express + TypeScript + Prisma + PostgreSQL
- 实时通信：Socket.IO（前后端配套）
- 缓存：Redis（在线状态/会话缓存/Socket.IO适配器）
- 包管理：pnpm
- UI方案：自研组件（不用第三方UI库，保证风格一致性）
- 鉴权：JWT双令牌（Access 15min + Refresh 7d）
- 密码：bcrypt saltRounds=12

## 设计准则

### 视觉风格（沉浸式暗色，适配聊天场景）

1. **暗色基底**：#08090B 为主背景，#0E1014 为纸面层
2. **主强调色**：#00F5D4（青绿），用于在线状态/未读/自己消息/交互高亮
3. **辅助色**：#73a7ff（冰蓝，链接/交互）、#ff5367（红，警示/删除）、#f4d28a（金，VIP/特殊标记）
4. **毛玻璃三层**：侧栏(40px blur) / 面板(34px blur) / 弹窗(24px blur)
5. **圆角体系**：sm(8px) / md(12px) / lg(16px) / xl(24px) / full(999px)
6. **字体**：Noto Sans SC（中文）+ Inter（英文）+ JetBrains Mono（等宽）
7. **动效缓动**：cubic-bezier(.16,1,.3,1) 为主，聊天场景适当收敛
8. **消息气泡**：自己消息accent色淡底+accent边框微光，他人消息白色微底
9. **背景氛围**：不是纯黑，带微光径向渐变+极淡网格纹理

### 交互准则

1. 微交互必须存在：hover微浮translateY(-1px)、focus发光边框、按钮点击回弹
2. 消息发送：乐观更新，状态逐步推进（发送中→已发送→已送达→已读）
3. 打字指示器：三个圆点跳动动画，accent色
4. 未读徽章：accent色+脉冲发光动画
5. 在线状态：10px圆点，在线accent色+box-shadow发光，离线灰色
6. 面板展开/收起：opacity+translateY+scale过渡，280ms ease-out-expo
7. 新消息出现：从下方滑入+淡入，280ms

## 开发准则

1. 渐进式开发：严格按阶段推进，未完成当前阶段不进入下一阶段
2. 每个步骤/决策必须同步输出Markdown文档
3. 代码风格：TypeScript严格模式、ESLint+Prettier统一格式
4. 后端分层：Router → Middleware → Controller → Service → Prisma
5. 前端分型：Views → Components → Composables → Stores → Services
6. 自研UI组件，不引入第三方UI库
7. API版本化：/api/v1/...
8. 统一响应格式：{ code, message, data }

## 功能范围

### P0（必须实现）
- 用户系统：注册/登录/个人资料/搜索
- 即时通讯：私聊/群聊/文本+图片+表情/消息状态/历史/输入状态
- 联系人：好友列表/好友申请/会话列表

### P1（第二批）
- 文件发送/语音消息/消息撤回/消息引用/@提及/群公告/消息搜索/通知

### P2（后续迭代）
- 视频通话/屏幕共享/频道系统/主题定制/Bot API

## 重要约束

1. 当前阶段仅开发Web端，不考虑移动端App
2. 初期用户量 < 5000，架构需支持后续扩展
3. 不依赖第三方IM服务，全自研
4. 图片/文件存储初期使用服务器本地磁盘
5. 浏览器兼容：Chrome 90+ / Firefox 88+ / Safari 14+ / Edge 90+

## 文档清单

| 文档 | 路径 | 状态 |
|------|------|------|
| 需求分析文档 | docs/01-需求分析文档.md | ✅ |
| UI/UX概念设计文档 | docs/02-UI_UX概念设计文档.md | ✅ |
| 项目总体规划文档 | docs/03-项目总体规划文档.md | ✅ |
| 技术选型文档 | docs/04-技术选型文档.md | ✅ |
| 本地环境运行指南 | docs/05-本地环境运行指南.md | 待创建 |

---

## 变更记录

| 日期 | 变更内容 |
|------|----------|
| 2026-06-29 | 初始化项目Memory，确立视觉风格沉浸式暗色、技术栈Vue3+Express、自研UI组件 |
