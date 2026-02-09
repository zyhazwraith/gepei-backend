import { db } from '../db';
import { guides, users, attachments } from '../db/schema';
import { eq, and, isNull, sql, desc, or, like, count, getTableColumns, inArray, gt } from 'drizzle-orm';
import { Guide } from '../types';
import { parseJsonField } from '../utils/jsonHelper';

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

// Define Guide Scope Constants
export const GUIDE_SCOPE = {
  PUBLIC: 'public',
  FULL: 'full'
} as const;

// V2.2: Define Guide Status Constants
export const GUIDE_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline'
} as const;

export type GuideScopeType = typeof GUIDE_SCOPE[keyof typeof GUIDE_SCOPE];
export type GuideStatusType = typeof GUIDE_STATUS[keyof typeof GUIDE_STATUS];

export interface CreateGuideDTO {
  userId: number;
  stageName: string;
  idNumber: string;
  city: string;
  intro?: string | null;
  expectedPrice?: number | null;
  tags?: string[] | null;
  photoIds?: number[] | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  avatarId?: number | null;
  realName?: string | null;
  realPrice?: number | null;
  status?: GuideStatusType | null;
}

export interface UpdateGuideDTO extends Partial<Omit<CreateGuideDTO, 'userId'>> {
  // All fields optional
}

/**
 * Public Guide Selection Columns
 * Excludes sensitive fields like realName and idNumber using Destructuring Exclusion
 */
const allColumns = getTableColumns(guides);
// Destructure sensitive fields to exclude them
const { realName, idNumber, ...publicColumns } = allColumns;

export const publicGuideSelect = publicColumns;

export async function findGuideByUserId(userId: number, scope: GuideScopeType = GUIDE_SCOPE.PUBLIC): Promise<Guide | null> {
  const selection = scope === GUIDE_SCOPE.PUBLIC 
    ? { ...publicGuideSelect, userNickName: users.nickname, phone: users.phone, isGuide: users.isGuide }
    : { ...getTableColumns(guides), userNickName: users.nickname, phone: users.phone, isGuide: users.isGuide };

  const result = await db.select(selection)
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
export async function createGuide(data: CreateGuideDTO): Promise<number> {
  await db.insert(guides).values({
    userId: data.userId,
    stageName: data.stageName,
    idNumber: data.idNumber,
    city: data.city,
    intro: data.intro || null,
    expectedPrice: data.expectedPrice || null,
    tags: data.tags as any,
    photoIds: data.photoIds as any,
    address: data.address || null,
    latitude: data.latitude ? String(data.latitude) : null,
    longitude: data.longitude ? String(data.longitude) : null,
    avatarId: data.avatarId || null,
    realName: data.realName || null,
    // idVerifiedAt: new Date(), // V2: Removed. Set by Admin only.
    status: data.status || 'offline', // Default to offline
  });

  return data.userId;
}

/**
 * 更新地陪信息
 */
export async function updateGuide(
  userId: number,
  data: UpdateGuideDTO
): Promise<boolean> {
  const updateData: any = {
      ...data,
      latitude: data.latitude ? String(data.latitude) : undefined,
      longitude: data.longitude ? String(data.longitude) : undefined,
  };
  
  // Remove undefined keys
  Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

  if (Object.keys(updateData).length === 0) return false;

  const result = await db.update(guides)
    .set(updateData)
    .where(and(eq(guides.userId, userId), isNull(guides.deletedAt)));

  return result[0].affectedRows > 0;
}

/**
 * 获取所有地陪列表（支持分页和筛选）
 * @param onlyVerified 如果为true，只返回已认证的地陪（前台使用）；如果为false，返回所有（后台使用）
 * @param scope 'public' | 'admin' - public excludes sensitive fields
 */
export async function findAllGuides(
  page: number = 1,
  pageSize: number = 20,
  city?: string,
  keyword?: string,
  userLat?: number,
  userLng?: number,
  status?: GuideStatusType, // V2.2: Replace isGuide with status filter
  scope: GuideScopeType = GUIDE_SCOPE.PUBLIC
): Promise<{ guides: (Guide & { distance?: number, isGuide?: boolean })[]; total: number }> {
  const offset = (page - 1) * pageSize;
  const conditions = [isNull(guides.deletedAt)];

  if (status) {
    conditions.push(eq(guides.status, status));
  }

  if (city) {
    conditions.push(eq(guides.city, city));
  }

  if (keyword) {
    conditions.push(
      or(
        like(guides.stageName, `%${keyword}%`),
        like(guides.intro, `%${keyword}%`),
        like(users.phone, `%${keyword}%`) // Add phone search
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

  // Select columns based on scope
  const selection = scope === GUIDE_SCOPE.PUBLIC 
    ? { 
        ...publicGuideSelect,
        userNickName: users.nickname,
        phone: users.phone, 
        isGuide: users.isGuide,
        distance: distanceField,
        status: guides.status // Add status
      }
    : {
        ...getTableColumns(guides),
        userNickName: users.nickname,
        phone: users.phone,
        isGuide: users.isGuide,
        distance: distanceField
      };

  // V2.2: Public Scope -> Filter by status='online' instead of users.isGuide
  // Logic simplified: status param handles filtering. 
  // We can enforce status=ONLINE if PUBLIC scope and no status provided, but better to let caller handle it.
  
  const result = await db
    .select(selection)
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
      isGuide: row.isGuide ?? false, // Pass through isGuide
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
