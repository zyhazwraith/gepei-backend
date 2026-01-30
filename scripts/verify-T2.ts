import axios from 'axios';
import { nanoid } from 'nanoid';

// Configuration
const API_URL = 'http://localhost:3000/api/v1';
const ADMIN_PHONE = '13800000000'; // Assuming this is seeded admin
const USER_PHONE = '13800138000'; // Assuming this user exists or we create one
const GUIDE_PHONE = '13900139000'; // Assuming this guide exists

async function main() {
  try {
    console.log('🚀 Starting Verification: [T-2] Admin Create Custom Order');

    // 1. Login as Admin
    console.log('\n1. Logging in as Admin...');
    // Note: Assuming we have a way to get token. If not, we might need to seed/login first.
    // For simplicity, let's assume we can login with a test account.
    // If login fails, we might need to create an admin first.
    let token = '';
    try {
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            phone: ADMIN_PHONE,
            password: 'password123' // Correct password from seed
        });
        token = loginRes.data.data.token;
        console.log('✅ Login successful');
    } catch (e) {
        console.error('❌ Login failed. Ensure server is running and admin seeded.');
        process.exit(1);
    }

    // 2. Prepare Data (Get Guide ID)
    // We need a valid guideId. Let's list guides or just assume ID=1 if seeded.
    // Better: Fetch a user and promote to guide if needed, but let's assume ID 1 exists.
    // Or fetch /admin/users to find a guide.
    console.log('\n2. Finding a valid Guide...');
    const usersRes = await axios.get(`${API_URL}/admin/users?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const guideUser = usersRes.data.data.list.find((u: any) => u.isGuide);
    if (!guideUser) {
        console.error('❌ No guide found in system. Please seed a guide first.');
        process.exit(1);
    }
    const guideId = guideUser.id;
    console.log(`✅ Found Guide ID: ${guideId}`);

    // 3. Test Success Case
    console.log('\n3. Testing Success Case...');
    const payload = {
      userPhone: USER_PHONE,
      guidePhone: GUIDE_PHONE, // Changed from guideId
      pricePerHour: 10050, // 100.5 Yuan -> 10050 Cents
      duration: 8,         // 8 Hours
      serviceStartTime: new Date().toISOString(),
      serviceAddress: "Beijing Airport",
      content: "Airport Pickup",
      requirements: "Need a big van"
    };

    // Create user if not exists
    try {
       await axios.post(`${API_URL}/auth/login`, { phone: USER_PHONE, code: '123456' });
    } catch (e) {}

    const res = await axios.post(`${API_URL}/admin/custom-orders`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = res.data.data;
    console.log('Response:', data);

    // Assertions
    if (data.amount !== 80400) throw new Error(`Amount mismatch: expected 80400, got ${data.amount}`); // 10050 * 8
    if (data.status !== 'pending') throw new Error(`Status mismatch: expected pending, got ${data.status}`);
    console.log('✅ Success Case Passed');

    // 4. Test Error: Missing Guide Phone
    console.log('\n4. Testing Error: Missing GuidePhone...');
    try {
        const invalidPayload = { ...payload };
        delete (invalidPayload as any).guidePhone;
        await axios.post(`${API_URL}/admin/custom-orders`, invalidPayload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.error('❌ Failed: Should have returned 400 for missing guidePhone');
    } catch (e: any) {
        if (e.response?.status === 400) console.log('✅ Error Case Passed (400)');
        else console.error(`❌ Unexpected Error: ${e.message}`);
    }

    // 5. Test Error: Invalid Price (Float)
    console.log('\n5. Testing Error: Float Price...');
    try {
        await axios.post(`${API_URL}/admin/custom-orders`, { ...payload, pricePerHour: 100.5 }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.error('❌ Failed: Should have returned 400 for float price');
    } catch (e: any) {
        if (e.response?.status === 400) console.log('✅ Error Case Passed (400)');
        else console.error(`❌ Unexpected Error: ${e.message}`);
    }

    console.log('\n🎉 All Tests Passed!');

  } catch (error: any) {
    console.error('\n❌ Verification Failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

main();
