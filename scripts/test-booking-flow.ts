
import axios from 'axios';

// Configuration
const API_URL = 'http://localhost:3000/api/v1';

async function runTests() {
  console.log('🚀 Starting FP-018 Guide Booking Flow Tests...\n');
  
  // Helpers
  const logPass = (msg: string) => console.log(`✅ [PASS] ${msg}`);
  const logFail = (msg: string, err: any) => console.error(`❌ [FAIL] ${msg}`, err);
  
  let userToken = '';
  let guideToken = '';
  let guideId = 0;
  let guideUserId = 0;
  let normalUserId = 0;

  // 1. Setup: Register Guide and User
  try {
    // 1.1 Create Guide User
    const guidePhone = `139${Math.floor(10000000 + Math.random() * 90000000)}`;
    const resGuideReg = await axios.post(`${API_URL}/auth/register`, { phone: guidePhone, password: 'Password123', nickname: 'GuideUser' });
    guideToken = resGuideReg.data.data.token;
    guideUserId = resGuideReg.data.data.user_id;
    logPass(`Created Guide User: ${guidePhone}`);

    // 1.2 Create Normal User
    const userPhone = `137${Math.floor(10000000 + Math.random() * 90000000)}`;
    const resUserReg = await axios.post(`${API_URL}/auth/register`, { phone: userPhone, password: 'Password123', nickname: 'NormalUser' });
    userToken = resUserReg.data.data.token;
    normalUserId = resUserReg.data.data.user_id;
    logPass(`Created Normal User: ${userPhone}`);

    // 1.3 Verify Guide Profile
    const idNumber = `11010119900101${Math.floor(1000 + Math.random() * 9000)}`;
    const resProfile = await axios.post(`${API_URL}/guides/profile`, {
      id_number: idNumber,
      name: 'Test Guide',
      city: 'Shanghai',
      hourly_price: 200,
      intro: 'Professional Guide'
    }, { headers: { Authorization: `Bearer ${guideToken}` } });
    
    if (resProfile.data.code === 0) {
      guideId = resProfile.data.data.guide_id;
      logPass(`Guide Profile Verified. Guide ID: ${guideId}, Hourly Price: 200`);
    } else {
      throw new Error('Guide verification failed');
    }

  } catch (e: any) {
    logFail('Setup Failed', e.response?.data || e.message);
    process.exit(1);
  }

  // 2. Test Normal Booking (Success Case)
  try {
    const orderData = {
      guide_id: guideId,
      service_date: '2026-10-01',
      service_hours: 4,
      remark: 'Looking forward to the trip'
    };

    const res = await axios.post(`${API_URL}/orders`, orderData, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    if (res.data.code === 0) {
      const { order_id, amount } = res.data.data;
      // Expected amount: 200 * 4 = 800
      if (amount === 800) {
        logPass(`Normal Order Created. ID: ${order_id}, Amount Correct (800)`);
      } else {
        throw new Error(`Amount calculation wrong. Expected 800, got ${amount}`);
      }
    } else {
      throw new Error(JSON.stringify(res.data));
    }
  } catch (e: any) {
    logFail('Normal Booking Failed', e.response?.data || e.message);
  }

  // 3. Test Self-Booking (Should Fail)
  try {
    await axios.post(`${API_URL}/orders`, {
      guide_id: guideId,
      service_date: '2026-10-02',
      service_hours: 2
    }, {
      headers: { Authorization: `Bearer ${guideToken}` } // Using guide's own token
    });
    logFail('Self-booking check failed (Should have been rejected)', {});
  } catch (e: any) {
    if (e.response?.data?.message?.includes('不能预订自己的服务')) {
      logPass('Self-booking correctly rejected');
    } else {
      logFail('Unexpected error for Self-booking', e.response?.data || e.message);
    }
  }

  // 4. Test Invalid Guide ID (Should Fail)
  try {
    await axios.post(`${API_URL}/orders`, {
      guide_id: 999999,
      service_date: '2026-10-02',
      service_hours: 2
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    logFail('Invalid Guide ID check failed', {});
  } catch (e: any) {
    if (e.response?.data?.message?.includes('地陪不存在')) {
      logPass('Invalid Guide ID correctly rejected');
    } else {
      logFail('Unexpected error for Invalid Guide ID', e.response?.data || e.message);
    }
  }

  console.log('\n✨ FP-018 Tests Completed.');
}

runTests();
