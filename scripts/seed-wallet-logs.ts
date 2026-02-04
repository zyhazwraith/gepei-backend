import { db } from '../server/db';
import { users, walletLogs, withdrawals, orders } from '../server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

async function seed() {
  const phone = '18215596084';
  const user = await db.query.users.findFirst({
    where: eq(users.phone, phone)
  });

  if (!user) {
    console.error(`User with phone ${phone} not found`);
    process.exit(1);
  }

  console.log(`Found user: ${user.nickName} (ID: ${user.id})`);

  // Clear old data for this user to ensure clean state
  console.log('Clearing old wallet logs and withdrawals for user...');
  await db.delete(walletLogs).where(eq(walletLogs.userId, user.id));
  await db.delete(withdrawals).where(eq(withdrawals.userId, user.id));
  // Note: We don't delete orders as they might be used by other features, 
  // but for this test user it's safer to just rely on new orders being created with new IDs.

  const types = ['income', 'withdraw_freeze', 'withdraw_unfreeze', 'withdraw_success'] as const;
  const logs = [];
  let totalBalanceChange = 0;

  for (let i = 1; i <= 30; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const amount = (Math.floor(Math.random() * 10000) + 100) * (type === 'withdraw_freeze' ? -1 : 1);
    
    let relatedId = 0;
    let relatedType = 'order';

    // 1. If INCOME -> Create Order
    if (type === 'income') {
        const [res] = await db.insert(orders).values({
            userId: user.id,
            guideId: user.id, // Self-assignment for testing, or any valid guide ID
            orderNumber: `ORD-${Date.now()}-${i}`,
            amount: amount,
            status: 'completed',
            type: 'standard',
            content: 'Wallet Seed Order',
            createdAt: new Date(Date.now() - i * 3600000)
        });
        relatedId = res.insertId;
        relatedType = 'order';
    }
    // 2. If WITHDRAW -> Create Withdrawal
    else if (type.startsWith('withdraw_')) {
      relatedType = 'withdrawal';
      
      const status = type === 'withdraw_freeze' ? 'pending' 
                   : type === 'withdraw_success' ? 'completed'
                   : 'rejected';
                   
      const [res] = await db.insert(withdrawals).values({
        userId: user.id,
        amount: Math.abs(amount),
        status: status,
        userNote: 'Seed Script Withdrawal',
        adminNote: status === 'rejected' ? 'Seeded Rejection Reason: Invalid Account' : null,
        createdAt: new Date(Date.now() - i * 3600000)
      });
      relatedId = res.insertId;
    }

    logs.push({
      userId: user.id,
      type: type,
      amount: amount,
      relatedType: relatedType,
      relatedId: relatedId,
      createdAt: new Date(Date.now() - i * 3600000)
    });
    
    totalBalanceChange += amount;
  }

  console.log(`Inserting 30 logs with valid orders and withdrawals...`);
  await db.insert(walletLogs).values(logs);

  console.log(`Updating user balance by ${totalBalanceChange} cents...`);
  await db.update(users)
    .set({ 
      balance: sql`${users.balance} + ${totalBalanceChange}` 
    })
    .where(eq(users.id, user.id));

  console.log('Seed completed successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
