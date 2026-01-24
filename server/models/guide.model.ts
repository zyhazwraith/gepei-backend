import { db } from '../db';
import { guides, users } from '../db/schema';
import { eq, and, isNull, sql, desc, or, like, count } from 'drizzle-orm';
import { pool } from '../config/database.js';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

/**
 * 地陪信息接口
 */
export interface Guide {
  id: number;
  user_id: number;
  name: string;
  id_number: string;
  city: string;
  intro: string | null;
  hourly_price: number | null;
  tags: string[] | null;
  photos: string[] | null;
  latitude: number | null;
  longitude: number | null;
  id_verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
  user_nickname?: string;
}

/**
 * 辅助函数：安全地解析JSON字段
 * 兼容 Drizzle 自动解析（返回对象）和 未解析（返回字符串）的情况
 */
function parseJsonField<T>(value: any): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error('JSON parse error:', e);
      return null;
    }
  }
  return value as T;
}

/**
 * 根据用户ID查找地陪信息
 */
export async function findGuideByUserId(userId: number): Promise<Guide | null> {
  const result = await db.select({
      id: guides.id,
      user_id: guides.userId,
      name: guides.name,
      id_number: guides.idNumber,
      city: guides.city,
      intro: guides.intro,
      hourly_price: guides.hourlyPrice,
      tags: guides.tags,
      photos: guides.photos,
      latitude: guides.latitude,
      longitude: guides.longitude,
      id_verified_at: guides.idVerifiedAt,
      created_at: guides.createdAt,
      updated_at: guides.updatedAt,
      user_nickname: users.nickname
    })
    .from(guides)
    .leftJoin(users, eq(guides.userId, users.id))
    .where(and(eq(guides.userId, userId), isNull(guides.deletedAt)))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const guide = result[0];
  console.log('findGuideByUserId raw:', guide); // Debug log
  
  return {
    ...guide,
    tags: parseJsonField<string[]>(guide.tags),
    photos: parseJsonField<string[]>(guide.photos),
    hourly_price: guide.hourly_price ? Number(guide.hourly_price) : null,
    latitude: guide.latitude ? Number(guide.latitude) : null,
    longitude: guide.longitude ? Number(guide.longitude) : null,
  } as Guide;
}

/**
 * 根据ID查找地陪信息
 */
export async function findGuideById(id: number): Promise<Guide | null> {
  const result = await db.select({
      id: guides.id,
      user_id: guides.userId,
      name: guides.name,
      id_number: guides.idNumber,
      city: guides.city,
      intro: guides.intro,
      hourly_price: guides.hourlyPrice,
      tags: guides.tags,
      photos: guides.photos,
      latitude: guides.latitude,
      longitude: guides.longitude,
      id_verified_at: guides.idVerifiedAt,
      created_at: guides.createdAt,
      updated_at: guides.updatedAt,
      user_nickname: users.nickname
    })
    .from(guides)
    .leftJoin(users, eq(guides.userId, users.id))
    .where(and(eq(guides.id, id), isNull(guides.deletedAt)))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const guide = result[0];
  
  return {
    ...guide,
    tags: parseJsonField<string[]>(guide.tags),
    photos: parseJsonField<string[]>(guide.photos),
    hourly_price: guide.hourly_price ? Number(guide.hourly_price) : null,
    latitude: guide.latitude ? Number(guide.latitude) : null,
    longitude: guide.longitude ? Number(guide.longitude) : null,
  } as Guide;
}

/**
 * 根据身份证号查找地陪信息
 */
export async function findGuideByIdNumber(idNumber: string): Promise<Guide | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM guides WHERE id_number = ? AND deleted_at IS NULL',
    [idNumber]
  );

  if (rows.length === 0) {
    return null;
  }

  const guide = rows[0];
  
  // MySQL JSON类型已自动解析，不需要再次JSON.parse
  // 如果是字符串则解析，如果已经是对象则直接使用
  return {
    ...guide,
    tags: typeof guide.tags === 'string' ? JSON.parse(guide.tags) : guide.tags,
    photos: typeof guide.photos === 'string' ? JSON.parse(guide.photos) : guide.photos,
  } as Guide;
}

/**
 * 创建地陪信息
 */
export async function createGuide(
  userId: number,
  name: string,
  idNumber: string,
  city: string,
  intro: string | null,
  hourlyPrice: number | null,
  tags: string[] | null,
  photos: string[] | null,
  latitude: number | null = null,
  longitude: number | null = null
): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO guides (user_id, name, id_number, city, intro, hourly_price, tags, photos, latitude, longitude, id_verified_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      userId,
      name,
      idNumber,
      city,
      intro,
      hourlyPrice,
      tags ? JSON.stringify(tags) : null,
      photos ? JSON.stringify(photos) : null,
      latitude,
      longitude,
    ]
  );

  return result.insertId;
}

/**
 * 更新地陪信息
 */
export async function updateGuide(
  userId: number,
  name: string,
  idNumber: string,
  city: string,
  intro: string | null,
  hourlyPrice: number | null,
  tags: string[] | null,
  photos: string[] | null,
  latitude: number | null = null,
  longitude: number | null = null
): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE guides 
     SET name = ?, id_number = ?, city = ?, intro = ?, hourly_price = ?, tags = ?, photos = ?, latitude = ?, longitude = ?, id_verified_at = NOW()
     WHERE user_id = ? AND deleted_at IS NULL`,
    [
      name,
      idNumber,
      city,
      intro,
      hourlyPrice,
      tags ? JSON.stringify(tags) : null,
      photos ? JSON.stringify(photos) : null,
      latitude,
      longitude,
      userId,
    ]
  );

  return result.affectedRows > 0;
}

/**
 * 获取所有地陪列表（支持分页和筛选）
 */
export async function findAllGuides(
  page: number = 1,
  pageSize: number = 20,
  city?: string,
  keyword?: string,
  userLat?: number,
  userLng?: number
): Promise<{ guides: (Guide & { distance?: number })[]; total: number }> {
  const offset = (page - 1) * pageSize;
  const conditions = [isNull(guides.deletedAt)];

  if (city) {
    conditions.push(eq(guides.city, city));
  }

  if (keyword) {
    conditions.push(
      or(
        like(guides.name, `%${keyword}%`),
        like(guides.intro, `%${keyword}%`)
      )!
    );
  }

  // 距离计算
  let distanceField = sql<number>`NULL`.as('distance');
  if (userLat !== undefined && userLng !== undefined) {
    distanceField = sql<number>`(
      6371 * acos (
        cos ( radians(${userLat}) )
        * cos( radians( ${guides.latitude} ) )
        * cos( radians( ${guides.longitude} ) - radians(${userLng}) )
        + sin ( radians(${userLat}) )
        * sin( radians( ${guides.latitude} ) )
      )
    )`.as('distance');
  }

  // 获取总数
  const [countResult] = await db
    .select({ total: count() })
    .from(guides)
    .where(and(...conditions));
    
  const total = countResult.total;

  // 获取数据
  const result = await db
    .select({
      id: guides.id,
      user_id: guides.userId,
      name: guides.name,
      id_number: guides.idNumber,
      city: guides.city,
      intro: guides.intro,
      hourly_price: guides.hourlyPrice,
      tags: guides.tags,
      photos: guides.photos,
      latitude: guides.latitude,
      longitude: guides.longitude,
      id_verified_at: guides.idVerifiedAt,
      created_at: guides.createdAt,
      updated_at: guides.updatedAt,
      user_nickname: users.nickname,
      distance: distanceField
    })
    .from(guides)
    .leftJoin(users, eq(guides.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(guides.createdAt))
    .limit(pageSize)
    .offset(offset);

  const mappedGuides = result.map((guide) => ({
    ...guide,
    tags: parseJsonField<string[]>(guide.tags),
    photos: parseJsonField<string[]>(guide.photos),
    hourly_price: guide.hourly_price ? Number(guide.hourly_price) : null,
    latitude: guide.latitude ? Number(guide.latitude) : null,
    longitude: guide.longitude ? Number(guide.longitude) : null,
    distance: guide.distance ? Number(guide.distance) : undefined
  })) as (Guide & { distance?: number })[];

  return { guides: mappedGuides, total };
}

/**
 * 更新用户的is_guide状态
 */
export async function updateUserIsGuide(userId: number, isGuide: boolean): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    'UPDATE users SET is_guide = ? WHERE id = ?',
    [isGuide, userId]
  );

  return result.affectedRows > 0;
}
