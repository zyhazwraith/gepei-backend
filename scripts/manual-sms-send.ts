import dotenv from 'dotenv';
import { SmsService } from '../server/services/sms.service.js';

// 加载环境变量
dotenv.config();

// 检查必要的环境变量
const requiredEnvs = [
  'ALIYUN_ACCESS_KEY_ID',
  'ALIYUN_ACCESS_KEY_SECRET',
  'ALIYUN_SMS_SIGN_NAME',
  'ALIYUN_SMS_TEMPLATE_CODE'
];

const missingEnvs = requiredEnvs.filter(env => !process.env[env]);

if (missingEnvs.length > 0) {
  console.error('❌ 缺少必要的环境变量，无法发送真实短信:');
  missingEnvs.forEach(env => console.error(`   - ${env}`));
  console.log('\n请在 .env 文件中配置这些变量。');
  console.log('示例:');
  console.log('ALIYUN_ACCESS_KEY_ID=LTAIxxxxxxxx');
  console.log('ALIYUN_ACCESS_KEY_SECRET=xxxxxxxxxxxxxxxx');
  console.log('ALIYUN_SMS_SIGN_NAME=阿里云短信测试');
  console.log('ALIYUN_SMS_TEMPLATE_CODE=SMS_154950909');
  process.exit(1);
}

// 目标手机号 (从命令行参数获取，默认是你之前提到的测试号)
const targetPhone = process.argv[2] || '13999999999';
const testCode = Math.floor(100000 + Math.random() * 900000).toString();

async function testSend() {
  console.log('--- 阿里云短信发送测试 ---');
  console.log(`目标手机: ${targetPhone}`);
  console.log(`验证码: ${testCode}`);
  console.log(`签名: ${process.env.ALIYUN_SMS_SIGN_NAME}`);
  console.log(`模版: ${process.env.ALIYUN_SMS_TEMPLATE_CODE}`);
  console.log('--------------------------');

  try {
    console.log('正在发送...');
    const success = await SmsService.sendVerificationCode(targetPhone, testCode);

    if (success) {
      console.log('✅ 发送成功！请检查手机是否收到短信。');
    } else {
      console.error('❌ 发送失败，请检查上方错误日志。');
    }
  } catch (error) {
    console.error('❌ 发生异常:', error);
  }
}

testSend();
