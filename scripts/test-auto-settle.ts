
import { db } from '../server/db';
import { orders, users, walletLogs, overtimeRecords } from '../server/db/schema';
import { executeSettle } from '../server/scheduler/settle.job';
import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * Test for O-2: Auto Settle
 * 
 * Steps:
 * 1. Setup Guide & User
 * 2. Create Order (Base: 10000)
 * 3. Create & Pay Overtime (Fee: 5000)
 * 4. Update Order -> service_ended + actualEndTime = 25h ago
 * 5. Run Job
 * 6. Verify:
 *    - Order Status = completed
 *    - Guide Balance Increased by (10000 + 5000) * 0.75 = 11250
 *    - Wallet Log exists
 */
async function runTest() {
  console.log('🧪 Starting Auto Settle Test (O-2)...');

  try {
    // 1. Setup Guide
    const guidePhone = `139${nanoid(8)}`;
    const [guideUser] = await db.insert(users).values({
      phone: guidePhone,
      password: 'pwd',
      isGuide: true,
      balance: 0
    }).$returningId();
    const guideId = guideUser.id;

    // 2. Setup User
    const userPhone = `138${nanoid(8)}`;
    const [normalUser] = await db.insert(users).values({
      phone: userPhone,
      password: 'pwd',
      isGuide: false
    }).$returningId();
    const userId = normalUser.id;

    console.log(`Setup Users: Guide(${guideId}), User(${userId})`);

    // 3. Create Order with Overtime
    const baseAmount = 10000;
    const overtimeFee = 5000;
    const totalAmount = baseAmount + overtimeFee;
    
    // Create Order (Simulate S-3 logic: amount is already aggregated)
    const [order] = await db.insert(orders).values({
      orderNumber: `TEST-SETTLE-${nanoid(6)}`,
      userId,
      guideId,
      amount: totalAmount, // 15000
      status: 'service_ended',
      // Set actualEndTime to 25 hours ago
      actualEndTime: new Date(Date.now() - 25 * 60 * 60 * 1000),
      createdAt: new Date(),
    }).$returningId();
    const orderId = order.id;

    console.log(`Created Order(${orderId}) with amount ${totalAmount} and expired actualEndTime`);

    // 4. Run Job
    console.log('Running Settle Job...');
    await executeSettle();

    // 5. Verify
    // A. Check Order Status
    const updatedOrder = await db.query.orders.findFirst({
        where: eq(orders.id, orderId)
    });

    if (updatedOrder?.status === 'completed') {
        console.log('✅ Order status is "completed"');
    } else {
        console.error('❌ Order status is', updatedOrder?.status);
        process.exit(1);
    }

    // B. Check Guide Balance
    const updatedGuide = await db.query.users.findFirst({
        where: eq(users.id, guideId)
    });

    const expectedIncome = Math.floor(totalAmount * 0.75); // 11250
    if (updatedGuide?.balance === expectedIncome) {
        console.log(`✅ Guide balance updated correctly: ${updatedGuide?.balance}`);
    } else {
        console.error(`❌ Guide balance mismatch. Expected: ${expectedIncome}, Got: ${updatedGuide?.balance}`);
        process.exit(1);
    }

    // C. Check Wallet Log
    const log = await db.query.walletLogs.findFirst({
        where: eq(walletLogs.relatedId, orderId)
    });

    if (log && log.type === 'income' && log.amount === expectedIncome) {
        console.log('✅ Wallet Log created correctly');
    } else {
        console.error('❌ Wallet Log incorrect or missing', log);
        process.exit(1);
    }

    console.log('🎉 O-2 Verification Passed!');
    process.exit(0);

  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

runTest();
