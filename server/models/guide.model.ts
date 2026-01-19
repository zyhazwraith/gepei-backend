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
  id_verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * 根据用户ID查找地陪信息
 */
export async function findGuideByUserId(userId: number): Promise<Guide | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM guides WHERE user_id = ? AND deleted_at IS NULL',
    [userId]
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
  photos: string[] | null
): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO guides (user_id, name, id_number, city, intro, hourly_price, tags, photos, id_verified_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      userId,
      name,
      idNumber,
      city,
      intro,
      hourlyPrice,
      tags ? JSON.stringify(tags) : null,
      photos ? JSON.stringify(photos) : null,
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
  photos: string[] | null
): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE guides 
     SET name = ?, id_number = ?, city = ?, intro = ?, hourly_price = ?, tags = ?, photos = ?, id_verified_at = NOW()
     WHERE user_id = ? AND deleted_at IS NULL`,
    [
      name,
      idNumber,
      city,
      intro,
      hourlyPrice,
      tags ? JSON.stringify(tags) : null,
      photos ? JSON.stringify(photos) : null,
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
  keyword?: string
): Promise<{ guides: Guide[]; total: number }> {
  const offset = (page - 1) * pageSize;
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: any[] = [];

  if (city) {
    conditions.push('city = ?');
    params.push(city);
  }

  if (keyword) {
    conditions.push('(name LIKE ? OR intro LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 获取总数
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM guides ${whereClause}`,
    params
  );
  const total = countRows[0].total;

  // 获取数据
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM guides ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const guides = rows.map((guide) => ({
    ...guide,
    tags: typeof guide.tags === 'string' ? JSON.parse(guide.tags) : guide.tags,
    photos: typeof guide.photos === 'string' ? JSON.parse(guide.photos) : guide.photos,
  })) as Guide[];

  return { guides, total };
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
