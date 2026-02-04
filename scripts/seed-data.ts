
import 'dotenv/config';
import { fakerZH_CN as faker } from '@faker-js/faker';
import { db } from '../server/db';
import { users, guides, orders, reviews, payments, withdrawals, auditLogs } from '../server/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('🌱 开始生成测试数据...');

  // 1. 清理数据 (倒序删除以避免外键约束)
  console.log('🧹 清理旧数据...');
  await db.delete(auditLogs);
  await db.delete(reviews);
  // await db.delete(customOrderCandidates);
  // await db.delete(customRequirements);
  await db.delete(payments);
  await db.delete(withdrawals);
  await db.delete(orders);
  await db.delete(guides);
  await db.delete(users);

  // 2. 创建固定测试用户
  console.log('👤 创建测试用户...');
  const testPassword = await bcrypt.hash('password123', 10);
  
  // 2.1 创建 Admin 用户
  await db.insert(users).values({
    phone: '13800000000',
    password: testPassword,
    nickname: 'Admin User',
    avatarUrl: faker.image.avatar(),
    role: 'admin',
    balance: 0
  });

  // 2.2 创建普通测试用户
  const [testUser] = await db.insert(users).values({
    phone: '13800138000',
    password: testPassword,
    nickname: '测试用户',
    avatarUrl: faker.image.avatar(),
    role: 'user',
    balance: '10000.00'
  }).$returningId();

  // 3. 批量创建普通用户 (49个)
  const userIds: number[] = [testUser.id];
  const otherUsers = [];
  
  for (let i = 0; i < 49; i++) {
    otherUsers.push({
      phone: faker.string.numeric(11),
      password: testPassword,
      nickname: faker.person.fullName(),
      avatarUrl: faker.image.avatar(),
      role: 'user' as const,
      balance: faker.finance.amount({ min: 0, max: 5000, dec: 2 })
    });
  }
  
  // 分批插入防止SQL过大
  const chunkSize = 10;
  for (let i = 0; i < otherUsers.length; i += chunkSize) {
    const batch = otherUsers.slice(i, i + chunkSize);
    const result = await db.insert(users).values(batch).$returningId();
    result.forEach(r => userIds.push(r.id));
  }

  // 4. 选取部分用户成为地陪 (30个)
  console.log('🗺️ 创建地陪数据...');
  const guideUserIds = userIds.slice(10, 40); // 选30个
  const cities = ['北京', '上海', '广州', '成都', '西安', '杭州', '大理', '三亚'];
  const guideData = [];

  for (const userId of guideUserIds) {
    // 更新用户状态
    await db.update(users).set({ isGuide: true }).where(eq(users.id, userId));

    guideData.push({
      userId,
      stageName: faker.person.fullName(),
      idNumber: faker.string.numeric(18),
      city: faker.helpers.arrayElement(cities),
      intro: faker.lorem.paragraph(),
      expectedPrice: Math.floor(Number(faker.finance.amount({ min: 50, max: 500, dec: 2 })) * 100),
      realPrice: Math.floor(Number(faker.finance.amount({ min: 50, max: 500, dec: 2 })) * 100),
      tags: faker.helpers.arrayElements(['历史', '美食', '摄影', '购物', '自驾', '夜店'], { min: 1, max: 4 }),
      photoIds: [1, 2],
      idVerifiedAt: new Date(),
    });
  }
  
  await db.insert(guides).values(guideData);
  
  // 获取所有地陪ID
  const allGuides = await db.select().from(guides);
  const guideIds = allGuides.map(g => g.userId);

  // 5. 生成订单 (50个)
  console.log('📦 创建订单数据...');
  const orderData = [];
  const orderStatuses = ['pending', 'paid', 'in_service', 'completed', 'cancelled'] as const;

  for (let i = 0; i < 50; i++) {
    const status = faker.helpers.arrayElement(orderStatuses);
    const userId = faker.helpers.arrayElement(userIds);
    const guideId = faker.helpers.arrayElement(guideIds);
    const amount = faker.finance.amount({ min: 200, max: 2000, dec: 2 });

    orderData.push({
      orderNumber: faker.string.numeric(18), // 模拟订单号
      userId,
      guideId,
      type: 'standard' as const,
      status,
      serviceStartTime: faker.date.future(),
      duration: faker.number.int({ min: 2, max: 8 }),
      amount: Math.floor(Number(amount) * 100),
      requirements: faker.lorem.sentence(),
      createdAt: faker.date.past(),
    });
  }
  
  // 插入订单并获取ID用于关联
  const createdOrders = [];
  for (const order of orderData) {
     const [res] = await db.insert(orders).values(order).$returningId();
     createdOrders.push({ ...order, id: res.id });
  }

  // 6. 生成支付记录 (对已支付/完成的订单)
  console.log('💳 创建支付记录...');
  const paidOrders = createdOrders.filter(o => ['paid', 'in_service', 'completed'].includes(o.status));
  const paymentData = paidOrders.map(o => ({
    orderId: o.id,
    paymentMethod: 'wechat' as const,
    transactionId: faker.string.uuid(),
    amount: o.amount,
    status: 'success' as const,
    relatedType: 'order' as const,
    relatedId: o.id,
    paidAt: faker.date.recent(),
  }));
  
  if (paymentData.length > 0) {
    await db.insert(payments).values(paymentData);
  }

  // 7. 生成评价 (对已完成的订单)
  console.log('⭐ 创建评价记录...');
  const completedOrders = createdOrders.filter(o => o.status === 'completed');
  const reviewData = completedOrders.map(o => ({
    orderId: o.id,
    userId: o.userId,
    guideId: o.guideId!,
    rating: faker.number.int({ min: 3, max: 5 }),
    comment: faker.lorem.sentences(2),
  }));

  if (reviewData.length > 0) {
    await db.insert(reviews).values(reviewData);
  }

  console.log('✅ 数据生成完成!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ 数据生成失败:', err);
  process.exit(1);
});
