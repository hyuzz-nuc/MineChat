# MineChat AGENTS 指引

> 新对话或新Agent接入时，请先阅读此文件和 PROJECT_MEMORY.md

---

## 新对话先执行

```powershell
cd E:\vibecoding\MineChat\MineChat\MineChat
Get-Content AGENTS.md
Get-Content PROJECT_MEMORY.md
Get-Content docs\HANDOFF_NEXT_CHAT.md
```

如涉及毛玻璃质感、安全重建、部署上线，再读：

```powershell
Get-Content docs\GLASS_TEXTURE_BASELINE.md
Get-Content docs\SECURITY_GUIDELINES.md
```

## 项目定位

MineChat 是一款 Web 端实时聊天软件，采用沉浸式暗色+毛玻璃+微光效设计语言。

## 核心准则

1. **渐进式开发**：严格按阶段推进，未完成当前阶段不进入下一阶段
2. **强制文档输出**：每步决策同步输出Markdown文档
3. **自研UI组件**：不引入第三方UI库，保证风格一致性
4. **最小化修改**：改动范围最小化，不修改不相关模块
5. **复用优先**：相同逻辑封装成工具方法，不重复造轮子
6. **性能不丢**：循环里不瞎创建对象，集合初始化指定容量
7. **注释到位**：核心逻辑标清楚注释
8. **说人话**：解释代码时别拽专业术语

## 技术栈

- 前端：Vue3 + Vite5 + TypeScript + Pinia
- 后端：Express + TypeScript + Prisma + PostgreSQL
- 实时通信：Socket.IO
- 缓存：Redis
- 鉴权：JWT双令牌

## 当前阶段

查看 `PROJECT_MEMORY.md` 的 `当前阶段` 字段。

## 不要做

- 不要引入第三方UI组件库（Naive UI、Element Plus等）
- 不要用普通毛玻璃替代SVG扭曲质感（详见 GLASS_TEXTURE_BASELINE.md）
- 不要在暗色主题上大面积使用白色渐变
- 不要跳过文档直接写代码
- 不要同时修改多个模块
- 不要用 git reset --hard 回滚用户改动
