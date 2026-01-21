import axios from 'axios';
import { API_URL, logPass, logFail, registerUser, generateUser } from '../utils/helpers';

async function runTests() {
  console.log('🚀 Starting Core API Flow Tests (FP01-FP05)...\n');
  
  let token = '';
  let user: any;

  // 1. Register
  try {
    const registered = await registerUser();
    token = registered.token;
    user = registered.user;
    logPass(`Registered user: ${user.phone}`);
  } catch (e: any) {
    logFail('Register Failed', e);
    process.exit(1);
  }

  // 2. Login
  try {
    const res = await axios.post(`${API_URL}/auth/login`, { phone: user.phone, password: user.password });
    if (res.data.code === 0) {
      logPass('Login successful');
      token = res.data.data.token; // Update token
    } else {
      throw new Error(JSON.stringify(res.data));
    }
  } catch (e: any) {
    logFail('Login Failed', e);
    process.exit(1);
  }

  // 3. Get Me
  try {
    const res = await axios.get(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.data.code === 0 && res.data.data.phone === user.phone) {
      logPass('Get Current User info verified');
    } else {
      throw new Error('User info mismatch or failed');
    }
  } catch (e: any) {
    logFail('Get Me Failed', e);
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
    logFail('Guide Verification Failed', e);
  }

  console.log('\n✨ Core API Tests Completed.');
}

runTests();
