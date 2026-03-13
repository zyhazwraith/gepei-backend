import cron from 'node-cron';
import { and, eq, lt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { orders, overtimeRecords, payments } from '../db/schema.js';
import { PaymentService } from '../services/payment/payment.service.js';
import {
  PAYMENT_RELATED_TYPE_ORDER,
  PAYMENT_RELATED_TYPE_OVERTIME,
  PAYMENT_STATUS_PENDING,
  PAYMENT_STATUS_SUCCESS,
} from '../constants/payment.js';

const BATCH_SIZE = 100;
const PENDING_AGE_MINUTES = 2;
const PAYMENT_SYNC_CRON = '*/5 * * * *';

async function syncPendingPayments(threshold: Date): Promise<number> {
  const rows = await db
    .select({ transactionId: payments.transactionId })
    .from(payments)
    .where(and(eq(payments.status, PAYMENT_STATUS_PENDING), lt(payments.createdAt, threshold)))
    .limit(BATCH_SIZE);

  for (const row of rows) {
    if (!row.transactionId) {
      continue;
    }

    try {
      await PaymentService.queryAndSyncByTransactionId(row.transactionId);
    } catch (error) {
      console.error(`[Scheduler] Pending sync failed for transactionId=${row.transactionId}:`, error);
    }
  }

  return rows.length;
}

async function repairSuccessOrderPayments(): Promise<number> {
  const rows = await db
    .select({ transactionId: payments.transactionId })
    .from(payments)
    .innerJoin(
      orders,
      and(eq(payments.relatedType, PAYMENT_RELATED_TYPE_ORDER), eq(payments.relatedId, orders.id)),
    )
    .where(and(eq(payments.status, PAYMENT_STATUS_SUCCESS), eq(orders.status, PAYMENT_STATUS_PENDING)))
    .limit(BATCH_SIZE);

  for (const row of rows) {
    try {
      await PaymentService.reconcileBusinessByTransactionId(row.transactionId);
    } catch (error) {
      console.error(`[Scheduler] Success repair(order) failed for transactionId=${row.transactionId}:`, error);
    }
  }

  return rows.length;
}

async function repairSuccessOvertimePayments(): Promise<number> {
  const rows = await db
    .select({ transactionId: payments.transactionId })
    .from(payments)
    .innerJoin(
      overtimeRecords,
      and(eq(payments.relatedType, PAYMENT_RELATED_TYPE_OVERTIME), eq(payments.relatedId, overtimeRecords.id)),
    )
    .where(and(eq(payments.status, PAYMENT_STATUS_SUCCESS), eq(overtimeRecords.status, PAYMENT_STATUS_PENDING)))
    .limit(BATCH_SIZE);

  for (const row of rows) {
    try {
      await PaymentService.reconcileBusinessByTransactionId(row.transactionId);
    } catch (error) {
      console.error(`[Scheduler] Success repair(overtime) failed for transactionId=${row.transactionId}:`, error);
    }
  }

  return rows.length;
}

/**
 * Payment Sync Job
 * Frequency: every 5 minutes
 */
export const paymentSyncJob = cron.schedule(PAYMENT_SYNC_CRON, async () => {
  console.log('[Scheduler] Running Payment Sync Job...');

  try {
    const threshold = new Date(Date.now() - PENDING_AGE_MINUTES * 60 * 1000);

    const pendingCount = await syncPendingPayments(threshold);
    const orderRepairCount = await repairSuccessOrderPayments();
    const overtimeRepairCount = await repairSuccessOvertimePayments();

    console.log(
      `[Scheduler] Payment Sync Job Completed. pending=${pendingCount}, orderRepair=${orderRepairCount}, overtimeRepair=${overtimeRepairCount}`,
    );
  } catch (error) {
    console.error('[Scheduler] Payment Sync Job Failed:', error);
  }
}, {
  scheduled: false,
} as any);
