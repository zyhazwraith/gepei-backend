import { db } from '../server/db';
import { orders, users, overtimeRecords } from '../server/db/schema';
import { OrderService } from '../server/services/order.service';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * Verification Script for S-3: Overtime Flow
 */
async function main() {
  console.log('🧪 Testing Overtime Flow (S-3)...');

  // 1. Setup: Create a User and Guide (Mock)
  const existingUsers = await db.select().from(users).limit(2);
  if (existingUsers.length < 2) {
    console.error('❌ Not enough users to run test. Please seed database first.');
    process.exit(1);
  }
  
  const userId = existingUsers[0].id;
  const guideId = existingUsers[1].id;

  // 2. Create an "In Service" Order
  const orderNumber = `TEST-OT-${nanoid(8)}`;
  const now = new Date();
  const serviceStartTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // Started 2 hours ago
  const initialDuration = 8;
  const initialEndTime = new Date(serviceStartTime.getTime() + initialDuration * 60 * 60 * 1000); // Ends in 6 hours
  
  const initialAmount = 10000; // 100 Yuan
  const pricePerHour = 1250; // 12.5 Yuan/hour

  console.log(`Creating in-service order ${orderNumber}...`);
  
  const [insertResult] = await db.insert(orders).values({
    orderNumber,
    userId,
    guideId,
    amount: initialAmount,
    pricePerHour,
    duration: initialDuration,
    totalDuration: initialDuration,
    status: 'in_service',
    serviceStartTime,
    serviceEndTime: initialEndTime, // Initialize serviceEndTime
    createdAt: serviceStartTime,
    updatedAt: now,
  });
  
  const orderId = insertResult.insertId;

  // 3. Create Overtime Request (+2 hours)
  console.log('Creating overtime request (+2h)...');
  const overtimeResult = await OrderService.createOvertime(orderId, userId, 2);
  console.log('Overtime Created:', overtimeResult);

  if (overtimeResult.fee !== 2500) {
      console.error('❌ Fee calculation incorrect. Expected 2500, got', overtimeResult.fee);
      process.exit(1);
  }

  // 4. Verify Pending State
  const pendingOvertime = await db.select().from(overtimeRecords).where(eq(overtimeRecords.id, overtimeResult.overtimeId));
  if (pendingOvertime[0].status !== 'pending') {
      console.error('❌ Overtime status should be pending');
      process.exit(1);
  }

  // 5. Pay Overtime
  console.log('Paying overtime...');
  await OrderService.payOvertime(overtimeResult.overtimeId, userId);

  // 6. Verify Final State
  // 6.1 Overtime status -> paid
  const paidOvertime = await db.select().from(overtimeRecords).where(eq(overtimeRecords.id, overtimeResult.overtimeId));
  if (paidOvertime[0].status !== 'paid') {
      console.error('❌ Overtime status should be paid');
      process.exit(1);
  }

  // 6.2 Order amount -> initial + fee
  // 6.3 Order totalDuration -> initial + duration
  const updatedOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
  });

  console.log('------------------------------------------------');
  console.log(`Initial Amount: ${initialAmount}, Fee: ${overtimeResult.fee}`);
  console.log(`Updated Order Amount: ${updatedOrder?.amount} (Expected: ${initialAmount + overtimeResult.fee})`);
  console.log(`Updated Total Duration: ${updatedOrder?.totalDuration} (Expected: ${initialDuration + 2})`);
  
  // Verify Service End Time
  const expectedNewEndTime = new Date(initialEndTime.getTime() + 2 * 60 * 60 * 1000); // Should be exactly +2h
  const actualNewEndTime = updatedOrder?.serviceEndTime;
  
  console.log(`Updated Service End Time: ${actualNewEndTime?.toISOString()} (Expected: ${expectedNewEndTime.toISOString()})`);
  console.log('------------------------------------------------');

  const isAmountCorrect = updatedOrder?.amount === initialAmount + overtimeResult.fee;
  const isDurationCorrect = updatedOrder?.totalDuration === initialDuration + 2;
  const isEndTimeCorrect = Math.abs(actualNewEndTime!.getTime() - expectedNewEndTime.getTime()) < 1000; // Allow 1s diff

  if (isAmountCorrect && isDurationCorrect && isEndTimeCorrect) {
    console.log('✅ S-3 Verification Passed!');
  } else {
    console.error('❌ S-3 Verification Failed!');
    process.exit(1);
  }

  process.exit(0);
}

main().catch(console.error);
