import dotenv from 'dotenv';
dotenv.config();

import { db } from '../server/db';
import { users, orders, guides } from '../server/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { faker } from '@faker-js/faker';

async function seedCSPerformance() {
  console.log('🚀 Seeding CS Performance Data...');

  try {
    // 1. Ensure basic Guide & User for orders
    // We need at least one guide to assign to orders (though custom orders might not always need one in pending, 
    // but completed ones do)
    
    // First, try to find or create the mock user and ensure we have a valid ID
    let mockUserId: number;
    const existingUser = await db.select().from(users).where(eq(users.phone, '13800000001'));
    if (existingUser.length > 0) {
      mockUserId = existingUser[0].id;
    } else {
      const [res] = await db.insert(users).values({
        phone: '13800000001',
        password: 'password123',
        nickname: 'MockUser1',
        role: 'user',
        createdAt: new Date(),
      }).$returningId();
      mockUserId = res.id;
    }

    // Next, ensure the guide user exists
    let guideUserId: number;
    const existingGuideUser = await db.select().from(users).where(eq(users.phone, '13800000002'));
    if (existingGuideUser.length > 0) {
      guideUserId = existingGuideUser[0].id;
    } else {
      const [res] = await db.insert(users).values({
        phone: '13800000002',
        password: 'password123',
        nickname: 'MockGuide1',
        role: 'user',
        isGuide: true,
        createdAt: new Date(),
      }).$returningId();
      guideUserId = res.id;
    }

    await db.insert(guides).values({
      userId: guideUserId,
      stageName: 'MockGuide1',
      idNumber: '110101199001011234',
      city: 'Beijing',
      realPrice: 10000,
    }).onDuplicateKeyUpdate({ set: { stageName: 'MockGuide1' } });

    // 2. Create CS Accounts
    const csList = [
      { phone: '19900000002', name: '客服小美' },
      { phone: '19900000003', name: '客服阿强' },
      { phone: '19900000004', name: '客服丽丽' },
    ];

    const csIds: number[] = [];

    for (const cs of csList) {
      let csId: number;
      const existing = await db.select().from(users).where(eq(users.phone, cs.phone));
      
      if (existing.length > 0) {
        csId = existing[0].id;
        await db.update(users).set({ nickname: cs.name, role: 'cs' }).where(eq(users.id, csId));
      } else {
        const hashedPassword = await bcrypt.hash('password123', 10);
        const [res] = await db.insert(users).values({
          phone: cs.phone,
          password: hashedPassword,
          nickname: cs.name,
          role: 'cs',
          createdAt: new Date(),
        }).$returningId();
        csId = res.id;
      }
      csIds.push(csId);
      console.log(`✅ CS ${cs.name} ready (ID: ${csId})`);
    }

    // 3. Generate Custom Orders for each CS
    const now = new Date();
    
    for (let i = 0; i < csIds.length; i++) {
      const csId = csIds[i];
      // Generate 5-15 orders per CS
      const orderCount = faker.number.int({ min: 5, max: 15 });
      
      console.log(`Creating ${orderCount} orders for CS ID ${csId}...`);

      for (let j = 0; j < orderCount; j++) {
        // Random date within last 30 days
        const daysAgo = faker.number.int({ min: 0, max: 30 });
        const orderDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        const serviceEndTime = new Date(orderDate.getTime() + 8 * 60 * 60 * 1000); // 8 hours later
        
        const amount = faker.number.int({ min: 50000, max: 300000 }); // 500 - 3000 Yuan

        await db.insert(orders).values({
          orderNumber: `CUST${nanoid(10)}`,
          userId: mockUserId, // Use safe mockUserId
          guideId: guideUserId, // Use safe guideUserId
          creatorId: csId,
          type: 'custom',
          status: 'completed',
          amount: amount,
          pricePerHour: Math.floor(amount / 8),
          duration: 8,
          totalDuration: 8, // Fix: Provide totalDuration
          content: 'Mock Custom Tour',
          createdAt: orderDate,
          paidAt: orderDate,
          serviceStartTime: orderDate,
          serviceEndTime: serviceEndTime,
          actualEndTime: serviceEndTime, // Crucial for stats
        });
      }
    }

    console.log('✅ CS Performance Data Seeded Successfully.');
  } catch (error) {
    console.error('❌ Failed to seed CS performance data:', error);
  }

  process.exit(0);
}

seedCSPerformance();
