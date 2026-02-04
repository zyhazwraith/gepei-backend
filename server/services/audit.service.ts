import { db } from '../db';
import { auditLogs } from '../db/schema';
import { AuditActionType, AuditTargetType } from '../constants/audit';
import { desc, eq, and, sql } from 'drizzle-orm';
import { Context } from '../utils/context';

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

export class AuditService {
  /**
   * Create a new audit log entry
   */
  static async log(
    operatorId: number | undefined, // Make optional
    action: AuditActionType, 
    targetType: AuditTargetType, 
    targetId: number, 
    details?: Record<string, any>, 
    ipAddress?: string
  ) {
    // 1. Try to get from Context
    const finalOperatorId = operatorId ?? Context.getOperatorId();
    const finalIpAddress = ipAddress ?? Context.getIpAddress();

    if (!finalOperatorId) {
        console.warn('[AuditService] Missing operatorId for action:', action);
    }

    await db.insert(auditLogs).values({
      operatorId: finalOperatorId || 0, // Fallback to 0 (system) if absolutely missing
      action,
      targetType: targetType || null,
      targetId: targetId || null,
      details: details ? details : null,
      ipAddress: finalIpAddress ? finalIpAddress.slice(0, 45) : null,
    });
  }

  /**
   * Get audit logs with pagination and filters
   */
  static async getLogs({ page = 1, limit = 20, operatorId, action, targetType }: GetLogsParams) {
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
}

// Deprecated: use AuditService class instead
export const auditService = {
    log: (params: CreateLogParams) => AuditService.log(
        params.operatorId, 
        params.action, 
        params.targetType!, 
        params.targetId!, 
        params.details, 
        params.ipAddress
    ),
    getLogs: AuditService.getLogs
};
