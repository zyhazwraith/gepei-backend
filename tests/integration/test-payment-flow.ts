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
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const idNumber = `11010119900101${randomSuffix}`;
    const resProfile = await axios.post(`${API_URL}/guides/profile`, {
      idNumber: idNumber,
      name: 'Test Guide',
      city: 'Shenzhen',
      hourlyPrice: 300,
      intro: 'Tech Guide'
    }, { headers: { Authorization: `Bearer ${guideToken}` } });
    guideId = resProfile.data.data.guideId;

    // 1.3 Create User
    const userReg = await registerUser();
    userToken = userReg.token;
    
    logPass('Setup Users and Guide completed');

    // 2. Create Order
    const res = await axios.post(`${API_URL}/orders`, {
      guideId: guideId,
      serviceDate: '2026-11-11',
      serviceHours: 2,
      remark: 'Test Payment'
    }, { headers: { Authorization: `Bearer ${userToken}` } });

    if (res.data.code === 0) {
      orderId = res.data.data.orderId || res.data.data.order_id;
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
      paymentMethod: 'wechat'
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
