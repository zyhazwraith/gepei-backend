import axios from 'axios';
import { API_URL, logPass, logFail, registerUser, loginAdmin } from '../utils/helpers';

async function runTests() {
  console.log('🚀 Starting Guide Assignment Integration Tests...\n');
  
  let adminToken = '';
  let userToken = '';
  let guideIds: number[] = [];
  let customOrderId = 0;

  try {
    // 1. Setup
    adminToken = await loginAdmin();
    logPass('Admin Login Successful');

    const userReg = await registerUser();
    userToken = userReg.token;
    logPass('User Registered');

    // Get available guides
    const guidesRes = await axios.get(`${API_URL}/guides`);
    if (guidesRes.data.data.list.length < 2) {
      throw new Error('Need at least 2 guides to test multi-assignment');
    }
    guideIds = guidesRes.data.data.list.slice(0, 10).map((g: any) => g.guideId);
    logPass(`Found ${guideIds.length} guides`);

    // 2. Create Custom Order
    const orderRes = await axios.post(`${API_URL}/orders`, {
      type: 'custom',
      serviceDate: '2026-12-01',
      city: 'Beijing',
      content: 'Multi-guide assignment test',
      budget: 2000,
      requirements: 'Experienced'
    }, { headers: { Authorization: `Bearer ${userToken}` } });
    
    customOrderId = orderRes.data.data.orderId;
    logPass(`Custom Order Created. ID: ${customOrderId}`);

    // 3. Test: Assign Multiple Guides
    const assignIds = guideIds.slice(0, 2);
    const assignRes = await axios.post(`${API_URL}/admin/orders/${customOrderId}/assign`, {
      guideIds: assignIds
    }, { headers: { Authorization: `Bearer ${adminToken}` } });

    if (assignRes.data.code === 0) {
      logPass('Multi-assignment successful');
    }

    // 4. Verify status updated to waiting_for_user
    const checkRes = await axios.get(`${API_URL}/orders/${customOrderId}`, {
        headers: { Authorization: `Bearer ${userToken}` }
    });
    if (checkRes.data.data.status === 'waiting_for_user') {
        logPass('Order status updated to waiting_for_user');
    } else {
        throw new Error(`Order status mismatch. Expected waiting_for_user, got ${checkRes.data.data.status}`);
    }

    // 5. Test: User Select Guide
    const selectRes = await axios.post(`${API_URL}/orders/${customOrderId}/select-guide`, {
        guideId: guideIds[0]
    }, { headers: { Authorization: `Bearer ${userToken}` } });

    if (selectRes.data.code === 0) {
        logPass('User selection successful');
    }

    // Verify status updated to in_progress
    const finalCheck = await axios.get(`${API_URL}/orders/${customOrderId}`, {
        headers: { Authorization: `Bearer ${userToken}` }
    });
    if (finalCheck.data.data.status === 'in_progress') {
         logPass('Order status updated to in_progress');
    }

  } catch (e: any) {
    logFail('Test Failed', e);
    process.exit(1);
  }

  console.log('\n✨ Guide Assignment Tests Completed.');
}

runTests();
