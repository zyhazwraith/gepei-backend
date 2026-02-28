import axios from 'axios';
import { eq, and, count } from 'drizzle-orm';
import { db } from '../server/db/index.js';
import { guides, orders, payments, overtimeRecords, refundRecords } from '../server/db/schema.js';

const API_URL = 'http://localhost:3000/api/v1';

function randomPhone(prefix: string) {
  return `${prefix}${Math.floor(Math.random() * 90000000 + 10000000)}`;
}

async function registerAndLogin(phone: string, password = 'Password123') {
  await axios.post(`${API_URL}/auth/register`, { phone, password });
  const loginRes = await axios.post(`${API_URL}/auth/login`, { phone, password });
  return {
    token: loginRes.data.data.token as string,
    userId: loginRes.data.data.userId as number,
  };
}

async function ensureGuideProfile(guideUserId: number) {
  const [existing] = await db.select().from(guides).where(eq(guides.userId, guideUserId));
  if (existing) return;

  await db.insert(guides).values({
    userId: guideUserId,
    stageName: 'CAS Test Guide',
    realName: 'CAS Test Guide',
    idNumber: `11010119900101${Math.floor(Math.random() * 9000 + 1000)}`,
    city: 'Beijing',
    realPrice: 20000,
    status: 'online',
  });
}

async function createNormalOrder(token: string, guideId: number) {
  const startTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const res = await axios.post(
    `${API_URL}/orders`,
    {
      type: 'normal',
      guideId,
      serviceStartTime: startTime,
      duration: 2,
      serviceAddress: 'CAS Test Address',
      serviceLat: 39.9,
      serviceLng: 116.4,
      content: 'CAS test order',
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data.data.orderId as number;
}

async function payOrder(token: string, orderId: number) {
  return axios.post(
    `${API_URL}/orders/${orderId}/payment`,
    { paymentMethod: 'wechat' },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

async function createOvertime(token: string, orderId: number, duration = 2) {
  const res = await axios.post(
    `${API_URL}/orders/${orderId}/overtime`,
    { duration },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return {
    overtimeId: res.data.data.overtimeId as number,
    fee: res.data.data.fee as number,
  };
}

async function payOvertime(token: string, overtimeId: number) {
  return axios.post(
    `${API_URL}/overtime/${overtimeId}/pay`,
    { paymentMethod: 'wechat' },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

async function refundOrder(token: string, orderId: number) {
  return axios.post(
    `${API_URL}/orders/${orderId}/refund`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

async function main() {
  console.log('=== CAS Idempotency Verification ===');

  const customerPhone = randomPhone('138');
  const guidePhone = randomPhone('139');

  const customer = await registerAndLogin(customerPhone);
  const guide = await registerAndLogin(guidePhone);
  await ensureGuideProfile(guide.userId);

  // Case 1: order payment duplicate requests
  console.log('\n[Case 1] payOrder parallel duplicate requests');
  const orderId1 = await createNormalOrder(customer.token, guide.userId);
  const payResults = await Promise.allSettled([payOrder(customer.token, orderId1), payOrder(customer.token, orderId1)]);
  const paySuccessCount = payResults.filter((r) => r.status === 'fulfilled').length;
  if (paySuccessCount !== 1) {
    throw new Error(`Case 1 failed: expected 1 successful pay response, got ${paySuccessCount}`);
  }

  const [paymentCountOrder] = await db
    .select({ value: count() })
    .from(payments)
    .where(and(eq(payments.relatedType, 'order'), eq(payments.relatedId, orderId1), eq(payments.status, 'success')));
  if (paymentCountOrder.value !== 1) {
    throw new Error(`Case 1 failed: expected 1 order payment record, got ${paymentCountOrder.value}`);
  }
  const [orderAfterPay] = await db.select().from(orders).where(eq(orders.id, orderId1));
  if (orderAfterPay.status !== 'waiting_service') {
    throw new Error(`Case 1 failed: expected waiting_service, got ${orderAfterPay.status}`);
  }
  console.log('✅ Case 1 passed');

  // Case 2: overtime payment duplicate requests
  console.log('\n[Case 2] payOvertime parallel duplicate requests');
  const orderId2 = await createNormalOrder(customer.token, guide.userId);
  await payOrder(customer.token, orderId2);

  // Move to in_service for overtime precondition
  await db.update(orders).set({ status: 'in_service', updatedAt: new Date() }).where(eq(orders.id, orderId2));
  const [orderBeforeOt] = await db.select().from(orders).where(eq(orders.id, orderId2));

  const ot = await createOvertime(customer.token, orderId2, 2);
  const overtimeResults = await Promise.allSettled([
    payOvertime(customer.token, ot.overtimeId),
    payOvertime(customer.token, ot.overtimeId),
  ]);
  const overtimeSuccessCount = overtimeResults.filter((r) => r.status === 'fulfilled').length;
  if (overtimeSuccessCount !== 1) {
    throw new Error(`Case 2 failed: expected 1 successful overtime pay response, got ${overtimeSuccessCount}`);
  }

  const [overtimeRow] = await db.select().from(overtimeRecords).where(eq(overtimeRecords.id, ot.overtimeId));
  if (overtimeRow.status !== 'paid') {
    throw new Error(`Case 2 failed: expected overtime status paid, got ${overtimeRow.status}`);
  }

  const [paymentCountOvertime] = await db
    .select({ value: count() })
    .from(payments)
    .where(and(eq(payments.relatedType, 'overtime'), eq(payments.relatedId, ot.overtimeId), eq(payments.status, 'success')));
  if (paymentCountOvertime.value !== 1) {
    throw new Error(`Case 2 failed: expected 1 overtime payment record, got ${paymentCountOvertime.value}`);
  }

  const [orderAfterOt] = await db.select().from(orders).where(eq(orders.id, orderId2));
  if ((orderAfterOt.totalAmount || 0) !== (orderBeforeOt.totalAmount || 0) + ot.fee) {
    throw new Error('Case 2 failed: totalAmount increment is not exactly once');
  }
  console.log('✅ Case 2 passed');

  // Case 3: refund duplicate requests
  console.log('\n[Case 3] refund parallel duplicate requests');
  const orderId3 = await createNormalOrder(customer.token, guide.userId);
  await payOrder(customer.token, orderId3);
  const refundResults = await Promise.allSettled([
    refundOrder(customer.token, orderId3),
    refundOrder(customer.token, orderId3),
  ]);

  const refundSuccessCount = refundResults.filter((r) => r.status === 'fulfilled').length;
  if (refundSuccessCount < 1) {
    throw new Error('Case 3 failed: expected at least one successful refund response');
  }

  const fulfilledRefunds = refundResults.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled');
  const hasAlreadyRefunded = fulfilledRefunds.some((r) => r.value?.data?.data?.alreadyRefunded === true || r.value?.data?.message === '订单已退款');
  if (!hasAlreadyRefunded && refundSuccessCount !== 1) {
    throw new Error('Case 3 failed: duplicate refund response is not deterministic');
  }

  const [refundCount] = await db.select({ value: count() }).from(refundRecords).where(eq(refundRecords.orderId, orderId3));
  if (refundCount.value !== 1) {
    throw new Error(`Case 3 failed: expected 1 refund record, got ${refundCount.value}`);
  }

  const [orderAfterRefund] = await db.select().from(orders).where(eq(orders.id, orderId3));
  if (orderAfterRefund.status !== 'refunded') {
    throw new Error(`Case 3 failed: expected refunded status, got ${orderAfterRefund.status}`);
  }
  console.log('✅ Case 3 passed');

  console.log('\n🎉 All CAS idempotency checks passed');
}

main().catch((err: any) => {
  console.error('\n❌ CAS idempotency verification failed');
  console.error(err?.response?.data || err?.message || err);
  process.exit(1);
});
