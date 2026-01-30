import axios from 'axios';

// Configuration
const API_URL = 'http://localhost:3000/api/v1';
const ADMIN_PHONE = '19999999999';
const ADMIN_PASSWORD = 'AdminPassword123';
const USER_PHONE = '18800000001';
const GUIDE_PHONE = '18800000002';

async function main() {
  try {
    console.log('🚀 Starting Verification: [T-2] Admin Create Custom Order');

    // 0. Ensure Users Exist (Helper)
    async function ensureUser(phone: string, nickName: string) {
        try {
            await axios.post(`${API_URL}/auth/register`, {
                phone,
                password: 'password123',
                nickName
            });
        } catch (e: any) {
            // If exists (400), ignore
            if (e.response?.status !== 400 && e.response?.data?.code !== 1002) {
                 // 1002 is UserExists
            }
        }
    }

    console.log('\n0. Preparing Data...');
    await ensureUser(USER_PHONE, 'TestUserT2');
    await ensureUser(GUIDE_PHONE, 'TestGuideT2');
    console.log('✅ Users prepared');

    // 1. Login as Admin
    console.log('\n1. Logging in as Admin...');
    let token = '';
    try {
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            phone: ADMIN_PHONE,
            password: ADMIN_PASSWORD
        });
        token = loginRes.data.data.token;
        console.log('✅ Login successful');
    } catch (e: any) {
        console.error('❌ Login failed:', e.response?.data || e.message);
        process.exit(1);
    }

    // 2. Test Success Case
    console.log('\n2. Testing Create Custom Order (Success)...');
    const payload = {
      userPhone: USER_PHONE,
      guidePhone: GUIDE_PHONE,
      pricePerHour: 10050, // 10050 Cents (100.5 Yuan)
      duration: 8,         // 8 Hours
      serviceStartTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      serviceAddress: "Beijing Airport",
      content: "Airport Pickup and 1-day Tour", // Plain Text
      requirements: "VIP Service"
    };

    const res = await axios.post(`${API_URL}/admin/custom-orders`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = res.data.data;
    console.log('Create Response:', data);

    // Assertions
    if (data.amount !== 80400) throw new Error(`Amount mismatch: expected 80400, got ${data.amount}`);
    if (data.status !== 'pending') throw new Error(`Status mismatch: expected pending, got ${data.status}`);
    console.log('✅ Create Success');

    // 3. Test Get Order Details
    console.log('\n3. Testing Get Order Details...');
    const detailRes = await axios.get(`${API_URL}/admin/orders/${data.orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const detail = detailRes.data.data;
    console.log('Detail Response:', detail);

    if (detail.id !== data.orderId) throw new Error('Detail ID mismatch');
    if (detail.pricePerHour !== 10050) throw new Error('Detail Price mismatch');
    if (detail.user.phone !== USER_PHONE) throw new Error('Detail User mismatch');
    if (detail.guide.phone !== GUIDE_PHONE) throw new Error('Detail Guide mismatch');
    
    // Check content (Text)
    if (detail.content !== "Airport Pickup and 1-day Tour") {
        throw new Error('Content mismatch or unexpected parsing');
    }
    console.log('✅ Content verified (Plain Text)');
    
    console.log('✅ Get Details Success');

    // 4. Test Error Cases
    console.log('\n4. Testing Error Cases...');
    
    // Guide Not Found
    try {
        await axios.post(`${API_URL}/admin/custom-orders`, { ...payload, guidePhone: '10000000000' }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.error('❌ Failed: Should have returned 404 for invalid guide');
    } catch (e: any) {
        if (e.response?.status === 404) console.log('✅ Invalid Guide Case Passed (404)');
        else console.error(`❌ Unexpected Error: ${e.message}`);
    }

    // Invalid Currency (Float)
    try {
        await axios.post(`${API_URL}/admin/custom-orders`, { ...payload, pricePerHour: 100.5 }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.error('❌ Failed: Should have returned 400 for float price');
    } catch (e: any) {
        if (e.response?.status === 400) console.log('✅ Float Price Case Passed (400)');
        else console.error(`❌ Unexpected Error: ${e.message}`);
    }

    console.log('\n🎉 All Tests Passed!');

  } catch (error: any) {
    console.error('\n❌ Verification Failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

main();
