/**
 * @deprecated This file is deprecated. Please use Drizzle ORM (server/db/index.ts) instead.
 * Only kept for compatibility with legacy code (e.g. guide.model.ts).
 */
import mysql from 'mysql2/promise';

// 测试环境数据库配置（硬编码）
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gepei_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+08:00', // 中国时区
};

// 创建连接池
export const pool = mysql.createPool(dbConfig);

// 测试数据库连接
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    console.log('✓ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    return false;
  }
}

// 执行查询的辅助函数
export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const [rows] = await pool.execute(sql, params);
  return rows as T;
}

export default pool;
