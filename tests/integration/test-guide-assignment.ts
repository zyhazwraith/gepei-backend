import axios from 'axios';
import { API_URL, logPass, logFail, registerUser, loginAdmin } from '../utils/helpers';

async function runTests() {
  console.log('🚀 Starting Guide Assignment Integration Tests...\n');
  console.log('ℹ️ V2 business decision: guide assignment/select-guide flow is removed.');
  console.log('ℹ️ This script now verifies that deprecated endpoints are unavailable.\n');

  let adminToken = '';
  let userToken = '';

  try {
    // 1. Setup
    adminToken = await loginAdmin();
    logPass('Admin Login Successful');

    const userReg = await registerUser();
    userToken = userReg.token;
    logPass('User Registered');

    // 2. Verify deprecated admin assign endpoint is unavailable
    try {
      await axios.post(`${API_URL}/admin/orders/1/assign`, { guideIds: [1] }, { headers: { Authorization: `Bearer ${adminToken}` } });
      throw new Error('Expected assign endpoint to be unavailable, but request succeeded');
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 404) {
        logPass('Deprecated admin assign endpoint is unavailable (404)');
      } else {
        throw new Error(`Expected 404 for assign endpoint, got ${status ?? 'unknown error'}`);
      }
    }

    // 3. Verify deprecated user select-guide endpoint is unavailable
    try {
      await axios.post(`${API_URL}/orders/1/select-guide`, { guideId: 1 }, { headers: { Authorization: `Bearer ${userToken}` } });
      throw new Error('Expected select-guide endpoint to be unavailable, but request succeeded');
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 404) {
        logPass('Deprecated user select-guide endpoint is unavailable (404)');
      } else {
        throw new Error(`Expected 404 for select-guide endpoint, got ${status ?? 'unknown error'}`);
      }
    }

  } catch (e: any) {
    logFail('Test Failed', e);
    process.exit(1);
  }

  console.log('\n✨ Deprecated Guide Assignment Endpoint Checks Completed.');
}

runTests();
