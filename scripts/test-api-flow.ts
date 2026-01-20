
import axios from 'axios';

// Configuration
const API_URL = 'http://localhost:3000/api/v1';

async function runTests() {
  console.log('🚀 Starting Lightweight API Flow Tests (FP01-FP05)...\n');
  
  // Generate random user data
  const phone = `138${Math.floor(10000000 + Math.random() * 90000000)}`;
  const password = 'Password123';
  const nickname = `User_${Math.floor(Math.random() * 1000)}`;
  let token = '';
  let userId = 0;

  // Helper for formatted logging
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

  // 2. Login
  try {
    const res = await axios.post(`${API_URL}/auth/login`, { phone, password });
    if (res.data.code === 0) {
      logPass('Login successful');
      token = res.data.data.token; // Update token
    } else {
      throw new Error(JSON.stringify(res.data));
    }
  } catch (e: any) {
    logFail('Login Failed', e.response?.data || e.message);
    process.exit(1);
  }

  // 3. Get Me
  try {
    const res = await axios.get(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.data.code === 0 && res.data.data.phone === phone) {
      logPass('Get Current User info verified');
    } else {
      throw new Error('User info mismatch or failed');
    }
  } catch (e: any) {
    logFail('Get Me Failed', e.response?.data || e.message);
  }

  // 4. Guide Verification (Happy Path)
  const randomIdSuffix = Math.floor(1000 + Math.random() * 9000);
  const validId = `11010119900307${randomIdSuffix}`; 
  
  try {
    const res = await axios.post(`${API_URL}/guides/profile`, {
      id_number: validId,
      name: 'Real Name',
      city: 'Beijing',
      intro: 'Test Intro',
      hourly_price: 200,
      tags: ['History', 'Food']
    }, { headers: { Authorization: `Bearer ${token}` } });
    
    if (res.data.code === 0) {
      logPass('Guide Verification submitted successfully');
    } else {
      throw new Error(JSON.stringify(res.data));
    }
  } catch (e: any) {
    logFail('Guide Verification Failed', e.response?.data || e.message);
  }

  // 4.1 Get Guide Profile
  try {
    const res = await axios.get(`${API_URL}/guides/profile`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.data.code === 0 && res.data.data.id_number === validId) {
      logPass('Guide Profile retrieval verified');
    } else {
      throw new Error('Guide Profile mismatch or failed');
    }
  } catch (e: any) {
    logFail('Get Guide Profile Failed', e.response?.data || e.message);
  }

  // 4.2 Guide List & Search (Public API)
  try {
    // Search by City
    const resCity = await axios.get(`${API_URL}/guides`, { params: { city: 'Beijing' } });
    const foundInCity = resCity.data.data.list.some((g: any) => g.name === 'Real Name');
    
    // Search by Keyword (Intro)
    const resKeyword = await axios.get(`${API_URL}/guides`, { params: { keyword: 'Test Intro' } });
    const foundInKeyword = resKeyword.data.data.list.some((g: any) => g.name === 'Real Name');

    // Check Privacy (Should NOT return id_number)
    const hasPrivacyLeak = resCity.data.data.list.some((g: any) => g.id_number !== undefined);

    if (foundInCity && foundInKeyword && !hasPrivacyLeak) {
      logPass('Guide List Search & Privacy verified');
    } else {
      throw new Error(`Search failed or privacy leak detected. CityFound: ${foundInCity}, KeywordFound: ${foundInKeyword}, Leak: ${hasPrivacyLeak}`);
    }
  } catch (e: any) {
    logFail('Guide List Search Failed', e.response?.data || e.message);
  }

  // 6. Custom Order Flow (FP13)
  let orderId = 0;
  try {
    // 6.1 Create Order
    const orderData = {
      service_date: '2026-05-01',
      city: 'Chengdu',
      content: 'I want to see pandas and eat hotpot.',
      budget: 500,
      requirements: 'English speaking guide'
    };
    
    const resCreate = await axios.post(`${API_URL}/orders`, orderData, { headers: { Authorization: `Bearer ${token}` } });
    
    if (resCreate.data.code === 0 && resCreate.data.data.order_id) {
      logPass('Custom Order Created Successfully');
      orderId = resCreate.data.data.order_id;
    } else {
      throw new Error(JSON.stringify(resCreate.data));
    }

    // 6.2 Get Order Detail
    const resGet = await axios.get(`${API_URL}/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
    const orderDetail = resGet.data.data;
    
    if (
      orderDetail.status === 'pending' && 
      orderDetail.custom_requirements?.destination === 'Chengdu'
    ) {
      logPass('Order Detail & Requirements Verified');
    } else {
      throw new Error(`Order Detail Mismatch: Status=${orderDetail.status}, Dest=${orderDetail.custom_requirements?.destination}`);
    }

    // 6.3 Pay Order
    const resPay = await axios.post(`${API_URL}/orders/${orderId}/payment`, { payment_method: 'wechat' }, { headers: { Authorization: `Bearer ${token}` } });
    
    if (resPay.data.code === 0 && resPay.data.data.status === 'paid') {
      logPass('Order Payment Successful');
    } else {
      throw new Error('Payment Failed');
    }

    // 6.4 Verify Status after Payment
    const resFinal = await axios.get(`${API_URL}/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (resFinal.data.data.status === 'paid') {
      logPass('Order Status Updated to Paid');
    } else {
      throw new Error(`Status not updated. Current: ${resFinal.data.data.status}`);
    }

    // 6.5 Boundary: Duplicate Payment
    try {
      await axios.post(`${API_URL}/orders/${orderId}/payment`, { payment_method: 'wechat' }, { headers: { Authorization: `Bearer ${token}` } });
      logFail('Duplicate Payment check failed (Should have been rejected)', {});
    } catch (e: any) {
      if (e.response?.status === 400 || e.response?.data?.code !== 0) {
        logPass('Duplicate Payment correctly rejected');
      } else {
        logFail('Unexpected error for Duplicate Payment', e.response?.data || e.message);
      }
    }

  } catch (e: any) {
    logFail('Custom Order Flow Failed', e.response?.data || e.message);
  }

  // 6.6 Order List (FP14)
  try {
    const listRes = await axios.get(`${API_URL}/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (listRes.data.code === 0 && Array.isArray(listRes.data.data)) {
      logPass(`Order List Retrieval (Count: ${listRes.data.data.length})`);
    } else {
      throw new Error(JSON.stringify(listRes.data));
    }
  } catch (e: any) {
    logFail('Order List Request failed', e.response?.data || e.message);
  }

  // 7. Guide Verification (Boundary: Invalid ID)
  try {
    await axios.post(`${API_URL}/guides/profile`, {
      id_number: '123', // Invalid
      name: 'Real Name',
      city: 'Beijing'
    }, { headers: { Authorization: `Bearer ${token}` } });
    logFail('Invalid ID check failed (Should have been rejected)', {});
  } catch (e: any) {
    if (e.response && (e.response.status === 400 || e.response.data?.code !== 0)) {
       logPass(`Invalid ID correctly rejected: ${e.response.data?.message}`);
    } else {
       logFail('Unexpected error for Invalid ID', e.response?.data || e.message);
    }
  }

  // 6. Guide Verification (Boundary: Missing Field)
  try {
    await axios.post(`${API_URL}/guides/profile`, {
      id_number: validId,
      // name missing
      city: 'Beijing'
    }, { headers: { Authorization: `Bearer ${token}` } });
    logFail('Missing Name check failed (Should have been rejected)', {});
  } catch (e: any) {
    if (e.response && (e.response.status === 400 || e.response.data?.code !== 0)) {
       logPass(`Missing field correctly rejected: ${e.response.data?.message}`);
    } else {
       logFail('Unexpected error for Missing Name', e.response?.data || e.message);
    }
  }

  console.log('\n✨ All Tests Completed.');
}

runTests();
