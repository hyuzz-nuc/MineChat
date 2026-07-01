/**
 * 认证相关请求验证
 */
import { z } from 'zod';

/** 注册请求验证 */
export const registerSchema = z.object({
  username: z
    .string()
    .min(3, '用户名至少3个字符')
    .max(32, '用户名最多32个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  email: z.string().email('邮箱格式不正确'),
  password: z
    .string()
    .min(8, '密码至少8个字符')
    .max(64, '密码最多64个字符')
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, '密码需包含字母和数字'),
  nickname: z
    .string()
    .min(1, '昵称不能为空')
    .max(32, '昵称最多32个字符'),
});

/** 登录请求验证 */
export const loginSchema = z.object({
  account: z.string().min(1, '请输入用户名或邮箱'),
  password: z.string().min(1, '请输入密码'),
});

/** 刷新令牌验证 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, '刷新令牌不能为空'),
});

/** 发送登录验证码验证 */
export const sendLoginCodeSchema = z.object({
  type: z.enum(['email', 'phone'], { message: '类型必须为email或phone' }),
  target: z.string().min(1, '请输入邮箱或手机号'),
});

/** 验证码登录验证 */
export const loginByCodeSchema = z.object({
  type: z.enum(['email', 'phone'], { message: '类型必须为email或phone' }),
  target: z.string().min(1, '请输入邮箱或手机号'),
  code: z.string().length(6, '验证码为6位数字'),
});

/** 导出类型 */
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type SendLoginCodeInput = z.infer<typeof sendLoginCodeSchema>;
export type LoginByCodeInput = z.infer<typeof loginByCodeSchema>;
