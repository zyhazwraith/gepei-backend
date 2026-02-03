
import cron from 'node-cron';
import { db } from '../db';
import { orders, users, walletLogs } from '../db/schema';
import { eq, and, lt, sql } from 'drizzle-orm';

/**
 * Core Logic for Settle Job (Exported for Testing)
 */
export async function executeSettle() {
  console.log('[Scheduler] Running Auto-Settle Job...');
  
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Find eligible orders
    // Limit to 100 to avoid long-running transactions blocking DB
    const eligibleOrders = await db.select()
      .from(orders)
      .where(and(
        eq(orders.status, 'service_ended'),
        lt(orders.actualEndTime, twentyFourHoursAgo)
      ))
      .limit(100);

    console.log(`[Scheduler] Found ${eligibleOrders.length} orders to settle.`);

    if (eligibleOrders.length === 0) return;

    let successCount = 0;
    let failCount = 0;

    // 2. Process each order
    for (const order of eligibleOrders) {
      try {
        await db.transaction(async (tx) => {
          // Double check status inside transaction to avoid race conditions
          const [freshOrder] = await tx.select().from(orders).where(eq(orders.id, order.id));
          if (freshOrder.status !== 'service_ended') return;

          // Calculate Income
          // Rule: Guide Income = Order Amount * 75%
          const income = Math.floor(freshOrder.amount * 0.75);

          // A. Update Order Status
          await tx.update(orders)
            .set({ 
              status: 'completed',
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
            type: 'income',
            amount: income,
            relatedType: 'order',
            relatedId: freshOrder.id,
            createdAt: new Date()
          });
        });
        
        successCount++;
      } catch (err) {
        console.error(`[Scheduler] Failed to settle order ${order.id}:`, err);
        failCount++;
      }
    }

    console.log(`[Scheduler] Settle Job Finished. Success: ${successCount}, Fail: ${failCount}`);

  } catch (error) {
    console.error('[Scheduler] Settle Job Error:', error);
  }
}

/**
 * [O-2] Auto Settle Job
 */
export const settleJob = cron.schedule('0 * * * *', executeSettle);
