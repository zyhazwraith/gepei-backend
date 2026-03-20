import cron from 'node-cron';
import { and, eq, lt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { refundRecords } from '../db/schema.js';
import { logger } from '../lib/logger.js';
import { RefundService } from '../services/payment/refund.service.js';

const BATCH_SIZE = 100;
const PENDING_AGE_MINUTES = 2;
const REFUND_SYNC_CRON = '*/5 * * * *';

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.stack || error.message;
  }
  return String(error);
}

async function syncPendingRefunds(threshold: Date): Promise<number> {
  const rows = await db
    .select({ outRefundNo: refundRecords.outRefundNo })
    .from(refundRecords)
    .where(and(eq(refundRecords.status, 'pending'), lt(refundRecords.createdAt, threshold)))
    .limit(BATCH_SIZE);

  for (const row of rows) {
    if (!row.outRefundNo) {
      continue;
    }

    try {
      await RefundService.queryAndSyncByOutRefundNo(row.outRefundNo);
    } catch (error) {
      logger.error(`refund_sync_pending_failed outRefundNo=${row.outRefundNo}`, errorMessage(error));
    }
  }

  return rows.length;
}

export const refundSyncJob = cron.schedule(REFUND_SYNC_CRON, async () => {
  logger.system('refund_sync_job_started');

  try {
    const threshold = new Date(Date.now() - PENDING_AGE_MINUTES * 60 * 1000);
    const pendingCount = await syncPendingRefunds(threshold);
    logger.system(`refund_sync_job_completed ${logger.kv({ pending: pendingCount })}`);
  } catch (error) {
    logger.error('refund_sync_job_failed', errorMessage(error));
  }
}, {
  scheduled: false,
} as any);
