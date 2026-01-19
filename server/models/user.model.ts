import { query } from '../config/database.js';
import { User, UserPublic } from '../types/index.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// 根据手机号查询用户
export async function findUserByPhone(phone: string): Promise<User | null> {
  const sql = 'SELECT * FROM users WHERE phone = ? AND deleted_at IS NULL LIMIT 1';
  const rows = await query<RowDataPacket[]>(sql, [phone]);
  return rows.length > 0 ? (rows[0] as User) : null;
}

// 根据ID查询用户
export async function findUserById(id: number): Promise<User | null> {
  const sql = 'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1';
  const rows = await query<RowDataPacket[]>(sql, [id]);
  return rows.length > 0 ? (rows[0] as User) : null;
}

// 创建新用户
export async function createUser(
  phone: string,
  hashedPassword: string,
  nickname?: string
): Promise<number> {
  const sql = `
    INSERT INTO users (phone, password, nickname, role)
    VALUES (?, ?, ?, 'user')
  `;
  const result = await query<ResultSetHeader>(sql, [phone, hashedPassword, nickname || null]);
  return result.insertId;
}

// 将用户信息转换为公开格式（不包含密码等敏感信息）
export function toPublicUser(user: User): UserPublic {
  return {
    id: user.id,
    phone: user.phone,
    nickname: user.nickname,
    avatar_url: user.avatar_url,
    is_guide: user.is_guide,
    balance: user.balance,
  };
}
