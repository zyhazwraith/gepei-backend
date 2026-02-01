import { db } from '../db';
import { guides, users, attachments } from '../db/schema';
import { eq, and, isNull, sql, desc, or, like, count, getTableColumns, inArray, gt } from 'drizzle-orm';
import { Guide } from '../types';
import { parseJsonField } from '../utils/jsonHelper';

/**
 * Helper to resolve photo URLs from IDs
 */
export async function resolvePhotoUrls(photoIds: number[]): Promise<{ id: number; url: string }[]> {
  if (!photoIds || photoIds.length === 0) return [];
  
  const photos = await db
    .select({ id: attachments.id, url: attachments.url })
    .from(attachments)
    .where(inArray(attachments.id, photoIds));
    
  // Map back to maintain order if possible
  const photoMap = new Map(photos.map(p => [p.id, p.url]));
  
  return photoIds
    .map(id => ({ id, url: photoMap.get(id) || '' }))
    .filter(p => p.url !== '');
}

/**
 * Helper: Map DB row to Guide entity
 * Handles type conversions (decimal -> number, json -> object)
 */
function mapDbRowToGuide(row: any): Guide {
  return {
    ...row,
    tags: parseJsonField<string[]>(row.tags),
    photoIds: parseJsonField<number[]>(row.photoIds),
    latitude: row.latitude ? Number(row.latitude) : null,
    longitude: row.longitude ? Number(row.longitude) : null,
    expectedPrice: row.expectedPrice ? Number(row.expectedPrice) : null,
    realPrice: row.realPrice ? Number(row.realPrice) : null,
  };
}

// -------------------- Guide Profile Management --------------------

export async function findGuideByUserId(userId: number): Promise<Guide | null> {
  const result = await db.select({
      ...getTableColumns(guides),
      userNickName: users.nickname
    })
    .from(guides)
    .leftJoin(users, eq(guides.userId, users.id))
    .where(and(eq(guides.userId, userId), isNull(guides.deletedAt)))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return mapDbRowToGuide(result[0]);
}

export async function findGuideByIdNumber(idNumber: string): Promise<Guide | null> {
  const result = await db.select()
    .from(guides)
    .where(and(eq(guides.idNumber, idNumber), isNull(guides.deletedAt)))
    .limit(1);

  if (result.length === 0) {
    return null;
  }
  
  return mapDbRowToGuide(result[0]);
}

/**
 * 创建地陪信息
 */
export async function createGuide(
  userId: number,
  stageName: string,
  idNumber: string,
  city: string,
  intro: string | null,
  expectedPrice: number | null,
  tags: string[] | null,
  photoIds: number[] | null,
  address: string | null = null,
  latitude: number | null = null,
  longitude: number | null = null,
  avatarId: number | null = null
): Promise<number> {
  await db.insert(guides).values({
    userId,
    stageName,
    idNumber,
    city,
    intro,
    expectedPrice,
    tags: tags as any,
    photoIds: photoIds as any,
    address,
    latitude: latitude ? String(latitude) : null,
    longitude: longitude ? String(longitude) : null,
    avatarId,
    // idVerifiedAt: new Date(), // V2: Removed. Set by Admin only.
  });

  return userId;
}

/**
 * 更新地陪信息
 */
export async function updateGuide(
  userId: number,
  stageName: string,
  idNumber: string,
  city: string,
  intro: string | null,
  expectedPrice: number | null,
  tags: string[] | null,
  photoIds: number[] | null,
  address: string | null = null,
  latitude: number | null = null,
  longitude: number | null = null,
  avatarId: number | null = null
): Promise<boolean> {
  const result = await db.update(guides)
    .set({
      stageName,
      idNumber,
      city,
      intro,
      expectedPrice,
      tags: tags as any,
      photoIds: photoIds as any,
      address,
      latitude: latitude ? String(latitude) : null,
      longitude: longitude ? String(longitude) : null,
      avatarId,
      // idVerifiedAt: new Date(), // V2: Removed. Set by Admin only.
    })
    .where(and(eq(guides.userId, userId), isNull(guides.deletedAt)));

  return result[0].affectedRows > 0;
}

/**
 * 获取所有地陪列表（支持分页和筛选）
 * @param onlyVerified 如果为true，只返回已认证的地陪（前台使用）；如果为false，返回所有（后台使用）
 */
export async function findAllGuides(
  page: number = 1,
  pageSize: number = 20,
  city?: string,
  keyword?: string,
  userLat?: number,
  userLng?: number,
  onlyVerified: boolean = true
): Promise<{ guides: (Guide & { distance?: number, isGuide?: boolean })[]; total: number }> {
  const offset = (page - 1) * pageSize;
  const conditions = [isNull(guides.deletedAt)];

  if (onlyVerified) {
    conditions.push(eq(users.isGuide, true));
    conditions.push(sql`${guides.realPrice} > 0`);
  }

  if (city) {
    conditions.push(eq(guides.city, city));
  }

  if (keyword) {
    conditions.push(
      or(
        like(guides.stageName, `%${keyword}%`),
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

  const [countResult] = await db
    .select({ total: count() })
    .from(guides)
    .leftJoin(users, eq(guides.userId, users.id)) // Join required for isGuide filter
    .where(and(...conditions));
    
  const total = countResult.total;

  const result = await db
    .select({
      ...getTableColumns(guides),
      userNickName: users.nickname,
      isGuide: users.isGuide, // Include isGuide status
      distance: distanceField
    })
    .from(guides)
    .leftJoin(users, eq(guides.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(guides.createdAt))
    .limit(pageSize)
    .offset(offset);

  const mappedGuides = result.map((row) => {
    const guide = mapDbRowToGuide(row);
    return {
      ...guide,
      isGuide: row.isGuide, // Pass through isGuide
      distance: row.distance ? Number(row.distance) : undefined
    };
  });

  return { guides: mappedGuides, total };
}

/**
 * 更新用户的is_guide状态
 */
export async function updateUserIsGuide(userId: number, isGuide: boolean): Promise<boolean> {
  const result = await db.update(users)
    .set({ isGuide })
    .where(eq(users.id, userId));

  return result[0].affectedRows > 0;
}
