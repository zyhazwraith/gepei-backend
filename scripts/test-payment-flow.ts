
import axios from 'axios';

// Configuration
const API_URL = 'http://localhost:3000/api/v1';

async function runTests() {
  console.log('🚀 Starting FP-016 Payment Flow Tests...\n');
  
  // Helpers
  const logPass = (msg: string) => console.log(`✅ [PASS] ${msg}`);
  const logFail = (msg: string, err: any) => console.error(`❌ [FAIL] ${msg}`, err);
  
  let userToken = '';
  let guideToken = '';
  let guideId = 0;
  let orderId = 0;

  // 1. Setup: Register Guide and User
  try {
    // 1.1 Create Guide
    const guidePhone = `136${Math.floor(10000000 + Math.random() * 90000000)}`;
    const resGuideReg = await axios.post(`${API_URL}/auth/register`, { phone: guidePhone, password: 'Password123', nickname: 'GuideUser' });
    guideToken = resGuideReg.data.data.token;
    
    // 1.2 Verify Guide
    const idNumber = `11010119900202${Math.floor(1000 + Math.random() * 9000)}`;
    const resProfile = await axios.post(`${API_URL}/guides/profile`, {
      id_number: idNumber,
      name: 'Test Guide',
      city: 'Shenzhen',
      hourly_price: 300,
      intro: 'Tech Guide'
    }, { headers: { Authorization: `Bearer ${guideToken}` } });
    guideId = resProfile.data.data.guide_id;

    // 1.3 Create User
    const userPhone = `135${Math.floor(10000000 + Math.random() * 90000000)}`;
    const resUserReg = await axios.post(`${API_URL}/auth/register`, { phone: userPhone, password: 'Password123', nickname: 'PayUser' });
    userToken = resUserReg.data.data.token;
    
    logPass('Setup Users and Guide completed');

  } catch (e: any) {
    logFail('Setup Failed', e.response?.data || e.message);
    process.exit(1);
  }

  // 2. Create Order
  try {
    const res = await axios.post(`${API_URL}/orders`, {
      guide_id: guideId,
      service_date: '2026-11-11',
      service_hours: 2,
      remark: 'Test Payment'
    }, { headers: { Authorization: `Bearer ${userToken}` } });

    if (res.data.code === 0) {
      orderId = res.data.data.order_id;
      logPass(`Order Created. ID: ${orderId}, Amount: ${res.data.data.amount}`);
    } else {
      throw new Error('Order creation failed');
    }
  } catch (e: any) {
    logFail('Order Creation Failed', e.response?.data || e.message);
    process.exit(1);
  }

  // 3. Verify Initial Status (Pending)
  try {
    const res = await axios.get(`${API_URL}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    if (res.data.data.status === 'pending') {
      logPass('Initial Order Status is Pending');
    } else {
      throw new Error(`Expected pending, got ${res.data.data.status}`);
    }
  } catch (e: any) {
    logFail('Check Status Failed', e.response?.data || e.message);
  }

  // 4. Pay Order (The FP-016 Core Logic)
  try {
    console.log('Testing Payment API...');
    const res = await axios.post(`${API_URL}/orders/${orderId}/payment`, {
      payment_method: 'wechat'
    }, { headers: { Authorization: `Bearer ${userToken}` } });

    if (res.data.code === 0 && res.data.data.status === 'paid') {
      logPass('Payment API Successful');
    } else {
      throw new Error(JSON.stringify(res.data));
    }
  } catch (e: any) {
    logFail('Payment Failed', e.response?.data || e.message);
  }

  // 5. Verify Final Status (Paid)
  try {
    const res = await axios.get(`${API_URL}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    if (res.data.data.status === 'paid') {
      logPass('Final Order Status is Paid');
    } else {
      throw new Error(`Expected paid, got ${res.data.data.status}`);
    }
  } catch (e: any) {
    logFail('Check Final Status Failed', e.response?.data || e.message);
  }

  console.log('\n✨ FP-016 Payment Flow Tests Completed.');
}

runTests();
