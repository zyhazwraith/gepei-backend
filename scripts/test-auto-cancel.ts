import { db } from '../server/db';
import { orders, users } from '../server/db/schema';
import { OrderService } from '../server/services/order.service';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * Verification Script for S-2: Auto Cancel
 */
async function main() {
  console.log('🧪 Testing Auto Cancel Logic (S-2)...');

  // 1. Setup: Create a User and Guide (Mock)
  // Assume user ID 1 and 2 exist (from seed). If not, we might need to create them.
  // For safety, let's just pick existing users or create temp ones if needed.
  // Actually, we can just insert an order directly if we satisfy FKs.
  
  // Let's check if users exist
  const existingUsers = await db.select().from(users).limit(2);
  if (existingUsers.length < 2) {
    console.error('❌ Not enough users to run test. Please seed database first.');
    process.exit(1);
  }
  
  const userId = existingUsers[0].id;
  const guideId = existingUsers[1].id;

  // 2. Create "Expired" Order (Created 80 mins ago)
  const expiredOrderNumber = `TEST-EXP-${nanoid(8)}`;
  const eightyMinsAgo = new Date(Date.now() - 80 * 60 * 1000);
  
  console.log(`Creating expired order ${expiredOrderNumber} at ${eightyMinsAgo.toISOString()}...`);
  
  await db.insert(orders).values({
    orderNumber: expiredOrderNumber,
    userId,
    guideId,
    amount: 10000,
    status: 'pending',
    createdAt: eightyMinsAgo,
    updatedAt: eightyMinsAgo,
  });

  // 3. Create "Active" Order (Created 10 mins ago)
  const activeOrderNumber = `TEST-ACT-${nanoid(8)}`;
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
  
  console.log(`Creating active order ${activeOrderNumber} at ${tenMinsAgo.toISOString()}...`);
  
  await db.insert(orders).values({
    orderNumber: activeOrderNumber,
    userId,
    guideId,
    amount: 10000,
    status: 'pending',
    createdAt: tenMinsAgo,
    updatedAt: tenMinsAgo,
  });

  // 4. Trigger Service Method
  console.log('Running OrderService.cancelExpiredOrders()...');
  const result: any = await OrderService.cancelExpiredOrders();
  console.log('Result:', result);

  // 5. Verify Results
  const expiredOrder = await db.query.orders.findFirst({
    where: eq(orders.orderNumber, expiredOrderNumber)
  });
  
  const activeOrder = await db.query.orders.findFirst({
    where: eq(orders.orderNumber, activeOrderNumber)
  });

  console.log('------------------------------------------------');
  console.log(`Expired Order Status: ${expiredOrder?.status} (Expected: cancelled)`);
  console.log(`Active Order Status:  ${activeOrder?.status}  (Expected: pending)`);
  console.log('------------------------------------------------');

  if (expiredOrder?.status === 'cancelled' && activeOrder?.status === 'pending') {
    console.log('✅ S-2 Verification Passed!');
  } else {
    console.error('❌ S-2 Verification Failed!');
    process.exit(1);
  }

  process.exit(0);
}

main().catch(console.error);
