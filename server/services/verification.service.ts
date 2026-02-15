import { SmsService } from './sms.service.js';

export class VerificationService {
  static async sendCode(phone: string, usage: 'login' | 'reset_password'): Promise<void> {
    // 1. Send SMS (调用 SendSmsVerifyCode, 让阿里云生成 code)
    const sent = await SmsService.sendVerificationCode(phone);
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
