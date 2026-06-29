# MineChat 交接文档

## 当前状态

**分支**: `DEV-1.0.0` (已合并到 main)
**最新提交**: `51f087d` docs: 完善README+更新进度文档
**远程仓库**: `git@github.com:hyuzz-nuc/MineChat.git`

## 环境状态

| 组件 | 状态 | 地址 |
|------|------|------|
| PostgreSQL 18.4 | ✅ 运行中 | localhost:5432, DB: minechat |
| Redis | ✅ 运行中 | localhost:6379/1 |
| 后端 Express | ✅ 运行中 | http://localhost:3000 |
| 前端 Vite | ⏳ 待启动 | http://localhost:5173 |

## 已完成功能

1. **用户系统**: 注册/登录/JWT双令牌/Token刷新
2. **实时消息**: Socket.IO/发送接收/已读回执/打字状态/在线状态
3. **社交系统**: 好友请求/接受/拒绝/好友列表/用户搜索
4. **Redis集成**: ioredis DB1/在线状态迁移/Token黑名单
5. **Electron桌面版**: 无边框窗口/自定义标题栏/NSIS安装包
6. **设计系统**: 三层毛玻璃/SVG噪点/微光气泡/动效曲线
7. **文档体系**: 14篇文档覆盖全流程

## 待实现功能 (按优先级)

### P0 - 功能性Bug
- **好友列表面板**: 导航栏"👥联系人"图标无点击事件 → 需实现侧边栏双视图切换
- **从好友发起私聊**: 点击好友 → 创建/切换私聊房间

### P1 - 视觉增强
- **粒子动态特效**: Canvas 2D 深空粒子背景（设计文档已完成）
- **消息发送动画**: 消息气泡出现时的微动效增强

### P2 - 功能扩展
- 文件上传 (multer 已安装, API 未实现)
- 群聊管理 (数据库已支持)
- Redis 限流中间件

## 关键文件索引

| 文件 | 说明 |
|------|------|
| `server/src/config/redis.ts` | Redis客户端单例 |
| `server/src/services/presence.service.ts` | 在线状态(Redis) |
| `server/src/services/token-blacklist.service.ts` | Token黑名单 |
| `client/src/stores/chat.ts` | 聊天状态管理 |
| `client/src/views/ChatView.vue` | 聊天主页面 |
| `docs/05-粒子动态特效设计文档.md` | 粒子特效设计 |
| `docs/06-好友列表与私聊功能设计文档.md` | 好友功能设计 |

## 测试账号

| 用户名 | 密码 |
|--------|------|
| alice | Test1234! |
| bob | Test1234! |
| charlie | Test1234! |
| diana | Test1234! |

## 注意事项

1. pnpm 11.x 安装原生模块需先 `pnpm approve-builds`
2. Prisma generate 需先停掉后端进程(EPERM)
3. 后端 3000 端口被占时先 `taskkill /F /PID <pid>`
4. 上层目录有冗余 `.git` 会导致 Git Graph 报错
