import 'dotenv/config';
import axios from 'axios';
import { generateToken } from '../server/utils/jwt';
import { TEST_ACCOUNTS, API_BASE_URL } from './shared/test-constants';
import { ensureUser, cleanupUser } from './shared/test-utils';

async function run() {
    console.log('--- Deep Verify User Status Value ---');

    const adminPhone = TEST_ACCOUNTS.BAN_TEST_ADMIN.phone;
    const userPhone = TEST_ACCOUNTS.BAN_TEST_USER.phone;
    const password = TEST_ACCOUNTS.BAN_TEST_ADMIN.password;

    // 1. Setup Isolated Accounts
    await cleanupUser(adminPhone);
    await cleanupUser(userPhone);

    const adminId = await ensureUser({
        phone: adminPhone,
        password: password,
        role: 'admin',
        nickname: TEST_ACCOUNTS.BAN_TEST_ADMIN.nickname
    });

    const targetUserId = await ensureUser({
        phone: userPhone,
        password: password,
        role: 'user',
        nickname: TEST_ACCOUNTS.BAN_TEST_USER.nickname
    });

    console.log(`Setup: Admin(${adminId}), TargetUser(${targetUserId})`);

    // 2. Generate Admin Token
    const token = generateToken({ id: adminId, phone: adminPhone, role: 'admin' });
    const headers = { Authorization: `Bearer ${token}` };

    // Helper to get user status from list
    const getUserStatus = async () => {
        const res = await axios.get(`${API_BASE_URL}/admin/users`, {
            headers,
            params: { keyword: userPhone } // Filter by specific phone to be sure
        });
        const list = res.data.data.list;
        const user = list.find((u: any) => u.id === targetUserId);
        if (!user) throw new Error('Target user not found in list');
        return { status: user.status, banReason: user.banReason };
    };

    try {
        // Step 1: Initial State (Should be active)
        console.log('\n[Check 1] Initial State...');
        const initial = await getUserStatus();
        console.log(`Current Status: ${initial.status}`);
        
        if (initial.status !== 'active') {
            throw new Error(`Expected status 'active', got '${initial.status}'`);
        }
        console.log('✅ Initial status correct (active).');

        // Step 2: Ban User
        console.log('\n[Action] Banning User...');
        const banReason = 'Verify Value Check';
        await axios.put(`${API_BASE_URL}/admin/users/${targetUserId}/ban`, { reason: banReason }, { headers });
        
        // Step 3: Check Banned State
        console.log('[Check 2] Post-Ban State...');
        const bannedState = await getUserStatus();
        console.log(`Current Status: ${bannedState.status}, Reason: ${bannedState.banReason}`);
        
        if (bannedState.status !== 'banned') {
            throw new Error(`Expected status 'banned', got '${bannedState.status}'`);
        }
        if (bannedState.banReason !== banReason) {
            throw new Error(`Expected reason '${banReason}', got '${bannedState.banReason}'`);
        }
        console.log('✅ Banned status and reason correct.');

        // Step 4: Unban User
        console.log('\n[Action] Unbanning User...');
        await axios.put(`${API_BASE_URL}/admin/users/${targetUserId}/unban`, {}, { headers });

        // Step 5: Check Active State
        console.log('[Check 3] Post-Unban State...');
        const unbannedState = await getUserStatus();
        console.log(`Current Status: ${unbannedState.status}`);
        
        if (unbannedState.status !== 'active') {
            throw new Error(`Expected status 'active', got '${unbannedState.status}'`);
        }
        console.log('✅ Unbanned status correct (active).');

    } catch (e: any) {
        console.error('❌ Verification Failed:', e.response?.data || e.message);
        process.exit(1);
    }
    
    console.log('\n🎉 All Status Values Verified Successfully!');
    process.exit(0);
}

run();
