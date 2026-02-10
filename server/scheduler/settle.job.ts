
import cron from 'node-cron';
import { db } from '../db';
import { orders, users, walletLogs } from '../db/schema';
import { eq, and, lt, sql } from 'drizzle-orm';
import { OrderStatus, WalletLogType } from '../constants';
import { GUIDE_INCOME_RATIO } from '../shared/constants';

/**
 * Core Logic for Settle Job (Exported for Testing)
 */
export async function executeSettle() {
  console.log('[Scheduler] Running Auto-Settle Job...');
  
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const BATCH_SIZE = 100;
    
    let processedTotal = 0;
    let successTotal = 0;
    let failTotal = 0;
    let hasMore = true;

    while (hasMore) {
      // 1. Fetch Batch
      const eligibleOrders = await db.select()
        .from(orders)
        .where(and(
          eq(orders.status, OrderStatus.SERVICE_ENDED),
          lt(orders.actualEndTime, twentyFourHoursAgo)
        ))
        .limit(BATCH_SIZE);

      if (eligibleOrders.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`[Scheduler] Processing batch of ${eligibleOrders.length} orders...`);

      // 2. Process Batch
      for (const order of eligibleOrders) {
        try {
          await db.transaction(async (tx) => {
            // Double check status inside transaction to avoid race conditions
            const [freshOrder] = await tx.select().from(orders).where(eq(orders.id, order.id));
            if (freshOrder.status !== OrderStatus.SERVICE_ENDED) return;

            // Calculate Income
            // Rule: Use pre-calculated guideIncome from DB (includes overtime)
            // Fallback: Calculate from amount if guideIncome is missing (legacy data support)
            const income = freshOrder.guideIncome ?? Math.floor(freshOrder.amount * GUIDE_INCOME_RATIO);

            // A. Update Order Status
            await tx.update(orders)
              .set({ 
                status: OrderStatus.COMPLETED,
                updatedAt: new Date()
              })
              .where(eq(orders.id, order.id));

            // B. Update Guide Balance
            await tx.update(users)
              .set({ 
                balance: sql`${users.balance} + ${income}`,
                updatedAt: new Date()
              })
              .where(eq(users.id, freshOrder.guideId));

            // C. Log Wallet Transaction
            await tx.insert(walletLogs).values({
              userId: freshOrder.guideId,
              type: WalletLogType.INCOME,
              amount: income,
              relatedType: 'order',
              relatedId: freshOrder.id,
              createdAt: new Date()
            });
          });
          
          successTotal++;
        } catch (err) {
          console.error(`[Scheduler] Failed to settle order ${order.id}:`, err);
          failTotal++;
        }
      }
      
      processedTotal += eligibleOrders.length;
      
      // Safety break to prevent infinite loops in dev/test if something goes wrong (e.g. status not updating)
      // In production, we might want to let it run, but for now 100 batches (10k orders) is a safe upper bound per hour.
      if (processedTotal > 10000) {
          console.warn('[Scheduler] Hit safety limit of 10,000 orders per run. Stopping.');
          break;
      }
    }

    console.log(`[Scheduler] Settle Job Finished. Total Processed: ${processedTotal}. Success: ${successTotal}, Fail: ${failTotal}`);

  } catch (error) {
    console.error('[Scheduler] Settle Job Error:', error);
  }
}

/**
 * [O-2] Auto Settle Job
 */
export const settleJob = cron.schedule('0 * * * *', executeSettle);
