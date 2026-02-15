import Dypnsapi20170525, * as $Dypnsapi20170525 from '@alicloud/dypnsapi20170525';
import OpenApi, * as $OpenApi from '@alicloud/openapi-client';
import Util, * as $Util from '@alicloud/tea-util';

export class SmsService {
  private static client: Dypnsapi20170525.default;

  private static createClient(): Dypnsapi20170525.default {
    if (this.client) return this.client;

    const config = new $OpenApi.Config({
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
    });
    // 注意: Endpoint 变更为 dypnsapi.aliyuncs.com
    config.endpoint = `dypnsapi.aliyuncs.com`;
    // @ts-ignore
    this.client = new Dypnsapi20170525.default(config);
    return this.client;
  }

  static async sendVerificationCode(phone: string, code: string): Promise<boolean> {
    try {
      const client = this.createClient();
      
      // 构造 TemplateParam
      // 注意：SendSmsVerifyCode 的 templateParam 也是 JSON 字符串
      const templateParam = {
        code: code,
        min: "5"
      };

      // 构造 SendSmsVerifyCodeRequest
      // 注意字段名变化: phoneNumbers -> phoneNumber (单数)
      const sendSmsVerifyCodeRequest = new $Dypnsapi20170525.SendSmsVerifyCodeRequest({
        phoneNumber: phone,
        signName: process.env.ALIYUN_SMS_SIGN_NAME,
        templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE,
        templateParam: JSON.stringify(templateParam),
        // 可选: 设置有效期 (秒)，默认300秒
        validTime: 300,
      });

      // 使用默认 Runtime 配置
      const runtime = new $Util.RuntimeOptions({});
      const resp = await client.sendSmsVerifyCodeWithOptions(sendSmsVerifyCodeRequest, runtime);
      
      // 检查 code 是否为 OK
      if (resp.body?.code === 'OK') {
        return true;
      } else {
        // 记录更详细的错误信息
        console.error('Aliyun Dypns SMS Error:', {
          code: resp.body?.code,
          message: resp.body?.message,
          requestId: resp.body?.requestId,
          bizId: resp.body?.bizId
        });
        return false;
      }
    } catch (error) {
      console.error('Aliyun Dypns SMS Exception:', error);
      return false;
    }
  }

  /**
   * 校验验证码 (无状态)
   * 调用阿里云 CheckSmsVerifyCode 接口
   */
  static async checkVerificationCode(phone: string, code: string): Promise<boolean> {
    try {
      const client = this.createClient();

      const checkSmsVerifyCodeRequest = new $Dypnsapi20170525.CheckSmsVerifyCodeRequest({
        phoneNumber: phone,
        verifyCode: code,
      });

      const runtime = new $Util.RuntimeOptions({});
      const resp = await client.checkSmsVerifyCodeWithOptions(checkSmsVerifyCodeRequest, runtime);

      // 检查结果
      // code: 'OK' 表示请求成功
      // model.verifyResult: 'PASS' 表示验证通过
      if (resp.body?.code === 'OK' && resp.body?.model?.verifyResult === 'PASS') {
        return true;
      } else {
        console.warn('Aliyun Check Verify Failed:', {
            code: resp.body?.code,
            verifyResult: resp.body?.model?.verifyResult,
            message: resp.body?.message
        });
        return false;
      }
    } catch (error) {
      console.error('Aliyun CheckSmsVerifyCode Exception:', error);
      return false;
    }
  }
}
