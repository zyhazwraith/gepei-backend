import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

async function runTests() {
  console.log('🚀 Starting Guide Assignment Integration Tests...\n');
  
  const logPass = (msg: string) => console.log(`✅ [PASS] ${msg}`);
  const logFail = (msg: string, err: any) => console.error(`❌ [FAIL] ${msg}`, err.response?.data || err.message);

  let adminToken = '';
  let userToken = '';
  let guideIds: number[] = [];
  let customOrderId = 0;

  try {
    // 1. Admin Login
    console.log('🔹 1. Admin Login...');
    const adminRes = await axios.post(`${API_URL}/auth/login`, {
      phone: '19999999999',
      password: 'AdminPassword123'
    });
    adminToken = adminRes.data.data.token;
    logPass('Admin Login Successful');

    // 2. Setup: Create User & Get Guides
    console.log('\n🔹 2. Setup User & Get Guides...');
    const userPhone = `135${Math.floor(10000000 + Math.random() * 90000000)}`;
    const userRes = await axios.post(`${API_URL}/auth/register`, { phone: userPhone, password: 'Password123', nickname: 'TestUser' });
    userToken = userRes.data.data.token;
    
    // Get available guides
    const guidesRes = await axios.get(`${API_URL}/guides`);
    if (guidesRes.data.data.list.length < 2) {
      throw new Error('Need at least 2 guides to test multi-assignment');
    }
    guideIds = guidesRes.data.data.list.slice(0, 10).map((g: any) => g.guideId);
    logPass(`Found ${guideIds.length} guides`);

    // 3. Create Custom Order
    console.log('\n🔹 3. Create Custom Order...');
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

    // 4. Test: Assign Multiple Guides (2 guides)
    console.log('\n🔹 4. Test: Assign Multiple Guides (2 guides)...');
    const assignIds = guideIds.slice(0, 2);
    const assignRes = await axios.post(`${API_URL}/admin/orders/${customOrderId}/assign`, {
      guideIds: assignIds
    }, { headers: { Authorization: `Bearer ${adminToken}` } });

    if (assignRes.data.code === 0) {
      logPass('Multi-assignment successful');
    } else {
      throw new Error(`Assignment failed: ${assignRes.data.message}`);
    }

    // Verify status updated to waiting_for_user
    const checkRes = await axios.get(`${API_URL}/orders/${customOrderId}`, {
        headers: { Authorization: `Bearer ${userToken}` }
    });
    if (checkRes.data.data.status === 'waiting_for_user') {
        logPass('Order status updated to waiting_for_user');
    } else {
        throw new Error(`Order status mismatch. Expected waiting_for_user, got ${checkRes.data.data.status}`);
    }

    // 4.1 Check Candidates API
    console.log('\n🔹 4.1. Test: Get Candidates...');
    const candidatesRes = await axios.get(`${API_URL}/orders/${customOrderId}/candidates`, {
        headers: { Authorization: `Bearer ${userToken}` }
    });
    if (candidatesRes.data.data.list.length === 2) {
        logPass('Candidates list retrieved correctly (2 items)');
    } else {
        throw new Error(`Candidates count mismatch. Expected 2, got ${candidatesRes.data.data.list.length}`);
    }

    // 5. Test: Exceed Limit (Boundary Case)
    console.log('\n🔹 5. Test: Exceed Limit (>5 guides)...');
    // Ensure we have enough guides or reuse some if necessary (but controller checks uniqueness via inArray result count vs input count? 
    // Actually controller checks validGuides.length !== guideIds.length. 
    // If we send duplicate IDs [1, 1], validGuides is [1] (length 1), guideIds length 2. Mismatch -> "Not Found".
    // So we need distinct valid IDs.
    
    let manyIds = guideIds.slice(0, 6);
    if (manyIds.length < 6) {
        console.warn(`Warning: Only have ${manyIds.length} guides, cannot test >5 limit fully with valid IDs.`);
        // Just use what we have plus some fake ones to trigger "Not Found" or "Exceed" depending on which check comes first.
        // Controller checks existence (step 3) BEFORE limit (step 4 for custom).
        // So if we provide fake IDs, it fails "Not Found" first.
        // We need it to pass existence check to reach limit check.
        // If we don't have 6 guides, we can't test limit check with valid IDs.
        // But the requirements say "Found 10 guides" in previous run, so we are good.
    }
    
    try {
      await axios.post(`${API_URL}/admin/orders/${customOrderId}/assign`, {
        guideIds: manyIds
      }, { headers: { Authorization: `Bearer ${adminToken}` } });
      logFail('Should have failed with validation error', {});
    } catch (e: any) {
      if (e.response?.status === 400 && e.response?.data?.message?.includes('最多只能选择5个')) {
        logPass('Caught expected validation error: Exceed limit');
      } else {
        logFail('Unexpected error response', e);
      }
    }

    // 6. Test: Single Assignment (Re-assign)
    console.log('\n🔹 6. Test: Single Assignment (Re-assign)...');
    const singleId = [guideIds[0]];
    const reassignRes = await axios.post(`${API_URL}/admin/orders/${customOrderId}/assign`, {
        guideIds: singleId
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    
    if (reassignRes.data.code === 0) {
        logPass('Single assignment (re-assign) successful');
    }

    // 7. Test: User Select Guide
    console.log('\n🔹 7. Test: User Select Guide...');
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
    } else {
         throw new Error(`Order status mismatch. Expected in_progress, got ${finalCheck.data.data.status}`);
    }

  } catch (e: any) {
    logFail('Test Failed', e);
    process.exit(1);
  }

  console.log('\n✨ Guide Assignment Tests Completed.');
}

runTests();
