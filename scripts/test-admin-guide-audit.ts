
import 'dotenv/config';
import axios from 'axios';
import { db } from '../server/db';
import { users, guides } from '../server/db/schema';
import { eq } from 'drizzle-orm';
import { createGuide } from '../server/models/guide.model';

const BASE_URL = 'http://localhost:3000/api/v1';
let adminToken = '';
let csToken = '';
let guideUserId = 0;
let pendingGuideId = 0;

async function setup() {
  console.log('Setup: Ensuring Admin, CS and Test Guides exist...');

  // 1. Get Admin Token
  try {
      const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
          phone: '19999999999',
          password: 'AdminPassword123'
      });
      adminToken = loginRes.data.data.token;
      console.log('Admin logged in.');
  } catch (e: any) {
      console.error('Admin login failed:', e.response?.data || e.message);
      process.exit(1);
  }

  // 2. Setup CS User
  const csPhone = '18888888888';
  await db.delete(users).where(eq(users.phone, csPhone));
  await db.insert(users).values({
      phone: csPhone,
      password: 'password123', // plain for test
      nickname: 'TestCS',
      role: 'cs',
      isGuide: false
  });
  
  // Login as CS
   try {
       // Assuming CS creation needs password hashing, but standard logic might be simpler in tests
       // If login fails, we manually generate token
       const csUser = await db.query.users.findFirst({
           where: eq(users.phone, csPhone)
       });
       
       if (csUser) {
          // Use jwt utils to sign token directly for testing if login fails due to bcrypt
          const { generateToken } = await import('../server/utils/jwt');
          csToken = generateToken({
              id: csUser.id,
              phone: csUser.phone,
              role: csUser.role as any
          });
          console.log('CS logged in (Manual Token Gen).');
       }
   } catch (e: any) {
       console.error('CS login failed:', e.message);
   }

  // 3. Create Test Guides
  const testPhone1 = '13812345678'; // Target
  const testPhone2 = '13812345679'; // Pending only
  
  await db.delete(guides).where(eq(guides.idNumber, 'TEST_ID_123456'));
  await db.delete(guides).where(eq(guides.idNumber, 'TEST_ID_PENDING'));
  await db.delete(users).where(eq(users.phone, testPhone1));
  await db.delete(users).where(eq(users.phone, testPhone2));

  // User 1 (Will be approved)
  const [u1] = await db.insert(users).values({
      phone: testPhone1, password: 'password123', nickname: 'GuideTarget', isGuide: false
  }).$returningId();
  guideUserId = u1.id;
  await createGuide(guideUserId, 'GuideTarget', 'TEST_ID_123456', 'Shanghai', 'Intro...', 200, ['tag'], [], 'Addr');

  // User 2 (Stay Pending)
  const [u2] = await db.insert(users).values({
      phone: testPhone2, password: 'password123', nickname: 'GuidePending', isGuide: false
  }).$returningId();
  pendingGuideId = u2.id;
  await createGuide(pendingGuideId, 'GuidePending', 'TEST_ID_PENDING', 'Beijing', 'Intro...', 200, ['tag'], [], 'Addr');
  
  console.log(`Created test guides: Target(${guideUserId}), Pending(${pendingGuideId})`);
}

async function verifyListFilters() {
    console.log('\n--- Verifying List API Filters (as CS) ---');
    
    // 1. Filter Pending (is_guide=false)
    try {
        const res = await axios.get(`${BASE_URL}/admin/guides`, {
            headers: { Authorization: `Bearer ${csToken}` },
            params: { is_guide: false }
        });
        const list = res.data.data.list;
        console.log(`Pending List Count: ${list.length}`);
        
        const foundPending = list.find((g: any) => g.userId === pendingGuideId);
        const foundTarget = list.find((g: any) => g.userId === guideUserId);
        
        if (foundPending && foundTarget) {
            console.log('✅ Found both pending guides (before approval)');
        } else {
            console.error('❌ Failed to find pending guides');
        }

        // Verify fields (phone is now required)
        if (foundPending.realPrice !== undefined && foundPending.expectedPrice !== undefined && foundPending.isGuide !== undefined && foundPending.phone !== undefined) {
             console.log('✅ Verified required fields exist (realPrice, expectedPrice, isGuide, phone)');
        } else {
             console.error('❌ Missing required fields in list response', foundPending);
        }

    } catch (e: any) {
        console.error('List Pending Failed:', e.response?.data || e.message);
    }
}

async function verifyCSAccess() {
    console.log('\n--- Verifying CS Access & Update ---');
    try {
        // CS approves guideUserId
        const res = await axios.put(`${BASE_URL}/admin/guides/${guideUserId}`, {
            is_guide: true,
            real_price: 300
        }, {
            headers: { Authorization: `Bearer ${csToken}` }
        });
        
        if (res.data.data.isGuide === true) {
            console.log('✅ CS successfully approved guide');
        } else {
            console.error('❌ CS update failed verification');
        }

    } catch (e: any) {
        console.error('CS Update Failed:', e.response?.data || e.message);
    }
}

async function verifyVerifiedFilter() {
    console.log('\n--- Verifying Verified Filter (is_guide=true) ---');
    try {
        const res = await axios.get(`${BASE_URL}/admin/guides`, {
            headers: { Authorization: `Bearer ${adminToken}` },
            params: { is_guide: true }
        });
        const list = res.data.data.list;
        
        const foundTarget = list.find((g: any) => g.userId === guideUserId); // Should be here (Approved in verifyCSAccess)
        const foundPending = list.find((g: any) => g.userId === pendingGuideId); // Should NOT be here
        
        if (foundTarget && !foundPending) {
            console.log('✅ Verified filter works: Found approved guide, excluded pending guide');
        } else {
            console.error('❌ Verified filter failed');
            if (!foundTarget) console.error('   - Missed approved guide');
            if (foundPending) console.error('   - Included pending guide');
        }

    } catch (e: any) {
        console.error('List Verified Failed:', e.response?.data || e.message);
    }
}

async function run() {
    await setup();
    await verifyListFilters();
    await verifyCSAccess();
    await verifyVerifiedFilter();
    console.log('\nDone.');
    process.exit(0);
}

run();
