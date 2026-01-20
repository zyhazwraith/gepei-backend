
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

async function runTests() {
  console.log('🚀 Starting FP-019 Custom Order Matching Tests...\n');
  
  const logPass = (msg: string) => console.log(`✅ [PASS] ${msg}`);
  const logFail = (msg: string, err: any) => console.error(`❌ [FAIL] ${msg}`, err);

  let adminToken = '';
  let userToken = '';
  let guideId = 0;
  let orderId = 0;

  try {
    // 1. Admin Login
    console.log('🔹 1. Admin Login...');
    const adminRes = await axios.post(`${API_URL}/auth/login`, {
      phone: '19999999999',
      password: 'AdminPassword123'
    });
    adminToken = adminRes.data.data.token;
    logPass('Admin Login Successful');

    // 2. Setup: Create User & Guide
    console.log('\n🔹 2. Setup User & Guide...');
    // Create User
    const userPhone = `133${Math.floor(10000000 + Math.random() * 90000000)}`;
    const userRes = await axios.post(`${API_URL}/auth/register`, { phone: userPhone, password: 'Password123', nickname: 'CustomUser' });
    userToken = userRes.data.data.token;
    
    // Create Guide (we need a valid guideId)
    // We can use the admin token to find a guide or create one via registering another user
    // Let's just pick the first guide from the list
    const guidesRes = await axios.get(`${API_URL}/guides`);
    if (guidesRes.data.data.list.length > 0) {
      guideId = guidesRes.data.data.list[0].id;
      logPass(`Found existing guide ID: ${guideId}`);
    } else {
      throw new Error('No guides available to test assignment');
    }

    // 3. Create Custom Order
    console.log('\n🔹 3. Create Custom Order...');
    const orderRes = await axios.post(`${API_URL}/orders`, {
      service_date: '2026-12-01',
      city: 'Beijing',
      content: 'Need a tour guide for Forbidden City',
      budget: 1000,
      requirements: 'English speaking'
    }, { headers: { Authorization: `Bearer ${userToken}` } });
    
    orderId = orderRes.data.data.order_id;
    logPass(`Custom Order Created. ID: ${orderId}`);

    // 4. Admin Assign Guide
    console.log('\n🔹 4. Admin Assign Guide...');
    const assignRes = await axios.post(`${API_URL}/admin/orders/${orderId}/assign`, {
      guideId: guideId
    }, { headers: { Authorization: `Bearer ${adminToken}` } });

    if (assignRes.data.code === 0) {
      logPass('Assign Guide API Call Successful');
    } else {
      throw new Error(`Assign API failed: ${assignRes.data.message}`);
    }

    // 5. Verify Order Status
    console.log('\n🔹 5. Verify Order Status...');
    // User checks their order
    const checkRes = await axios.get(`${API_URL}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    const order = checkRes.data.data;
    if (order.status === 'in_progress') {
      logPass(`Order Status is 'in_progress'`);
    } else {
      throw new Error(`Expected status 'in_progress', got '${order.status}'`);
    }

    if (order.guideId === guideId) {
      logPass(`Order Guide ID matched (${guideId})`);
    } else {
      throw new Error(`Expected guideId ${guideId}, got ${order.guideId}`);
    }

  } catch (e: any) {
    logFail('Test Failed', e.response?.data || e.message);
    process.exit(1);
  }

  console.log('\n✨ FP-019 Tests Completed.');
}

runTests();
