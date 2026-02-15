import { SmsService } from './sms.service.js';

export class VerificationService {
  static async sendCode(phone: string, usage: 'login' | 'reset_password'): Promise<void> {
    // 1. Generate Code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Send SMS (调用 SendSmsVerifyCode)
    const sent = await SmsService.sendVerificationCode(phone, code);
    if (!sent) {
      throw new Error('短信发送失败，请稍后重试');
    }
  }

  static async verifyCode(phone: string, code: string, usage: 'login' | 'reset_password'): Promise<boolean> {
    // 1. 调用阿里云进行无状态校验 (CheckSmsVerifyCode)
    const isValid = await SmsService.checkVerificationCode(phone, code);
    
    if (!isValid) {
        return false;
    }
      
    return true;
  }
}
