import dotenv from 'dotenv';
dotenv.config();

import { db } from '../server/db';
import { users, orders, withdrawals, guides } from '../server/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { faker } from '@faker-js/faker';

async function seedPlatformFinance() {
  console.log('🚀 Seeding Platform Finance Data...');

  try {
    // 1. Ensure Mock Guide User Exists for Withdrawals
    let guideUserId: number;
    const existingGuide = await db.select().from(users).where(eq(users.phone, '13800000002'));
    
    if (existingGuide.length > 0) {
      guideUserId = existingGuide[0].id;
    } else {
      // Create if not exists (fallback)
      const [res] = await db.insert(users).values({
        phone: '13800000002',
        password: 'password123',
        nickname: 'MockGuide1',
        role: 'user',
        isGuide: true,
        createdAt: new Date(),
      }).$returningId();
      guideUserId = res.id;
      
      await db.insert(guides).values({
        userId: guideUserId,
        stageName: 'MockGuide1',
        idNumber: '110101199001011234',
        city: 'Beijing',
        realPrice: 10000,
      });
    }

    const now = new Date();
    
    // 2. Generate Daily Income & Withdrawals for last 30 days
    // We want a nice curve, so let's generate data for EACH day
    for (let d = 0; d < 30; d++) {
      const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      console.log(`Generating data for ${dateStr}...`);

      // A. Income (Orders)
      // 2-5 orders per day
      const dailyOrders = faker.number.int({ min: 2, max: 5 });
      for (let i = 0; i < dailyOrders; i++) {
        const amount = faker.number.int({ min: 20000, max: 100000 }); // 200-1000 Yuan
        // Set actualEndTime to sometime in that day
        const endHour = faker.number.int({ min: 10, max: 22 });
        const endTime = new Date(date);
        endTime.setHours(endHour, 0, 0, 0);

        await db.insert(orders).values({
          orderNumber: `FIN${nanoid(10)}`,
          userId: guideUserId, // Self-booking just for mock
          guideId: guideUserId,
          type: 'standard',
          status: 'completed',
          amount: amount,
          pricePerHour: Math.floor(amount / 4),
          duration: 4,
          totalDuration: 4, // Fix: Provide totalDuration
          content: 'Mock Standard Tour',
          createdAt: new Date(endTime.getTime() - 4 * 3600 * 1000),
          paidAt: new Date(endTime.getTime() - 5 * 3600 * 1000),
          serviceStartTime: new Date(endTime.getTime() - 4 * 3600 * 1000),
          serviceEndTime: endTime,
          actualEndTime: endTime, // Critical for income stats
        });
      }

      // B. Withdrawals
      // Every 2-3 days, generate a withdrawal
      if (d % 3 === 0) {
        const amount = faker.number.int({ min: 50000, max: 200000 }); // 500-2000 Yuan
        // Set processedAt to sometime in that day
        const processHour = faker.number.int({ min: 9, max: 18 });
        const processTime = new Date(date);
        processTime.setHours(processHour, 30, 0, 0);

        await db.insert(withdrawals).values({
          userId: guideUserId,
          amount: amount,
          status: 'completed',
          userNote: 'Mock Withdraw',
          adminNote: 'Auto Approved by Seed',
          createdAt: new Date(processTime.getTime() - 2 * 3600 * 1000),
          processedAt: processTime, // Critical for withdraw stats
        });
      }
    }

    console.log('✅ Platform Finance Data Seeded Successfully.');
  } catch (error) {
    console.error('❌ Failed to seed platform finance data:', error);
  }

  process.exit(0);
}

seedPlatformFinance();
