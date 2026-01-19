
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app';
import { db } from '../server/db';
import { users, orders, customRequirements } from '../server/db/schema';
import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';

describe('Custom Order Feature E2E', () => {
  let app: any;
  let token: string;
  let userId: number;

  beforeAll(async () => {
    app = createApp();

    // 1. 创建测试用户并登录获取 Token
    const testPhone = '19999999999';
    const testPassword = 'password123';
    
    // 清理旧数据
    const [existingUser] = await db.select().from(users).where(eq(users.phone, testPhone));
    if (existingUser) {
      await db.delete(users).where(eq(users.id, existingUser.id));
    }

    // 注册新用户
    const res = await request(app).post('/api/v1/auth/register').send({
      phone: testPhone,
      password: testPassword,
      nickname: 'TestUser'
    });
    
    token = res.body.data.token;
    userId = res.body.data.user_id;
  });

  afterAll(async () => {
    // 清理测试数据
    await db.delete(customRequirements);
    await db.delete(orders).where(eq(orders.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  });

  it('should return 400 for invalid input (content too short)', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        service_date: '2024-12-31',
        city: 'Beijing',
        content: 'Short', // < 10 chars
        budget: 200
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(2002); // VALIDATION_ERROR
    expect(res.body.message).toContain('至少10个字');
  });

  it('should return 400 for invalid date format', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        service_date: '2024/12/31', // Invalid format
        city: 'Beijing',
        content: 'Valid content more than 10 chars',
        budget: 200
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('日期格式');
  });

  it('should create custom order successfully', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        service_date: '2024-12-31',
        city: 'Shanghai',
        content: 'I want a detailed city tour with food tasting.',
        budget: 500,
        requirements: 'No spicy food'
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(0);
    expect(res.body.data).toHaveProperty('order_id');
    expect(res.body.data.amount).toBe(150);

    // Verify DB
    const [order] = await db.select().from(orders).where(eq(orders.id, res.body.data.order_id));
    expect(order).toBeTruthy();
    expect(order.status).toBe('pending');
    expect(order.amount).toBe('150.00');

    const [details] = await db.select().from(customRequirements).where(eq(customRequirements.orderId, order.id));
    expect(details).toBeTruthy();
    expect(details.destination).toBe('Shanghai');
    expect(details.specialRequirements).toContain('No spicy food');
  });

  it('should pay for the order successfully', async () => {
    // 1. Create order first
    const createRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        service_date: '2025-01-01',
        city: 'Chengdu',
        content: 'Visit the panda base.',
        budget: 300
      });
    
    const orderId = createRes.body.data.order_id;

    // 2. Pay
    const payRes = await request(app)
      .post(`/api/v1/orders/${orderId}/payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        payment_method: 'wechat'
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.data.status).toBe('paid');

    // 3. Verify DB status
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    expect(order.status).toBe('paid');
  });
});
