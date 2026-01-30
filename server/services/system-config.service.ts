import { db } from '../db/index.js';
import { systemConfigs } from '../db/schema.js';
import { inArray, sql } from 'drizzle-orm';

// 白名单：允许公开读取的配置 Key
// 必须严格控制，防止敏感信息泄露
const PUBLIC_KEYS_WHITELIST = [
  'cs_qrcode_url',
  'cs_phone',
  'app_version_android',
  'app_version_ios',
  'terms_of_service_url',
  'privacy_policy_url'
];

export class SystemConfigService {
  
  /**
   * 获取配置列表
   * @param keys 可选，指定要获取的 key 列表
   * @param isPublic 是否为公开接口调用（如果是，则强制应用白名单）
   */
  static async getConfigs(keys?: string[], isPublic: boolean = true) {
    let queryKeys = keys;

    if (isPublic) {
      // 如果是 Public 调用
      if (queryKeys && queryKeys.length > 0) {
        // 1. 如果请求指定了 key，则必须全在白名单内，过滤掉非法的
        queryKeys = queryKeys.filter(k => PUBLIC_KEYS_WHITELIST.includes(k));
      } else {
        // 2. 如果没指定 key，则默认返回所有白名单内的配置
        queryKeys = PUBLIC_KEYS_WHITELIST;
      }

      // 如果过滤后为空（且原请求不为空），说明请求的全是非法 key，直接返回空
      if (keys && keys.length > 0 && queryKeys.length === 0) {
        return {};
      }
    }

    // 构建查询
    const conditions = queryKeys && queryKeys.length > 0 
      ? inArray(systemConfigs.key, queryKeys)
      : undefined;

    const rows = await db.select({
      key: systemConfigs.key,
      value: systemConfigs.value
    }).from(systemConfigs).where(conditions);

    // 转换为 Key-Value 对象返回
    const result: Record<string, string | null> = {};
    rows.forEach(row => {
      result[row.key] = row.value;
    });

    return result;
  }

  /**
   * 批量更新配置 (Admin Only)
   * 使用 Upsert 逻辑
   */
  static async updateConfigs(configs: { key: string; value: string; description?: string }[]) {
    if (configs.length === 0) return;

    // MySQL Drizzle 批量 Upsert
    // 由于 Drizzle ORM 的 onDuplicateKeyUpdate 语法在批量插入时略显复杂，
    // 这里我们采用简单的 Promise.all 并发单条 Upsert，或者构建 SQL。
    // 考虑到配置项数量很少（通常 < 10），并发执行是可以接受的。
    
    await db.transaction(async (tx) => {
      for (const config of configs) {
        await tx.insert(systemConfigs).values({
          key: config.key,
          value: config.value,
          description: config.description
        }).onDuplicateKeyUpdate({
          set: {
            value: config.value,
            description: config.description, // 可选更新描述
            updatedAt: new Date()
          }
        });
      }
    });
  }
}
