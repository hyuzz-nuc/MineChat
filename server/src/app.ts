import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import indexRouter from './routes/index.js';

/** 创建Express应用 */
const app = express();

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

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  // 心跳：客户端可定时发送 ping 事件
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });

  // 断开连接
  socket.on('disconnect', (reason) => {
    logger.info(`Socket disconnected: ${socket.id} (${reason})`);
  });
});

/* ────────────── 启动 ────────────── */

httpServer.listen(config.port, () => {
  logger.info(`🚀 MineChat server running on http://localhost:${config.port}`);
  logger.info(`📡 Socket.IO ready on the same port`);
  logger.info(`🔗 CORS origin: ${config.client.url}`);
});

export { app, io };
