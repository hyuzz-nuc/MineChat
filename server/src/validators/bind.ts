/**
 * 账号绑定相关请求验证
 */
import { z } from 'zod';

/** 发送验证码验证 */
export const sendCodeSchema = z.object({
  type: z.enum(['email', 'phone'], { required_error: '请选择验证类型' }),
  target: z.string().min(1, '请输入邮箱或手机号'),
  purpose: z.enum(['bind', 'unbind', 'login']).default('bind'),
}).refine((data) => {
  // 邮箱格式校验
  if (data.type === 'email') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.target);
  }
  // 手机号格式校验（中国大陆11位）
  if (data.type === 'phone') {
    return /^1[3-9]\d{9}$/.test(data.target);
  }
  return true;
}, {
  message: '格式不正确',
  path: ['target'],
});

/** 绑定账号验证 */
export const bindSchema = z.object({
  type: z.enum(['email', 'phone'], { required_error: '请选择绑定类型' }),
  target: z.string().min(1, '请输入邮箱或手机号'),
  code: z.string().length(6, '验证码为6位数字'),
}).refine((data) => {
  if (data.type === 'email') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.target);
  }
  if (data.type === 'phone') {
    return /^1[3-9]\d{9}$/.test(data.target);
  }
  return true;
}, {
  message: '格式不正确',
  path: ['target'],
});

/** 解绑账号验证 */
export const unbindSchema = z.object({
  type: z.enum(['email', 'phone'], { required_error: '请选择解绑类型' }),
  code: z.string().length(6, '验证码为6位数字'),
});

/** 导出类型 */
export type SendCodeInput = z.infer<typeof sendCodeSchema>;
export type BindInput = z.infer<typeof bindSchema>;
export type UnbindInput = z.infer<typeof unbindSchema>;
