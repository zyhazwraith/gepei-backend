import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { User } from '../types/index.js';

// 根据手机号查询用户
export async function findUserByPhone(phone: string): Promise<User | null> {
  const result = await db.select()
    .from(users)
    .where(and(eq(users.phone, phone), isNull(users.deletedAt)))
    .limit(1);
  
  if (result.length === 0) return null;

  const user = result[0];

  return {
    id: user.id,
    phone: user.phone,
    password: user.password,
    nickname: user.nickname,
    is_guide: user.isGuide || false,
    role: user.role || 'user',
    balance: Number(user.balance),
    created_at: user.createdAt as Date,
    updated_at: user.updatedAt as Date,
    deleted_at: user.deletedAt,
  } as User;
}

// 根据ID查询用户
export async function findUserById(id: number): Promise<User | null> {
  const result = await db.select()
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .limit(1);

  if (result.length === 0) return null;

  const user = result[0];

  return {
    id: user.id,
    phone: user.phone,
    password: user.password,
    nickname: user.nickname,
    is_guide: user.isGuide || false,
    role: user.role || 'user',
    balance: Number(user.balance),
    created_at: user.createdAt as Date,
    updated_at: user.updatedAt as Date,
    deleted_at: user.deletedAt,
  } as User;
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

// 更新用户信息
export async function updateUser(id: number, data: Partial<User>): Promise<void> {
  const updateData: any = {};

  if (data.nickname !== undefined) {
    updateData.nickname = data.nickname;
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
