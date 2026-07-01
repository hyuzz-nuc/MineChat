# 18 - 阿里云宝塔Docker部署方案

> 编写日期：2026-07-01 | 版本：v1.0

## 一、项目架构概览

MineChat 属于 **前后端分离的实时Web应用**，包含以下服务：

| 服务 | 技术 | 端口 | 说明 |
|------|------|------|------|
| 前端 | Vue3 + Vite (静态文件) | 80/443 | Nginx托管静态文件 |
| 后端 | Express + TypeScript | 3000 | Node.js API + Socket.IO |
| 数据库 | PostgreSQL 15 | 5432 | 数据存储 |
| 缓存 | Redis 7 | 6379 | 在线状态/验证码/Token黑名单 |

**在宝塔面板中的分类**：这是一个 **Node.js Web应用**，需通过 Docker Compose 编排多个容器。

---

## 二、宝塔面板准备工作

### 2.1 安装Docker管理器

1. 登录宝塔面板
2. 进入 **软件商店** → 搜索 **Docker管理器** → 安装
3. 安装完成后，进入 **Docker管理器** → **设置** → 确认Docker和Docker Compose已启用

### 2.2 安装Nginx

1. 软件商店 → 搜索 **Nginx** → 安装（如未安装）

---

## 三、服务器目录规划

```bash
/opt/minechat/              # 项目根目录
├── docker-compose.yml      # Docker编排文件
├── .env                    # 环境变量（生产密钥）
├── nginx/                  # Nginx配置
│   └── minechat.conf
├── server/                 # 后端代码
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   ├── src/
│   └── ...
├── client/                 # 前端构建产物
│   └── dist/               # npm run build 后的静态文件
└── data/                   # 持久化数据
    ├── postgres/           # PostgreSQL数据卷
    └── redis/              # Redis数据卷
```

---

## 四、操作步骤（详细）

### 步骤1：服务器安装Git并拉取代码

```bash
# SSH登录服务器
ssh root@你的服务器IP

# 安装git（如未安装）
yum install git -y   # CentOS/AliyunOS
# 或 apt install git -y  # Ubuntu

# 创建项目目录
mkdir -p /opt/minechat
cd /opt/minechat

# 拉取代码
git clone -b DEV-V1.0.0 git@github.com:hyuzz-nuc/MineChat.git repo
```

### 步骤2：构建前端

```bash
# 安装Node.js（宝塔面板 → 软件商店 → PM2管理器会自动安装Node）
# 或手动安装
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装pnpm
npm install -g pnpm

# 构建前端
cd /opt/minechat/repo/MineChat/client
pnpm install
pnpm build
# 产物在 /opt/minechat/repo/MineChat/client/dist/
```

### 步骤3：创建后端Dockerfile

在 `/opt/minechat/repo/MineChat/server/` 目录创建 `Dockerfile`：

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN npx prisma generate
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/app.js"]
```

### 步骤4：创建docker-compose.yml

在 `/opt/minechat/` 目录创建：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: minechat
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: minechat
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"
    networks:
      - minechat-net

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - ./data/redis:/data
    ports:
      - "127.0.0.1:6379:6379"
    networks:
      - minechat-net

  server:
    build:
      context: ./repo/MineChat/server
      dockerfile: Dockerfile
    restart: always
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgresql://minechat:${DB_PASSWORD}@postgres:5432/minechat
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/1
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      CORS_ORIGIN: https://你的域名
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
    depends_on:
      - postgres
      - redis
    ports:
      - "127.0.0.1:3000:3000"
    networks:
      - minechat-net

networks:
  minechat-net:
    driver: bridge
```

### 步骤5：创建.env环境变量

在 `/opt/minechat/` 目录创建 `.env`：

```env
# 数据库密码（自己生成一个强密码）
DB_PASSWORD=你的PostgreSQL密码

# Redis密码
REDIS_PASSWORD=你的Redis密码

# JWT密钥（用 openssl rand -hex 32 生成）
JWT_ACCESS_SECRET=你的Access Token密钥
JWT_REFRESH_SECRET=你的Refresh Token密钥

# SMTP配置（如需邮件验证码功能）
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=你的邮箱
SMTP_PASS=你的邮箱授权码
```

**生成密钥命令**：
```bash
openssl rand -hex 32
```

### 步骤6：配置Nginx反向代理

在宝塔面板中：

1. **网站** → **添加站点**
2. 域名填你的域名（如 `chat.yourdomain.com`）
3. 根目录指向 `/opt/minechat/repo/MineChat/client/dist`
4. PHP版本选 **纯静态**

然后编辑Nginx配置（网站设置 → 配置文件），替换为：

```nginx
server {
    listen 80;
    server_name 你的域名;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 你的域名;

    # SSL证书（宝塔面板可一键申请Let's Encrypt）
    ssl_certificate /www/server/panel/vhost/cert/你的域名/fullchain.pem;
    ssl_certificate_key /www/server/panel/vhost/cert/你的域名/privkey.pem;

    # 前端静态文件
    root /opt/minechat/repo/MineChat/client/dist;
    index index.html;

    # 前端路由（Vue Router history模式）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端API反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.IO WebSocket代理
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 步骤7：配置域名解析

1. 登录阿里云域名控制台
2. 添加A记录：`chat.你的域名.com` → 指向服务器公网IP
3. 等待DNS生效（通常几分钟）

### 步骤8：申请SSL证书

在宝塔面板中：
1. 网站 → 你的站点 → **SSL**
2. 选择 **Let's Encrypt** → 勾选域名 → 申请
3. 开启 **强制HTTPS**

### 步骤9：启动Docker服务

```bash
cd /opt/minechat

# 创建数据目录
mkdir -p data/postgres data/redis

# 启动所有服务
docker compose up -d --build

# 查看日志
docker compose logs -f server
```

### 步骤10：初始化数据库

```bash
# 运行Prisma迁移
docker compose exec server npx prisma migrate deploy

# 运行种子数据（可选，创建测试用户）
docker compose exec server npx prisma db seed
```

### 步骤11：验证

1. 浏览器访问 `https://你的域名`
2. 应看到MineChat开机动画
3. 登录后可正常使用聊天功能

---

## 五、宝塔Docker安装的服务清单

在宝塔Docker管理器中需要安装：

| 镜像 | 用途 | 是否需手动拉取 |
|------|------|----------------|
| `postgres:15-alpine` | PostgreSQL数据库 | 否，docker compose自动拉取 |
| `redis:7-alpine` | Redis缓存 | 否，docker compose自动拉取 |
| `node:20-alpine` | 后端运行环境（构建用） | 否，Dockerfile自动拉取 |

**总结**：宝塔Docker管理器**不需要手动安装任何镜像**，`docker compose up` 会自动拉取。

---

## 六、日常运维

### 更新部署

```bash
cd /opt/minechat/repo/MineChat
git pull origin DEV-V1.0.0

# 重新构建前端
cd client && pnpm install && pnpm build

# 重新构建后端
cd /opt/minechat
docker compose up -d --build server
```

### 查看日志

```bash
docker compose logs -f server    # 后端日志
docker compose logs -f postgres  # 数据库日志
docker compose logs -f redis     # Redis日志
```

### 重启服务

```bash
docker compose restart server    # 只重启后端
docker compose restart           # 重启所有
```

### 数据库备份

```bash
docker compose exec postgres pg_dump -U minechat minechat > backup.sql
```

---

## 七、安全建议

1. **防火墙**：宝塔安全设置中，只开放 80/443 端口，**不要开放** 3000/5432/6379
2. **密码强度**：DB_PASSWORD和REDIS_PASSWORD使用16位以上随机密码
3. **JWT密钥**：每个环境用不同的密钥，不要用开发环境的密钥
4. **SSL**：必须启用HTTPS，Socket.IO的WebSocket需要wss://
5. **CORS**：CORS_ORIGIN只设你的域名，不要用`*`
