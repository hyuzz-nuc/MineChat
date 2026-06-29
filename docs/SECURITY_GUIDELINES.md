# MineChat 安全准则

> 日期：2026-06-29

---

## 传输安全

- 全站 HTTPS/WSS，Nginx 强制 HTTPS 重定向
- HTTP 请求自动 301 到 HTTPS
- WebSocket 仅允许 WSS 连接

## 鉴权安全

- JWT 双令牌机制：Access Token 15min + Refresh Token 7d
- Refresh Token 存储在 Redis，支持主动吊销
- Token 签发使用 RS256 或 HS256 + 强密钥
- 密码加密使用 bcrypt，saltRounds=12
- 所有 API 路径（除注册/登录外）需要 JWT 验证中间件
- WebSocket 连接在 auth 字段携带 JWT，Socket中间件验证

## 输入安全

- XSS防护：所有消息内容严格HTML转义，不允许原始HTML
- SQL注入：Prisma默认参数化查询，不手写SQL拼接
- CSRF防护：SameSite Cookie + 自定义Header验证
- 文件上传：类型白名单 + 大小限制(5MB) + 文件名随机化
- 请求校验：Zod schema统一验证请求参数

## 速率限制

- 登录API：5次/分钟/IP（防暴力破解）
- 注册API：3次/分钟/IP
- 消息发送：60条/分钟/用户（防刷屏）
- 文件上传：10次/分钟/用户
- 通用API：100次/分钟/IP

## 数据安全

- 用户密码不可逆加密存储
- JWT密钥不硬编码，使用环境变量
- 敏感配置（数据库连接、Redis密码）使用.env文件
- .env文件不入Git，提供.env.example模板
- 生产环境日志不输出敏感信息

## 不要做

- 不要在代码中硬编码密钥、密码、Token
- 不要把.env推送到Git仓库
- 不要在API响应中返回密码哈希
- 不要允许客户端直接访问数据库
- 不要在生产环境使用debug日志级别
- 不要使用MD5/SHA1做密码加密（必须bcrypt）
