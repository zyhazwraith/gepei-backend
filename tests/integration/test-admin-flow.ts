import axios from 'axios';
import { API_URL, logPass, logFail, registerUser, loginAdmin } from '../utils/helpers';

async function runTests() {
  console.log('🚀 Starting Admin & Guide Management Tests...\n');
  
  let adminToken = '';
  
  try {
    adminToken = await loginAdmin();
    logPass('Admin Login Successful');
  } catch (e: any) {
    logFail('Admin Login Failed', e);
    process.exit(1);
  }

  // 1. Fetch User List
  try {
    const res = await axios.get(`${API_URL}/admin/users`, {
      params: { page: 1, limit: 20 },
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (res.data.code === 0) {
      const { list, pagination } = res.data.data;
      logPass(`Fetched ${list.length} users (Total: ${pagination.total})`);
    } else {
      throw new Error(JSON.stringify(res.data));
    }
  } catch (e: any) {
    logFail('Fetch User List Failed', e);
  }

  // 2. Fetch Order List
  try {
    const res = await axios.get(`${API_URL}/admin/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (res.data.code === 0) {
      logPass(`Fetched ${res.data.data.list.length} orders`);
    } else {
      throw new Error('Fetch orders failed');
    }
  } catch (e: any) {
    logFail('Fetch Orders Failed', e);
  }

  console.log('\n✨ Admin Tests Completed.');
}

runTests();
