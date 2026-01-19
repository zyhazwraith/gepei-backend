
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

  // 5. Guide Verification (Boundary: Invalid ID)
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
