import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/minechat',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
    expiresIn: String(process.env.JWT_EXPIRES_IN || '15m'),
    refreshExpiresIn: String(process.env.JWT_REFRESH_EXPIRES_IN || '7d'),
  },
  client: {
    url: process.env.CLIENT_URL || 'http://localhost:5173',
  },
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.qq.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'MineChat <noreply@minechat.dev>',
  },
  sms: {
    mock: process.env.SMS_MOCK !== 'false', // 默认模拟模式
    mockCode: process.env.SMS_MOCK_CODE || '888888',
  },
};
