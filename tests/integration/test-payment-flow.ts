import axios from 'axios';
import { API_URL, logPass, logFail, registerUser } from '../utils/helpers';

async function runTests() {
  console.log('🚀 Starting Payment Flow Tests...\n');
  
  let userToken = '';
  let guideToken = '';
  let guideId = 0;
  let orderId = 0;

  try {
    // 1. Setup: Register Guide and User
    // 1.1 Create Guide
    const guideReg = await registerUser();
    guideToken = guideReg.token;
    
    // 1.2 Verify Guide
    const idNumber = `1${Math.floor(Math.random() * 100000000000000000).toString().padStart(17, '0')}`;
    const resProfile = await axios.post(`${API_URL}/guides/profile`, {
      id_number: idNumber,
      name: 'Test Guide',
      city: 'Shenzhen',
      hourly_price: 300,
      intro: 'Tech Guide'
    }, { headers: { Authorization: `Bearer ${guideToken}` } });
    guideId = resProfile.data.data.guide_id;

    // 1.3 Create User
    const userReg = await registerUser();
    userToken = userReg.token;
    
    logPass('Setup Users and Guide completed');

    // 2. Create Order
    const res = await axios.post(`${API_URL}/orders`, {
      guide_id: guideId,
      service_date: '2026-11-11',
      service_hours: 2,
      remark: 'Test Payment'
    }, { headers: { Authorization: `Bearer ${userToken}` } });

    if (res.data.code === 0) {
      orderId = res.data.data.order_id;
      logPass(`Order Created. ID: ${orderId}, Amount: ${res.data.data.amount}`);
    }

    // 3. Verify Initial Status (Pending)
    const statusRes = await axios.get(`${API_URL}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    if (statusRes.data.data.status === 'pending') {
      logPass('Initial Order Status is Pending');
    } else {
      throw new Error(`Expected pending, got ${statusRes.data.data.status}`);
    }

    // 4. Pay Order
    console.log('Testing Payment API...');
    const payRes = await axios.post(`${API_URL}/orders/${orderId}/payment`, {
      payment_method: 'wechat'
    }, { headers: { Authorization: `Bearer ${userToken}` } });

    if (payRes.data.code === 0 && payRes.data.data.status === 'paid') {
      logPass('Payment API Successful');
    }

    // 5. Verify Final Status (Paid)
    const finalRes = await axios.get(`${API_URL}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    if (finalRes.data.data.status === 'paid') {
      logPass('Final Order Status is Paid');
    } else {
      throw new Error(`Expected paid, got ${finalRes.data.data.status}`);
    }

  } catch (e: any) {
    logFail('Payment Flow Failed', e);
    process.exit(1);
  }

  console.log('\n✨ Payment Flow Tests Completed.');
}

runTests();
