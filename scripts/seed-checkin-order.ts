import { db } from '../server/db';
import { orders, users, guides } from '../server/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

async function seedOrder() {
  const guidePhone = '18215596084';
  
  console.log(`🚀 Seeding order for Guide Phone: ${guidePhone}...`);

  try {
    // 1. Find Guide User
    const guideUser = await db.query.users.findFirst({
      where: eq(users.phone, guidePhone)
    });

    if (!guideUser) {
      console.error(`❌ Guide user with phone ${guidePhone} not found!`);
      process.exit(1);
    }

    console.log(`Found Guide: ${guideUser.nickname} (ID: ${guideUser.id})`);

    // 2. Create Random Customer
    const customerPhone = `13${Math.floor(100000000 + Math.random() * 900000000)}`;
    console.log(`Creating Customer: ${customerPhone}...`);
    
    const [customer] = await db.insert(users).values({
        phone: customerPhone,
        password: 'password123',
        nickname: `Customer_${nanoid(4)}`,
        role: 'user'
    }).$returningId();

    // 3. Create Paid Order
    const [order] = await db.insert(orders).values({
      orderNumber: `ORD${Date.now()}`,
      userId: customer.id, // Customer places order
      guideId: guideUser.id, // Guide receives order
      type: 'standard',
      status: 'waiting_service', // Directly to waiting_service
      amount: 40000, // 400 Yuan
      duration: 4,
      serviceStartTime: new Date(),
      serviceAddress: 'Shanghai Bund',
      serviceLat: '31.2304',
      serviceLng: '121.4737',
      createdAt: new Date(),
      paidAt: new Date(), // Mark as paid
    }).$returningId();

    console.log(`✅ Order created successfully!`);
    console.log(`Order ID: ${order.id}`);
    console.log(`Customer ID: ${customer.id}`);
    console.log(`Guide ID: ${guideUser.id}`);
    console.log(`Status: waiting_service`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedOrder();
