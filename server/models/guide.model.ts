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
  
  // 解析JSON字段
  return {
    ...guide,
    tags: guide.tags ? JSON.parse(guide.tags) : null,
    photos: guide.photos ? JSON.parse(guide.photos) : null,
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
  
  // 解析JSON字段
  return {
    ...guide,
    tags: guide.tags ? JSON.parse(guide.tags) : null,
    photos: guide.photos ? JSON.parse(guide.photos) : null,
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
 * 更新用户的is_guide状态
 */
export async function updateUserIsGuide(userId: number, isGuide: boolean): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    'UPDATE users SET is_guide = ? WHERE id = ?',
    [isGuide, userId]
  );

  return result.affectedRows > 0;
}
