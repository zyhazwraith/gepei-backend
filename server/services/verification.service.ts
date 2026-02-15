import { db } from '../db/index.js';
import { verificationCodes } from '../db/schema.js';
import { eq, and, gt, desc } from 'drizzle-orm';
import { SmsService } from './sms.service.js';

export class VerificationService {
  static async sendCode(phone: string, usage: 'login' | 'reset_password'): Promise<void> {
    // 1. Rate Limit Check (60s limit)
    const [lastRecord] = await db.select()
      .from(verificationCodes)
      .where(and(
        eq(verificationCodes.phone, phone),
        eq(verificationCodes.usage, usage),
        gt(verificationCodes.createdAt, new Date(Date.now() - 60 * 1000)) 
      ))
      .orderBy(desc(verificationCodes.createdAt))
      .limit(1);

    if (lastRecord) {
      throw new Error('请勿频繁发送验证码');
    }

    // 2. Generate Code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Send SMS (调用 SendSmsVerifyCode)
    const sent = await SmsService.sendVerificationCode(phone, code);
    if (!sent) {
      throw new Error('短信发送失败，请稍后重试');
    }

    // 4. Record to DB (Rate Limit Only)
    // 为了安全，不再存储真实 code，而是存掩码或特殊标记
    await db.insert(verificationCodes).values({
      phone,
      code: '******', // Masked code for stateless verification
      usage,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 mins
    });
  }

  static async verifyCode(phone: string, code: string, usage: 'login' | 'reset_password'): Promise<boolean> {
    // 1. 调用阿里云进行无状态校验 (CheckSmsVerifyCode)
    const isValid = await SmsService.checkVerificationCode(phone, code);
    
    if (!isValid) {
        return false;
    }

    // 2. 更新本地日志状态 (可选)
    // 找到最近一条未使用的记录并标记为已使用，用于分析统计
    const [record] = await db.select()
      .from(verificationCodes)
      .where(and(
        eq(verificationCodes.phone, phone),
        eq(verificationCodes.used, false),
        gt(verificationCodes.createdAt, new Date(Date.now() - 10 * 60 * 1000)) // 查找最近10分钟内的记录
      ))
      .orderBy(desc(verificationCodes.createdAt))
      .limit(1);

    if (record) {
      await db.update(verificationCodes)
        .set({ used: true })
        .where(eq(verificationCodes.id, record.id));
    }
      
    return true;
  }
}
