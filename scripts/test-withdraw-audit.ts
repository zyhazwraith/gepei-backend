import 'dotenv/config';
import axios from 'axios';
import { db } from '../server/db/index.js';
import { users, withdrawals, walletLogs } from '../server/db/schema.js';
import { eq } from 'drizzle-orm';
import { registerUser, loginUser } from '../tests/utils/helpers.js';

const BASE_URL = 'http://localhost:3000/api/v1';

async function verifyAdminWithdraw() {
  console.log('🚀 Starting Admin Withdraw Verification...');

  try {
    // 1. Setup Admin
    console.log('\n[Step 1] Creating Admin...');
    const adminReg = await registerUser({ role: 'user', isGuide: false }); // Register as user first
    const adminId = adminReg.userId;
    
    // Manually promote to admin
    await db.update(users)
      .set({ role: 'admin' })
      .where(eq(users.id, adminId));
      
    // Re-login to get admin token (if token contains role) or reuse token if role check is DB based?
    // Token contains role. So we must re-login or hack token. Re-login is safer if password is known.
    // registerUser helper generates random password 'Password123'.
    const adminToken = await loginUser(adminReg.user.phone, 'Password123');
    
    console.log(`✅ Admin created and promoted: ID ${adminId}`);

    // 2. Setup Guide
    console.log('\n[Step 2] Creating Guide User...');
    const guideReg = await registerUser({ role: 'user', isGuide: true });
    const guideToken = guideReg.token;
    const guideId = guideReg.userId;
    console.log(`✅ Guide created: ID ${guideId}`);

    // 3. Inject Income
    console.log('\n[Step 3] Injecting Income...');
    await db.update(users)
      .set({ balance: 10000 })
      .where(eq(users.id, guideId));
    console.log('✅ Balance set to 10000');

    // 4. Apply for Withdraw (To be Approved)
    console.log('\n[Step 4] Applying for Withdraw (2000)...');
    const resApply1 = await axios.post(`${BASE_URL}/wallet/withdraw`, {
        amount: 2000,
        userNote: 'To Approve'
    }, { headers: { Authorization: `Bearer ${guideToken}` } });
    const withdrawId1 = resApply1.data.data.id;
    console.log(`✅ Applied ID: ${withdrawId1}`);

    // 5. Admin List
    console.log('\n[Step 5] Admin List Pending Withdrawals...');
    const resList = await axios.get(`${BASE_URL}/admin/withdrawals`, {
        params: { status: 'pending' },
        headers: { Authorization: `Bearer ${adminToken}` }
    });
    const list = resList.data.data.list;
    const found = list.find((w: any) => w.id === withdrawId1);
    if (found && found.amount === 2000) {
        console.log('✅ Found withdrawal in admin list');
    } else {
        throw new Error('Withdrawal not found in admin list');
    }

    // 6. Admin Approve
    console.log('\n[Step 6] Admin Approving...');
    await axios.put(`${BASE_URL}/admin/withdrawals/${withdrawId1}`, {
        status: 'completed',
        adminNote: 'Transferred via Bank'
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.log('✅ Approved via API');

    // Verify
    const [w1] = await db.select().from(withdrawals).where(eq(withdrawals.id, withdrawId1));
    if (w1.status === 'completed') {
        console.log('✅ DB Status: completed');
    } else {
        throw new Error(`DB Status Incorrect: ${w1.status}`);
    }

    // 7. Apply for Withdraw (To be Rejected)
    console.log('\n[Step 7] Applying for Withdraw (3000)...');
    const resApply2 = await axios.post(`${BASE_URL}/wallet/withdraw`, {
        amount: 3000,
        userNote: 'To Reject'
    }, { headers: { Authorization: `Bearer ${guideToken}` } });
    const withdrawId2 = resApply2.data.data.id;

    // 8. Admin Reject
    console.log('\n[Step 8] Admin Rejecting...');
    await axios.put(`${BASE_URL}/admin/withdrawals/${withdrawId2}`, {
        status: 'rejected',
        adminNote: 'Invalid Account'
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.log('✅ Rejected via API');

    // Verify Refund
    const [user] = await db.select().from(users).where(eq(users.id, guideId));
    // Initial 10000 - 2000(approved) - 3000(rejected->refunded) = 8000
    // Wait: 
    // Start: 10000
    // Apply 2000 -> Bal 8000. Approve -> Bal 8000.
    // Apply 3000 -> Bal 5000. Reject -> Bal 5000 + 3000 = 8000.
    if (user.balance === 8000) {
        console.log('✅ Balance Refunded Correctly (8000)');
    } else {
        throw new Error(`Balance Mismatch: ${user.balance}, expected 8000`);
    }

    const [w2] = await db.select().from(withdrawals).where(eq(withdrawals.id, withdrawId2));
    if (w2.status === 'rejected' && w2.adminNote === 'Invalid Account') {
        console.log('✅ DB Status: rejected, Note saved');
    } else {
        throw new Error('DB Status/Note Incorrect');
    }

    console.log('\n🎉 Admin Withdraw Verification Passed!');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Verification Failed:', error.message);
    if (error.response) {
        console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

verifyAdminWithdraw();
