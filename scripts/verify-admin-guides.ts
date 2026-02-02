
import 'dotenv/config';
import axios from 'axios';
import { db } from '../server/db';
import { users, guides } from '../server/db/schema';
import { eq } from 'drizzle-orm';
import { createGuide } from '../server/models/guide.model';

const BASE_URL = 'http://localhost:3000/api/v1';
let adminToken = '';
let guideUserId = 0;

async function setup() {
  console.log('Setup: Ensuring Admin and Test Guide exist...');

  // 1. Get Admin Token (Assuming admin exists from previous seeds)
  // If not, we might need to create one or login. 
  // Let's assume standard admin login works.
  try {
      const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
          phone: '19999999999',
          password: 'AdminPassword123'
      });
      adminToken = loginRes.data.data.token;
      console.log('Admin logged in. Token:', adminToken?.substring(0, 20) + '...');
  } catch (e: any) {
      console.error('Admin login failed:', e.response?.data || e.message);
      process.exit(1);
  }

  // 2. Create a Test Guide User (Pending status)
  // Clean up previous test user if exists
  const testPhone = '13812345678';
  await db.delete(guides).where(eq(guides.idNumber, 'TEST_ID_123456'));
  await db.delete(users).where(eq(users.phone, testPhone));

  const [userResult] = await db.insert(users).values({
      phone: testPhone,
      password: 'password123', // plain for test
      nickname: 'TestGuideCandidate',
      isGuide: false // Initially pending
  }).$returningId();
  
  guideUserId = userResult.id;

  // Create Guide Profile
  await createGuide(
      guideUserId,
      'TestStageName',
      'TEST_ID_123456',
      'Shanghai',
      'Intro...',
      200, // expectedPrice
      ['tag1'],
      [],
      'Test Address'
  );
  
  console.log(`Created test guide (UserId: ${guideUserId})`);
}

async function verifyList() {
    console.log('\n--- Verifying List API ---');
    
    // 1. List All
    try {
        const res = await axios.get(`${BASE_URL}/admin/guides`, {
            headers: { Authorization: `Bearer ${adminToken}` },
            params: { page: 1, limit: 10, status: 'all' }
        });
        console.log('List All Response Status:', res.status);
        console.log('Pagination:', res.data.data.pagination);
        
        const found = res.data.data.list.find((g: any) => g.userId === guideUserId);
        if (found) {
            console.log('✅ Found test guide in list');
            console.log('Guide Status:', found.isGuide); // Should be false or undefined (from user join)
        } else {
            console.error('❌ Test guide not found in list');
        }

    } catch (e: any) {
        console.error('List API Failed:', e.response?.data || e.message);
    }
}

async function verifyDetail() {
    console.log('\n--- Verifying Detail API ---');
    try {
        const res = await axios.get(`${BASE_URL}/admin/guides/${guideUserId}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const data = res.data.data;
        if (data.userId === guideUserId && data.idNumber === 'TEST_ID_123456') {
             console.log('✅ Detail API verified');
             console.log('Real Price:', data.realPrice); // Should be null or 0
             console.log('Is Guide:', data.isGuide); // Should be false
        } else {
             console.error('❌ Detail API returned incorrect data', data);
        }
    } catch (e: any) {
        console.error('Detail API Failed:', e.response?.data || e.message);
    }
}

async function verifyUpdate() {
    console.log('\n--- Verifying Update API (Audit) ---');
    try {
        // Approve and set price
        const res = await axios.put(`${BASE_URL}/admin/guides/${guideUserId}`, {
            is_guide: true,
            real_price: 300 // 300 Yuan? Or Fen? Logic in service just saves it. Assuming consistency.
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        console.log('Update Response:', res.data);
        
        if (res.data.data.isGuide === true && Number(res.data.data.realPrice) === 300) {
            console.log('✅ Update successful: Guide approved and price set.');
        } else {
            console.error('❌ Update failed verification', res.data.data);
        }

        // Verify with List again (filter verified)
        const listRes = await axios.get(`${BASE_URL}/admin/guides`, {
            headers: { Authorization: `Bearer ${adminToken}` },
            params: { status: 'verified', keyword: 'TestStageName' }
        });
        
        const found = listRes.data.data.list.find((g: any) => g.userId === guideUserId);
        if (found) {
            console.log('✅ Found guide in Verified list');
        } else {
             console.error('❌ Guide not found in Verified list after approval');
        }

    } catch (e: any) {
        console.error('Update API Failed:', e.response?.data || e.message);
    }
}

async function run() {
    await setup();
    await verifyList();
    await verifyDetail();
    await verifyUpdate();
    console.log('\nDone.');
    process.exit(0);
}

run();
