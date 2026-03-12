import cron from 'node-cron';
import { and, eq, lt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { payments } from '../db/schema.js';
import { PaymentService } from '../services/payment/payment.service.js';
import { PAYMENT_STATUS_PENDING } from '../constants/payment.js';

const BATCH_SIZE = 100;
const PENDING_AGE_MINUTES = 2;
const PAYMENT_SYNC_CRON = '*/5 * * * *';

/**
 * Payment Sync Job (Phase1 skeleton)
 * Frequency: every 5 minutes
 */
export const paymentSyncJob = cron.schedule(PAYMENT_SYNC_CRON, async () => {
  console.log('[Scheduler] Running Payment Sync Job...');

  try {
    const threshold = new Date(Date.now() - PENDING_AGE_MINUTES * 60 * 1000);

    const rows = await db
      .select({ outTradeNo: payments.transactionId })
      .from(payments)
      .where(and(eq(payments.status, PAYMENT_STATUS_PENDING), lt(payments.createdAt, threshold)))
      .limit(BATCH_SIZE);

    for (const row of rows) {
      if (!row.outTradeNo) {
        continue;
      }

      try {
        await PaymentService.queryAndSyncByTradeNo(row.outTradeNo);
      } catch (error) {
        console.error(`[Scheduler] Payment Sync failed for tradeNo=${row.outTradeNo}:`, error);
      }
    }

    console.log(`[Scheduler] Payment Sync Job Completed. scanned=${rows.length}`);
  } catch (error) {
    console.error('[Scheduler] Payment Sync Job Failed:', error);
  }
}, {
  scheduled: false,
} as any);
