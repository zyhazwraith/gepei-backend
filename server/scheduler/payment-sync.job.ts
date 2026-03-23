import cron from 'node-cron';
import { and, eq, lt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { orders, overtimeRecords, payments } from '../db/schema.js';
import { PaymentService } from '../services/payment/payment.service.js';
import { logger } from '../lib/logger.js';
import {
  PAYMENT_RELATED_TYPE_ORDER,
  PAYMENT_RELATED_TYPE_OVERTIME,
  PAYMENT_STATUS_PENDING,
  PAYMENT_STATUS_SUCCESS,
} from '../constants/payment.js';

const BATCH_SIZE = 100;
const PENDING_AGE_MINUTES = 2;
const PAYMENT_SYNC_CRON = '*/5 * * * *';

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.stack || error.message;
  }
  return String(error);
}

async function syncPendingPayments(threshold: Date): Promise<number> {
  const rows = await db
    .select({ transactionId: payments.outTradeNo })
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
      logger.error(`payment_sync_pending_failed transactionId=${row.transactionId}`, errorMessage(error));
    }
  }

  return rows.length;
}

async function repairSuccessOrderPayments(): Promise<number> {
  const rows = await db
    .select({ transactionId: payments.outTradeNo })
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
      logger.error(`payment_sync_repair_order_failed transactionId=${row.transactionId}`, errorMessage(error));
    }
  }

  return rows.length;
}

async function repairSuccessOvertimePayments(): Promise<number> {
  const rows = await db
    .select({ transactionId: payments.outTradeNo })
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
      logger.error(`payment_sync_repair_overtime_failed transactionId=${row.transactionId}`, errorMessage(error));
    }
  }

  return rows.length;
}

/**
 * Payment Sync Job
 * Frequency: every 5 minutes
 */
export const paymentSyncJob = cron.schedule(PAYMENT_SYNC_CRON, async () => {
  logger.system('payment_sync_job_started');

  try {
    const threshold = new Date(Date.now() - PENDING_AGE_MINUTES * 60 * 1000);

    const pendingCount = await syncPendingPayments(threshold);
    const orderRepairCount = await repairSuccessOrderPayments();
    const overtimeRepairCount = await repairSuccessOvertimePayments();

    logger.system(
      `payment_sync_job_completed ${logger.kv({ pending: pendingCount, orderRepair: orderRepairCount, overtimeRepair: overtimeRepairCount })}`,
    );
  } catch (error) {
    logger.error('payment_sync_job_failed', errorMessage(error));
  }
}, {
  scheduled: false,
} as any);
