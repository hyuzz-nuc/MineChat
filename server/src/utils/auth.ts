/**
 * JWT 令牌工具
 * 双token机制：Access Token (15min) + Refresh Token (7d)
 */
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

/** Access Token 载荷 */
export interface AccessTokenPayload {
  userId: string;
  username: string;
}

/** Refresh Token 载荷 */
export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number; // 用于使旧token失效
}

/** 签发 Access Token */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

/** 签发 Refresh Token */
export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
}

/** 验证 Access Token */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.jwt.secret) as AccessTokenPayload;
}

/** 验证 Refresh Token */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, config.jwt.refreshSecret) as RefreshTokenPayload;
}
