import 'dotenv/config';
import axios from 'axios';
import { db } from '../server/db';
import { auditLogs } from '../server/db/schema';
import { inArray } from 'drizzle-orm';
import { generateToken } from '../server/utils/jwt';
import { TEST_ACCOUNTS, API_BASE_URL } from './shared/test-constants';
import { ensureUser, cleanupUser } from './shared/test-utils';

async function run() {
    console.log('--- Test Ban Flow (Isolated) ---');

    // 1. Setup Data using Isolated Accounts
    const adminPhone = TEST_ACCOUNTS.BAN_TEST_ADMIN.phone;
    const userPhone = TEST_ACCOUNTS.BAN_TEST_USER.phone;
    const password = TEST_ACCOUNTS.BAN_TEST_ADMIN.password;

    // Cleanup first
    // Note: We only clean up the ISOLATED accounts, not the MAIN_ADMIN
    await cleanupUser(adminPhone);
    await cleanupUser(userPhone);

    // Create Admin
    const adminId = await ensureUser({
        phone: adminPhone,
        password: password,
        role: 'admin',
        nickname: TEST_ACCOUNTS.BAN_TEST_ADMIN.nickname
    });

    // Create Target User
    const targetUserId = await ensureUser({
        phone: userPhone,
        password: password,
        role: 'user',
        nickname: TEST_ACCOUNTS.BAN_TEST_USER.nickname
    });

    console.log(`Created Isolated Admin(${adminId}) and TargetUser(${targetUserId})`);

    // Generate Admin Token
    const adminToken = generateToken({ id: adminId, phone: adminPhone, role: 'admin' });
    
    // Generate User Token (for Middleware test)
    const userToken = generateToken({ id: targetUserId, phone: userPhone, role: 'user' });

    // 2. Test Ban
    console.log('\n[Step 1] Admin Bans User...');
    try {
        await axios.put(`${API_BASE_URL}/admin/users/${targetUserId}/ban`, {
            reason: 'Test Ban Reason'
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ Ban API Success');
    } catch (e: any) {
        console.error('❌ Ban API Failed:', e.response?.data || e.message);
        process.exit(1);
    }

    // 3. Test Login Guard
    console.log('\n[Step 2] Testing Login Guard...');
    try {
        await axios.post(`${API_BASE_URL}/auth/login`, {
            phone: userPhone,
            password: password
        });
        console.error('❌ Login Guard Failed: Banned user was able to login');
    } catch (e: any) {
        if (e.response?.status === 403 && e.response?.data?.code === 1011) { // 1011 is USER_BANNED
            console.log('✅ Login Guard Success: 403 Forbidden received');
        } else {
            console.error('❌ Login Guard Failed with unexpected error:', e.response?.data || e.message);
        }
    }

    // 4. Test Middleware Guard
    console.log('\n[Step 3] Testing Middleware Guard (Existing Token)...');
    try {
        await axios.get(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        console.error('❌ Middleware Guard Failed: Banned user accessed protected route');
    } catch (e: any) {
        if (e.response?.status === 403 && e.response?.data?.code === 1011) {
             console.log('✅ Middleware Guard Success: 403 Forbidden received');
        } else {
             console.error('❌ Middleware Guard Failed with unexpected error:', e.response?.data || e.message);
        }
    }

    // 5. Test Unban
    console.log('\n[Step 4] Admin Unbans User...');
    try {
        await axios.put(`${API_BASE_URL}/admin/users/${targetUserId}/unban`, {}, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ Unban API Success');
    } catch (e: any) {
        console.error('❌ Unban API Failed:', e.response?.data || e.message);
    }

    // 6. Test Login Again
    console.log('\n[Step 5] Testing Login after Unban...');
    try {
        await axios.post(`${API_BASE_URL}/auth/login`, {
            phone: userPhone,
            password: password
        });
        console.log('✅ Login Success after Unban');
    } catch (e: any) {
        console.error('❌ Login Failed after Unban:', e.response?.data || e.message);
    }

    console.log('\nTest Completed.');
    process.exit(0);
}

run();
