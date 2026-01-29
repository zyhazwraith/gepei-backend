/**
 * 辅助函数：解析JSON字段
 * Drizzle ORM 在某些配置下可能直接返回对象，也可能返回字符串
 */
export function parseJsonField<T>(field: any): T | null {
  if (!field) return null;
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch (e) {
      return null;
    }
  }
  return field; // 已经是对象
}
