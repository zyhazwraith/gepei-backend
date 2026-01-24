import axios from 'axios';
import { API_URL, logPass, logFail, registerUser } from '../utils/helpers';

async function runTests() {
  console.log('🚀 Starting Guide Booking Flow Tests...\n');
  
  let userToken = '';
  let guideToken = '';
  let guideId = 0;

  try {
    // 1. Setup: Register Guide and User
    // 1.1 Create Guide User
    const guideReg = await registerUser();
    guideToken = guideReg.token;
    logPass(`Created Guide User: ${guideReg.user.phone}`);

    // 1.2 Create Normal User
    const userReg = await registerUser();
    userToken = userReg.token;
    logPass(`Created Normal User: ${userReg.user.phone}`);

    // 1.3 Verify Guide Profile
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const idNumber = `11010119900101${randomSuffix}`;
    const resProfile = await axios.post(`${API_URL}/guides/profile`, {
      idNumber: idNumber,
      name: 'Test Guide',
      city: 'Shanghai',
      hourlyPrice: 200,
      intro: 'Professional Guide'
    }, { headers: { Authorization: `Bearer ${guideToken}` } });
    
    if (resProfile.data.code === 0) {
      guideId = resProfile.data.data.guideId;
      logPass(`Guide Profile Verified. Guide ID: ${guideId}, Hourly Price: 200`);
    } else {
      throw new Error('Guide verification failed');
    }

    // 2. Test Normal Booking (Success Case)
    const orderData = {
      guideId: guideId,
      serviceStartTime: '2026-10-01T09:00:00Z',
      duration: 4,
      serviceAddress: 'Shanghai Bund',
      serviceLat: 31.230416,
      serviceLng: 121.473701,
      requirements: 'Looking forward to the trip'
    };

    const res = await axios.post(`${API_URL}/orders`, orderData, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    if (res.data.code === 0) {
      const { orderId, amount } = res.data.data;
      // Expected amount: 200 * 4 = 800
      if (Number(amount) === 800) {
        logPass(`Normal Order Created. ID: ${orderId}, Amount Correct (800)`);
      } else {
        throw new Error(`Amount calculation wrong. Expected 800, got ${amount}`);
      }
    }

    // 3. Test Custom Booking (Success Case)
    const customOrderData = {
      type: 'custom',
      city: 'Beijing',
      content: 'Visit Great Wall',
      budget: 5000,
      serviceStartTime: '2026-11-01T08:00:00Z',
      duration: 8, // New field for custom order
      serviceAddress: 'Beijing Center',
      serviceLat: 39.9042,
      serviceLng: 116.4074,
      requirements: 'Vegetarian food please'
    };

    const resCustom = await axios.post(`${API_URL}/orders`, customOrderData, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    if (resCustom.data.code === 0) {
      const { orderId, amount } = resCustom.data.data;
      if (Number(amount) === 150) { // Deposit is fixed at 150
         logPass(`Custom Order Created. ID: ${orderId}, Deposit Correct (150)`);
         
         // Verify details
         const detailRes = await axios.get(`${API_URL}/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${userToken}` }
         });
         const detail = detailRes.data.data;
         
         if (detail.content === 'Visit Great Wall' && 
             detail.requirements === 'Vegetarian food please' && 
             Number(detail.duration) === 8) {
             logPass(`Custom Order Details Verified: Content, Requirements, Duration(8)`);
         } else {
             throw new Error(`Custom Order Detail mismatch: ${JSON.stringify(detail)}`);
         }

      } else {
         throw new Error(`Custom Order Amount wrong. Expected 150, got ${amount}`);
      }
    }

    // 4. Test Self-Booking (Should Fail)
    try {
      await axios.post(`${API_URL}/orders`, {
        guideId: guideId,
        serviceStartTime: '2026-10-02T10:00:00Z',
        duration: 2,
        serviceAddress: 'Home',
        serviceLat: 31.0,
        serviceLng: 121.0
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

    // 5. Test Invalid Guide ID (Should Fail)
    try {
      await axios.post(`${API_URL}/orders`, {
        guideId: 999999,
        serviceStartTime: '2026-10-02T10:00:00Z',
        duration: 2,
        serviceAddress: 'Nowhere',
        serviceLat: 0,
        serviceLng: 0
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

  } catch (e: any) {
    logFail('Booking Flow Failed', e);
    process.exit(1);
  }

  console.log('\n✨ Booking Flow Tests Completed.');
}

runTests();
