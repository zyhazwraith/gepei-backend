
import axios from 'axios';
import { db } from '../server/db';
import { orders, users, refundRecords } from '../server/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const API_URL = 'http://localhost:3000/api/v1';

const ADMIN = { phone: '19999999999', password: 'AdminPassword123', role: 'admin' };
const CS = { phone: '19900000001', password: 'CsPassword123', role: 'cs' };

async function getToken(creds: typeof ADMIN) {
    try {
        const res = await axios.post(`${API_URL}/auth/login`, {
            phone: creds.phone,
            password: creds.password
        });
        return res.data.data.token;
    } catch (error: any) {
        console.error(`Login failed for ${creds.role}:`, error.response?.data || error.message);
        process.exit(1);
    }
}

async function setupTestOrder() {
    // 1. Ensure a user exists
    let [user] = await db.select().from(users).where(eq(users.phone, '18899999999'));
    if (!user) {
        const [result] = await db.insert(users).values({
            phone: '18899999999',
            password: 'password123', // plain text for mock
            nickname: 'Refund Test User',
            role: 'user'
        } as any);
        // fetch again
        [user] = await db.select().from(users).where(eq(users.id, result.insertId));
    }

    // 2. Ensure a guide exists (reuse user as guide for simplicity or create another)
    // For this test, we just need a guideId, can be same user if schema allows (it does, users table)
    // Actually guideId refers to users.id.
    
    // 3. Create a 'paid' order
    const orderNumber = `REFUND_${nanoid(10)}`;
    const [result] = await db.insert(orders).values({
        orderNumber,
        userId: user.id,
        guideId: user.id, // Self-service for test
        amount: 10000, // 100 RMB
        status: 'paid',
        type: 'standard',
        content: 'Test Order for Refund',
        pricePerHour: 10000,
        duration: 1,
        totalDuration: 1
    } as any);
    
    console.log(`✅ Created test order: ${orderNumber} (ID: ${result.insertId})`);
    return result.insertId;
}

async function verifyRefund() {
    console.log('🚀 Starting Verification: [O-3] Refund System');

    // 1. Setup
    const adminToken = await getToken(ADMIN);
    const csToken = await getToken(CS);
    const orderId = await setupTestOrder();

    // 2. Test CS Permission (Should Fail)
    console.log('\n👉 Testing CS Permission (Expected: 403 Forbidden)...');
    try {
        await axios.post(`${API_URL}/admin/orders/${orderId}/refund`, {
            amount: 5000,
            reason: 'CS Refund Attempt'
        }, { headers: { Authorization: `Bearer ${csToken}` } });
        console.error('❌ CS should NOT be able to refund!');
    } catch (error: any) {
        if (error.response?.status === 403) {
            console.log('✅ CS Permission Denied (403) - PASS');
        } else {
            console.error(`❌ Unexpected status for CS: ${error.response?.status}`);
        }
    }

    // 3. Test Admin Refund (Should Success)
    console.log('\n👉 Testing Admin Refund (Expected: 200 OK)...');
    const refundAmount = 5000;
    try {
        const res = await axios.post(`${API_URL}/admin/orders/${orderId}/refund`, {
            amount: refundAmount,
            reason: 'Admin Refund Test'
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        
        if (res.status === 200 && res.data.data.status === 'refunded') {
            console.log('✅ Admin Refund Success - PASS');
        } else {
            console.error('❌ Admin Refund Failed Response:', res.data);
        }
    } catch (error: any) {
        console.error('❌ Admin Refund Error:', error.response?.data || error.message);
    }

    // 4. Verify DB Status
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (order?.status === 'refunded' && order.refundAmount === refundAmount) {
        console.log('✅ DB Order Status Updated to "refunded" - PASS');
    } else {
        console.error('❌ DB Order Status Verification Failed:', order);
    }

    const [record] = await db.select().from(refundRecords).where(eq(refundRecords.orderId, orderId));
    if (record && record.amount === refundAmount) {
        console.log('✅ Refund Record Created - PASS');
    } else {
        console.error('❌ Refund Record Verification Failed');
    }

    // 5. Test Double Refund (Should Fail)
    console.log('\n👉 Testing Double Refund (Expected: 400/422)...');
    try {
        await axios.post(`${API_URL}/admin/orders/${orderId}/refund`, {
            amount: 1000,
            reason: 'Double Refund'
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        console.error('❌ Double Refund should fail!');
    } catch (error: any) {
        // Validation error usually 422 or 400 depending on middleware
        // Our controller throws ValidationError which might map to 400 or 422
        if ([400, 422].includes(error.response?.status)) {
            console.log(`✅ Double Refund Blocked (${error.response.status}) - PASS`);
        } else {
            console.error(`❌ Unexpected status for Double Refund: ${error.response?.status}`);
        }
    }

    // 6. Test Get Order Details (Should include refund info)
    console.log('\n👉 Testing Get Order Details...');
    try {
        const res = await axios.get(`${API_URL}/admin/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const data = res.data.data;
        if (data.refundAmount === refundAmount && data.refund_records?.length > 0) {
            console.log('✅ Order Details includes Refund Info - PASS');
        } else {
            console.error('❌ Order Details missing Refund Info:', data);
        }
    } catch (error: any) {
        console.error('❌ Get Details Error:', error.message);
    }

    console.log('\n🎉 O-3 Refund Verification Completed!');
    process.exit(0);
}

verifyRefund();
