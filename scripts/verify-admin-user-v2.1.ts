import axios from 'axios';
import { db } from '../server/db/index.js';
import { users } from '../server/db/schema.js';
import { eq } from 'drizzle-orm';
import { exit } from 'process';

const BASE_URL = 'http://localhost:3000/api/v1';

// Test Data
const ADMIN_PHONE = '19999999999';
const ADMIN_PASS = 'AdminPassword123';
const TEST_USER_PHONE = '18888888888';
const TEST_USER_PASS = 'User1234';

async function runTest() {
  try {
    console.log('🚀 Starting Verification: Admin User Management V2.1');

    // 1. Setup: Ensure Admin exists
    console.log('\n[Setup] Checking Admin User...');
    const [admin] = await db.select().from(users).where(eq(users.phone, ADMIN_PHONE));
    if (!admin) {
        console.error('❌ Admin user not found. Please seed the database first.');
        exit(1);
    }

    // 2. Setup: Ensure Test User exists
    console.log('[Setup] Checking/Creating Test User...');
    let [testUser] = await db.select().from(users).where(eq(users.phone, TEST_USER_PHONE));
    if (!testUser) {
        // Register if not exists
        await axios.post(`${BASE_URL}/auth/register`, {
            phone: TEST_USER_PHONE,
            password: TEST_USER_PASS,
            nickname: 'TestUserV2'
        });
        [testUser] = await db.select().from(users).where(eq(users.phone, TEST_USER_PHONE));
        console.log('✅ Test user created.');
    } else {
        // Reset role to user
        await db.update(users).set({ role: 'user', lastLoginAt: null }).where(eq(users.id, testUser.id));
        console.log('✅ Test user reset.');
    }

    // 3. Test: Login Updates last_login_at
    console.log('\n[Test 1] User Login & Last Login Tracking');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
        phone: TEST_USER_PHONE,
        password: TEST_USER_PASS
    });
    
    if (loginRes.data.code === 0) {
        console.log('✅ Login successful');
        // Verify DB update
        const [updatedUser] = await db.select().from(users).where(eq(users.id, testUser.id));
        if (updatedUser.lastLoginAt) {
            console.log(`✅ last_login_at updated: ${updatedUser.lastLoginAt}`);
        } else {
            console.error('❌ last_login_at NOT updated');
            exit(1);
        }
    } else {
        console.error('❌ Login failed');
        exit(1);
    }

    // 4. Test: Admin Get List (Check lastLoginAt field)
    console.log('\n[Test 2] Admin Get User List');
    // Login as Admin
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
        phone: ADMIN_PHONE,
        password: ADMIN_PASS
    });
    const adminToken = adminLogin.data.data.token;
    
    const listRes = await axios.get(`${BASE_URL}/admin/users?keyword=${TEST_USER_PHONE}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (listRes.data.code === 0) {
        const target = listRes.data.data.list.find((u: any) => u.id === testUser.id);
        if (target && target.lastLoginAt) {
            console.log('✅ Admin list contains lastLoginAt field');
        } else {
            console.error('❌ Admin list missing lastLoginAt field or user not found');
            console.log(JSON.stringify(target, null, 2));
            exit(1);
        }
    }

    // 5. Test: Promote User to CS
    console.log('\n[Test 3] Promote User to CS');
    const promoteRes = await axios.put(`${BASE_URL}/admin/users/${testUser.id}/role`, {
        role: 'cs'
    }, {
        headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (promoteRes.data.code === 0 && promoteRes.data.data.role === 'cs') {
        console.log('✅ User promoted to CS');
    } else {
        console.error('❌ Promotion failed');
        exit(1);
    }

    // Verify DB
    const [csUser] = await db.select().from(users).where(eq(users.id, testUser.id));
    if (csUser.role !== 'cs') {
        console.error('❌ DB role mismatch');
        exit(1);
    }

    // 6. Test: Demote CS to User
    console.log('\n[Test 4] Demote CS to User');
    const demoteRes = await axios.put(`${BASE_URL}/admin/users/${testUser.id}/role`, {
        role: 'user'
    }, {
        headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (demoteRes.data.code === 0 && demoteRes.data.data.role === 'user') {
        console.log('✅ CS demoted to User');
    } else {
        console.error('❌ Demotion failed');
        exit(1);
    }

    console.log('\n✨ All Tests Passed Successfully!');
    exit(0);

  } catch (error: any) {
    console.error('\n❌ Test Failed:', error.message);
    if (error.response) {
        console.error('Response:', error.response.data);
    }
    exit(1);
  }
}

runTest();
