import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { User, UserPublic } from '../types/index.js';

// 根据手机号查询用户
export async function findUserByPhone(phone: string): Promise<User | null> {
  const result = await db.query.users.findFirst({
    where: and(eq(users.phone, phone), isNull(users.deletedAt)),
  });
  
  // Drizzle 返回的字段名是驼峰命名 (camelCase)，但 User 类型定义可能使用下划线 (snake_case)
  // 如果 server/types/index.ts 定义了下划线，我们需要在这里做转换，或者直接修改 types 定义
  // 根据 schema.ts，字段映射如下:
  // phone -> phone
  // password -> password
  // nickname -> nickname
  // avatarUrl -> avatar_url
  // isGuide -> is_guide
  // role -> role
  // balance -> balance
  // createdAt -> created_at
  // updatedAt -> updated_at
  // deletedAt -> deleted_at
  
  if (!result) return null;

  return {
    id: result.id,
    phone: result.phone,
    password: result.password,
    nickname: result.nickname,
    avatar_url: result.avatarUrl,
    is_guide: result.isGuide || false,
    role: result.role || 'user',
    balance: Number(result.balance),
    created_at: result.createdAt as Date,
    updated_at: result.updatedAt as Date,
    deleted_at: result.deletedAt,
  };
}

// 根据ID查询用户
export async function findUserById(id: number): Promise<User | null> {
  const result = await db.query.users.findFirst({
    where: and(eq(users.id, id), isNull(users.deletedAt)),
  });

  if (!result) return null;

  return {
    id: result.id,
    phone: result.phone,
    password: result.password,
    nickname: result.nickname,
    avatar_url: result.avatarUrl,
    is_guide: result.isGuide || false,
    role: result.role || 'user',
    balance: Number(result.balance),
    created_at: result.createdAt as Date,
    updated_at: result.updatedAt as Date,
    deleted_at: result.deletedAt,
  };
}

// 创建新用户
export async function createUser(
  phone: string,
  hashedPassword: string,
  nickname?: string
): Promise<number> {
  const [result] = await db.insert(users).values({
    phone,
    password: hashedPassword,
    nickname: nickname || null,
    role: 'user',
  });
  
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

// 更新用户信息
export async function updateUser(id: number, data: Partial<User>): Promise<void> {
  const updateData: any = {};

  if (data.nickname !== undefined) {
    updateData.nickname = data.nickname;
  }

  if (data.avatar_url !== undefined) {
    updateData.avatarUrl = data.avatar_url;
  }

  if (data.is_guide !== undefined) {
    updateData.isGuide = data.is_guide;
  }

  if (Object.keys(updateData).length === 0) {
    return;
  }

  await db.update(users)
    .set(updateData)
    .where(and(eq(users.id, id), isNull(users.deletedAt)));
}

// 根据ID获取用户（别名，为了兼容性）
export async function getUserById(id: number): Promise<User | null> {
  return findUserById(id);
}
