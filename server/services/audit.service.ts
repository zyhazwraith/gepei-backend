import { db } from '../db';
import { auditLogs } from '../db/schema';
import { AuditActionType, AuditTargetType } from '../constants/audit';
import { desc, eq, and, sql } from 'drizzle-orm';

interface CreateLogParams {
  operatorId: number;
  action: AuditActionType;
  targetType?: AuditTargetType;
  targetId?: number;
  details?: Record<string, any>;
  ipAddress?: string;
}

interface GetLogsParams {
  page?: number;
  limit?: number;
  operatorId?: number;
  action?: string;
  targetType?: string;
}

export const auditService = {
  /**
   * Create a new audit log entry
   */
  async log({ operatorId, action, targetType, targetId, details, ipAddress }: CreateLogParams) {
    await db.insert(auditLogs).values({
      operatorId,
      action,
      targetType: targetType || null,
      targetId: targetId || null,
      details: details ? details : null,
      ipAddress: ipAddress ? ipAddress.slice(0, 45) : null,
    });
  },

  /**
   * Get audit logs with pagination and filters
   */
  async getLogs({ page = 1, limit = 20, operatorId, action, targetType }: GetLogsParams) {
    const offset = (page - 1) * limit;

    const filters = [];
    if (operatorId) filters.push(eq(auditLogs.operatorId, operatorId));
    if (action) filters.push(eq(auditLogs.action, action));
    if (targetType) filters.push(eq(auditLogs.targetType, targetType));

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(whereClause);

    // Get data
    const list = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const total = Number(count);
    const totalPages = Math.ceil(total / limit);

    return {
      list,
      pagination: {
        total,
        page,
        page_size: limit,
        total_pages: totalPages
      }
    };
  }
};
