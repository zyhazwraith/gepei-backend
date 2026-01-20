
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

async function runTests() {
  console.log('🚀 Starting FP-011 Admin Login & RBAC Tests...\n');
  
  const logPass = (msg: string) => console.log(`✅ [PASS] ${msg}`);
  const logFail = (msg: string, err: any) => console.error(`❌ [FAIL] ${msg}`, err);

  let adminToken = '';
  let userToken = '';

  // 1. Test Admin Login (Success)
  try {
    const res = await axios.post(`${API_URL}/auth/login`, {
      phone: '19999999999',
      password: 'AdminPassword123'
    });

    if (res.data.code === 0 && res.data.data.role === 'admin') {
      adminToken = res.data.data.token;
      logPass('Admin Login Successful (Role: admin)');
    } else {
      throw new Error(`Login failed or role mismatch: ${res.data.data.role}`);
    }
  } catch (e: any) {
    logFail('Admin Login Failed', e.response?.data || e.message);
    process.exit(1);
  }

  // 2. Test Admin Access (FP-012 Users List)
  try {
    const res = await axios.get(`${API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (res.data.code === 0) {
      logPass('Admin Access to Protected Route (/admin/users) Successful');
    } else {
      throw new Error('Admin access denied');
    }
  } catch (e: any) {
    logFail('Admin Access Failed', e.response?.data || e.message);
  }

  // 3. Create Normal User for RBAC Test
  try {
    const phone = `134${Math.floor(10000000 + Math.random() * 90000000)}`;
    const res = await axios.post(`${API_URL}/auth/register`, {
      phone,
      password: 'Password123',
      nickname: 'RBACTestUser'
    });
    userToken = res.data.data.token;
    logPass(`Created Normal User: ${phone}`);
  } catch (e: any) {
    logFail('User Creation Failed', e.response?.data || e.message);
  }

  // 4. Test Normal User Access to Admin Route (Should Fail)
  try {
    await axios.get(`${API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    logFail('RBAC Check Failed (Normal user accessed admin route)', {});
  } catch (e: any) {
    if (e.response?.status === 403 || e.response?.data?.code === 403) {
      logPass('RBAC Check Passed (Normal user correctly rejected with 403)');
    } else {
      logFail('Unexpected Error for RBAC Check', e.response?.data || e.message);
    }
  }

  console.log('\n✨ FP-011 Tests Completed.');
}

runTests();
