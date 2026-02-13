import { Request, Response } from 'express';
import { auditService } from '../../services/audit.service.js';
import { z } from 'zod';

// Validation schema for query params
const listLogsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  operator_id: z.coerce.number().optional(),
  action: z.string().optional(),
  target_type: z.string().optional(),
});

export const listAuditLogs = async (req: Request, res: Response) => {
  const query = listLogsSchema.parse(req.query);

  // result now contains { list, pagination } which matches the standard response format
  const result = await auditService.getLogs({
    page: query.page,
    limit: query.limit,
    operatorId: query.operator_id,
    action: query.action,
    targetType: query.target_type,
  });

  res.json({
    code: 0,
    message: 'Success',
    data: result,
  });
};
