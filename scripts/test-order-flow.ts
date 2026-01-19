import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

async function runTests() {
  console.log('🚀 Starting Custom Order Flow Tests (FP13)...\n');

  // Generate random user data
  const phone = `139${Math.floor(10000000 + Math.random() * 90000000)}`;
  const password = 'Password123';
  const nickname = `OrderUser_${Math.floor(Math.random() * 1000)}`;
  let token = '';
  let userId = 0;
  let orderId = 0;

  const logPass = (msg: string) => console.log(`✅ [PASS] ${msg}`);
  const logFail = (msg: string, err: any) => console.error(`❌ [FAIL] ${msg}`, err);

  // 1. Register
  try {
    const res = await axios.post(`${API_URL}/auth/register`, { phone, password, nickname });
    if (res.data.code === 0) {
      logPass(`Registered user: ${phone}`);
      token = res.data.data.token;
      userId = res.data.data.user_id;
    } else {
      throw new Error(JSON.stringify(res.data));
    }
  } catch (e: any) {
    logFail('Register Failed', e.response?.data || e.message);
    process.exit(1);
  }

  // 2. Create Custom Order
  try {
    const orderData = {
      service_date: '2023-12-25',
      city: 'Shanghai',
      content: 'Need a guide for The Bund and Yu Garden tour.',
      budget: 500,
      requirements: 'English speaking preferred'
    };
    
    const res = await axios.post(`${API_URL}/orders`, orderData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.data.code === 0) {
      orderId = res.data.data.order_id;
      logPass(`Custom Order created. ID: ${orderId}`);
    } else {
      throw new Error(JSON.stringify(res.data));
    }
  } catch (e: any) {
    logFail('Create Order Failed', e.response?.data || e.message);
    process.exit(1);
  }

  // 3. Get Order Details (Verify Creation)
  try {
    const res = await axios.get(`${API_URL}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = res.data.data;
    if (res.data.code === 0 && data.status === 'pending' && data.custom_requirements.destination === 'Shanghai') {
       logPass('Order Details Verified (Pending Status & Correct City)');
    } else {
       throw new Error(`Order Details Mismatch: ${JSON.stringify(data)}`);
    }
  } catch (e: any) {
    logFail('Get Order Details Failed', e.response?.data || e.message);
  }

  // 4. Pay Order
  try {
    const res = await axios.post(`${API_URL}/orders/${orderId}/payment`, {
      payment_method: 'wechat'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.data.code === 0 && res.data.data.status === 'paid') {
      logPass('Order Paid Successfully');
    } else {
      throw new Error(JSON.stringify(res.data));
    }
  } catch (e: any) {
    logFail('Pay Order Failed', e.response?.data || e.message);
  }

  // 5. Verify Status after Payment
  try {
    const res = await axios.get(`${API_URL}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = res.data.data;
    if (res.data.code === 0 && data.status === 'paid') {
       logPass('Order Status Verified (Paid)');
    } else {
       throw new Error(`Order Status Mismatch: Expected paid, got ${data.status}`);
    }
  } catch (e: any) {
    logFail('Get Order Details (After Pay) Failed', e.response?.data || e.message);
  }

  console.log('\n✨ Custom Order Flow Completed.');
}

runTests();
