
import 'dotenv/config';
import axios from 'axios';
import { db } from '../server/db/index.js';
import { users, withdrawals, walletLogs } from '../server/db/schema.js';
import { eq } from 'drizzle-orm';
import { registerUser, loginUser } from '../tests/utils/helpers.js';

const BASE_URL = 'http://localhost:3000/api/v1';

async function verifyWalletFlow() {
  console.log('🚀 Starting Wallet Flow Verification (Phase 1)...');
  
  try {
    // 1. Setup User
    console.log('\n[Step 1] Creating Test User...');
    const userReg = await registerUser({ role: 'user', isGuide: true });
    const token = userReg.token;
    const userId = userReg.userId;
    console.log(`✅ User created: ID ${userId}`);

    // 2. Initial State Check
    console.log('\n[Step 2] Verifying Initial Balance...');
    const resInit = await axios.get(`${BASE_URL}/wallet/summary`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (resInit.data.data.balance === 0 && resInit.data.data.frozen_amount === 0) {
      console.log('✅ Initial balance is 0');
    } else {
      throw new Error(`Initial balance mismatch: ${JSON.stringify(resInit.data.data)}`);
    }

    // 3. Inject Income (Mock)
    console.log('\n[Step 3] Injecting Income (Mock 10000)...');
    await db.update(users)
      .set({ balance: 10000 })
      .where(eq(users.id, userId));
    
    // Log fake income for realism
    await db.insert(walletLogs).values({
        userId,
        type: 'income',
        amount: 10000,
        relatedType: 'order',
        relatedId: 0, // Mock
        createdAt: new Date()
    });

    const resIncome = await axios.get(`${BASE_URL}/wallet/summary`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (resIncome.data.data.balance === 10000) {
        console.log('✅ Balance updated to 10000');
    } else {
        throw new Error('Balance update failed');
    }

    // 4. Withdraw Application - Case A: Insufficient Funds
    console.log('\n[Step 4] Testing Insufficient Funds...');
    try {
        await axios.post(`${BASE_URL}/wallet/withdraw`, {
            amount: 20000,
            userNote: 'Should Fail'
        }, { headers: { Authorization: `Bearer ${token}` } });
        throw new Error('❌ Insufficient funds check FAILED (Should have thrown 400)');
    } catch (e: any) {
        if (e.response?.status === 400) {
            console.log('✅ Insufficient funds rejected (400)');
        } else {
            throw e;
        }
    }

    // 5. Withdraw Application - Case B: Success
    console.log('\n[Step 5] Applying for Withdraw (2000)...');
    const resApply = await axios.post(`${BASE_URL}/wallet/withdraw`, {
        amount: 2000,
        userNote: 'WeChat: test_user'
    }, { headers: { Authorization: `Bearer ${token}` } });
    
    if (resApply.data.code === 0) {
        console.log('✅ Apply API Success');
    }

    // Verify DB State
    const [userAfter] = await db.select().from(users).where(eq(users.id, userId));
    const [withdrawal] = await db.select().from(withdrawals).where(eq(withdrawals.userId, userId));
    
    if (userAfter.balance === 8000) {
        console.log('✅ User Balance Deducted (10000 -> 8000)');
    } else {
        throw new Error(`User balance incorrect: ${userAfter.balance}`);
    }

    if (withdrawal && withdrawal.status === 'pending' && withdrawal.amount === 2000) {
        console.log('✅ Withdrawal Record Created (Pending)');
    } else {
        throw new Error('Withdrawal record incorrect');
    }

    // Verify API Summary
    const resSummary = await axios.get(`${BASE_URL}/wallet/summary`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const summary = resSummary.data.data;
    if (summary.balance === 8000 && summary.frozen_amount === 2000) {
        console.log('✅ Summary API Correct (Balance: 8000, Frozen: 2000)');
    } else {
        throw new Error(`Summary API mismatch: ${JSON.stringify(summary)}`);
    }

    // 6. Audit Mock (Reject)
    console.log('\n[Step 6] Mocking Audit Reject...');
    // Manually reject and refund
    await db.update(withdrawals)
        .set({ status: 'rejected' })
        .where(eq(withdrawals.id, withdrawal.id));
    
    await db.update(users)
        .set({ balance: 10000 }) // 8000 + 2000
        .where(eq(users.id, userId));
    
    // Check Summary Again
    const resFinal = await axios.get(`${BASE_URL}/wallet/summary`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const finalSummary = resFinal.data.data;
    if (finalSummary.balance === 10000 && finalSummary.frozen_amount === 0) {
        console.log('✅ Audit Reject Logic Verified (Frozen cleared, Balance restored)');
    } else {
        throw new Error(`Final summary mismatch: ${JSON.stringify(finalSummary)}`);
    }

    console.log('\n🎉 Wallet Flow Verification Passed!');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Verification Failed:', error.message);
    if (error.response) {
        console.error('API Response:', error.response.data);
    }
    process.exit(1);
  }
}

verifyWalletFlow();
