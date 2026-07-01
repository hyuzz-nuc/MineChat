import express, { type Express } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { socketAuthMiddleware } from './socket/middleware/auth.js';
import { registerMessageHandlers } from './socket/handlers/message.js';
import indexRouter from './routes/index.js';
import redis from './config/redis.js';

/** 创建Express应用 */
const app: Express = express();

/** 创建HTTP服务器 */
const httpServer = createServer(app);

/** 创建Socket.IO服务器 */
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.client.url,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

/* ────────────── 中间件 ────────────── */

app.use(cors({ origin: config.client.url, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ────────────── 路由 ────────────── */

app.use('/api/v1', indexRouter);

/* ────────────── 错误处理 ────────────── */

app.use(notFoundHandler);
app.use(errorHandler);

/* ────────────── Socket.IO ────────────── */

// 鉴权中间件
io.use(socketAuthMiddleware);

// 连接处理
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id} (user: ${socket.userId})`);

  // 注册消息事件处理器
  registerMessageHandlers(io, socket);

  // 心跳
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });
});

/* ────────────── 启动 ────────────── */

async function startServer(): Promise<void> {
  try {
    // 连接 Redis
    await redis.connect();
    logger.info('🔴 Redis connected (DB1)');

    // 启动 HTTP 服务
    httpServer.listen(config.port, () => {
      logger.info(`🚀 MineChat server running on http://localhost:${config.port}`);
      logger.info(`📡 Socket.IO ready on the same port`);
      logger.info(`🔗 CORS origin: ${config.client.url}`);
    });
  } catch (err: any) {
    logger.error(`Server startup failed: ${err.message}`);
    process.exit(1);
  }
}

startServer();

/* ────────────── 全局错误兜底（防止async错误导致进程崩溃） ────────────── */

process.on('unhandledRejection', (reason: any) => {
  logger.error(`Unhandled Rejection: ${reason?.message || reason}`);
  // 不退出进程，只记录日志。Express errorHandler会处理已到达中间件的错误
});

process.on('uncaughtException', (err: Error) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  // 严重错误：记录后安全退出
  process.exit(1);
});

export { app, io };
