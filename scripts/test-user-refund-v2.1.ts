import axios from 'axios';
import { db } from '../server/db';
import { users, orders, guides } from '../server/db/schema';
import { eq } from 'drizzle-orm';

const API_URL = 'http://localhost:3000/api/v1';

async function main() {
  console.log('🚀 Starting User Auto-Refund Test (V2.1)...');

  // 1. Create a Test User
  const phone = `138${Math.floor(Math.random() * 90000000 + 10000000)}`; // Ensure 11 digits (138 + 8 digits)
  console.log(`\nCreating user with phone: ${phone}`);
  
  const regRes = await axios.post(`${API_URL}/auth/register`, {
    phone,
    password: 'password123',
    role: 'customer'
  });
  
  const token = regRes.data.data.token;
  const userId = regRes.data.data.userId;
  console.log('✅ User created & logged in');

  // 2. Create a Normal Order
  // Need a guide first. For simplicity, let's pick an existing guide or assume guideId 1 exists.
  // Or better, create a guide user.
  const guidePhone = `139${Math.floor(Math.random() * 90000000 + 10000000)}`;
  // Note: Register API returns { code: 0, data: { token, user: { id... } } }
  await axios.post(`${API_URL}/auth/register`, { phone: guidePhone, password: 'password123', role: 'guide' });
  const guideRes = await db.query.users.findFirst({ where: eq(users.phone, guidePhone) });
  if (!guideRes) throw new Error('Guide creation failed');
  
  // Create guide profile (simplified, assuming backend allows ordering even if guide incomplete for now, 
  // or we insert manually if needed. But createOrder checks guide table.)
  // Let's insert guide record manually to bypass profile flow complexity
  // Based on schema.ts: guides table
  await db.insert(guides).values({
    userId: guideRes.id,
    stageName: 'Test Guide',
    realName: 'Test Guide Real',
    idNumber: `11010119900101${Math.floor(Math.random() * 8999 + 1000)}`, // Unique ID
    city: 'Beijing',
    // status: 'approved', // Removed invalid field
    realPrice: 20000, // 200 RMB
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const orderRes = await axios.post(
    `${API_URL}/orders`,
    {
      type: 'normal',
      guideId: guideRes.id,
      serviceStartTime: tomorrow.toISOString(),
      duration: 4,
      serviceAddress: 'Test Location',
      serviceLat: 39.9,
      serviceLng: 116.4,
      content: 'Test Tour'
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const orderId = orderRes.data.data.orderId;
  console.log(`✅ Order created: ID ${orderId}`);

  // Fetch Order Number
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  const orderNumber = order.orderNumber;
  console.log(`   Order Number: ${orderNumber}`);

  // 3. Pay Order
  await axios.post(
    `${API_URL}/orders/${orderId}/payment`,
    { paymentMethod: 'wechat' },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  console.log('✅ Order paid');

  // --- CASE A: Refund within 1 Hour (Free) ---
  console.log('\n--- Case A: Refund within 1 Hour (Free) ---');
  
  // The payment was just made, so it is within 1 hour.
  const refundResA = await axios.post(
    `${API_URL}/orders/${orderId}/refund`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );

  console.log('Refund Response:', refundResA.data);
  
  if (refundResA.data.data.penaltyApplied === false && refundResA.data.data.refundedAmount === order.amount) {
      console.log('✅ Case A Passed: Full Refund');
  } else {
      console.error('❌ Case A Failed');
      process.exit(1);
  }

  // --- Case B: Refund after 1 Hour (Penalty) ---
  console.log('\n--- Case B: Refund after 1 Hour (Penalty ¥150) ---');
  
  // Create another order
  const orderRes2 = await axios.post(
    `${API_URL}/orders`,
    {
      type: 'normal',
      guideId: guideRes.id,
      serviceStartTime: tomorrow.toISOString(),
      duration: 4,
      serviceAddress: 'Test Location 2',
      serviceLat: 39.9,
      serviceLng: 116.4,
      content: 'Test Tour 2'
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const orderId2 = orderRes2.data.data.orderId;
  
  // Pay it
  await axios.post(
    `${API_URL}/orders/${orderId2}/payment`,
    { paymentMethod: 'wechat' },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  // Manually update paidAt to 2 hours ago
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  await db.update(orders)
    .set({ paidAt: twoHoursAgo })
    .where(eq(orders.id, orderId2));
    
  console.log('✅ Order 2 created, paid, and time-traveled to 2 hours ago');
  
  const [order2] = await db.select().from(orders).where(eq(orders.id, orderId2));
  const orderNumber2 = order2.orderNumber;

  // Request Refund
  const refundResB = await axios.post(
    `${API_URL}/orders/${orderId2}/refund`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );

  console.log('Refund Response:', refundResB.data);
  
  const expectedRefund = Math.max(0, order2.amount - 15000);
  
  if (refundResB.data.data.penaltyApplied === true && refundResB.data.data.refundedAmount === expectedRefund) {
      console.log('✅ Case B Passed: Penalty Applied');
  } else {
      console.error(`❌ Case B Failed: Expected ${expectedRefund}, Got ${refundResB.data.data.refundedAmount}`);
      process.exit(1);
  }

  console.log('\n🎉 All User Auto-Refund Tests Passed!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Test Failed:', err.response?.data || err.message);
  process.exit(1);
});
