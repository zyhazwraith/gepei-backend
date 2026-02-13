
import { db } from '../db/index.js';
import { orders } from '../db/schema.js';
import { eq, isNull, and, sql } from 'drizzle-orm';

async function main() {
  console.log('Starting data fix...');

  // 1. Fix Standard Orders (Missing pricePerHour or totalDuration)
  const standardOrders = await db.select().from(orders).where(
    and(
      eq(orders.type, 'standard'),
      sql`(${orders.pricePerHour} IS NULL OR ${orders.totalDuration} IS NULL)`
    )
  );

  console.log(`Found ${standardOrders.length} standard orders to fix.`);

  for (const order of standardOrders) {
    const updates: any = {};
    
    // Fix pricePerHour
    if (!order.pricePerHour && order.amount && order.duration) {
      updates.pricePerHour = Math.floor(order.amount / order.duration);
    }

    // Fix totalDuration
    if (!order.totalDuration && order.duration) {
      updates.totalDuration = order.duration;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(orders)
        .set(updates)
        .where(eq(orders.id, order.id));
      console.log(`Fixed Order #${order.id}:`, updates);
    }
  }

  // 2. Fix Custom Orders (Missing totalDuration)
  const customOrders = await db.select().from(orders).where(
    and(
      eq(orders.type, 'custom'),
      isNull(orders.totalDuration)
    )
  );

  console.log(`Found ${customOrders.length} custom orders to fix.`);

  for (const order of customOrders) {
    if (order.duration) {
        await db.update(orders)
            .set({ totalDuration: order.duration })
            .where(eq(orders.id, order.id));
        console.log(`Fixed Custom Order #${order.id}: set totalDuration=${order.duration}`);
    }
  }

  console.log('Done!');
  process.exit(0);
}

main().catch(console.error);
