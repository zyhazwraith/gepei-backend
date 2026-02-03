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

    // 4. Create In-Service Order (User 18215596084 places order to another guide)
    // We need to find another guide first, or create one.
    // Let's create a random guide.
    const guidePhone2 = `13${Math.floor(100000000 + Math.random() * 900000000)}`;
    console.log(`Creating Another Guide: ${guidePhone2}...`);
    
    const [guideUser2] = await db.insert(users).values({
        phone: guidePhone2,
        password: 'password123',
        nickname: `Guide_${nanoid(4)}`,
        role: 'user',
        isGuide: true
    }).$returningId();

    // Insert guide profile
    await db.insert(guides).values({
        userId: guideUser2.id,
        stageName: `StageName_${nanoid(4)}`,
        city: 'Shanghai',
        price: 10000, // 100 Yuan/hour
        idNumber: `110101199${Math.floor(100000000 + Math.random() * 900000000)}` // Random ID
    });

    console.log(`Creating In-Service Order for User ${guidePhone} (as Customer)...`);
    
    // User 18215596084 (guideUser) is now acting as a CUSTOMER for this order
    const [inServiceOrder] = await db.insert(orders).values({
      orderNumber: `ORD_OT_${Date.now()}`,
      userId: guideUser.id, // 18215596084 is the customer
      guideId: guideUser2.id, // Random guide
      type: 'standard',
      status: 'in_service', // Directly to in_service
      amount: 40000, // 400 Yuan
      duration: 4,
      serviceStartTime: new Date(),
      serviceEndTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
      pricePerHour: 10000, // Important for overtime calculation
      serviceAddress: 'Shanghai Tower',
      serviceLat: '31.2304',
      serviceLng: '121.4737',
      createdAt: new Date(),
      paidAt: new Date(),
    }).$returningId();

    console.log(`✅ In-Service Order created successfully!`);
    console.log(`Order ID: ${inServiceOrder.id}`);
    console.log(`Customer (You): ${guidePhone}`);
    console.log(`Guide: ${guidePhone2}`);
    console.log(`Status: in_service`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedOrder();
