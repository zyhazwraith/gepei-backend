import { db } from '../db/index.js';
import { users, withdrawals, walletLogs, orders } from '../db/schema.js';
import { eq, desc, and, count, inArray, sql } from 'drizzle-orm';
import { ValidationError } from '../utils/errors.js';

export class WalletService {

  /**
   * Get Wallet Summary
   * Returns available balance and calculated frozen amount
   */
  static async getWalletSummary(userId: number) {
    // 1. Get User Balance
    const [user] = await db.select({ balance: users.balance })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new ValidationError('用户不存在');
    }

    // 2. Calculate Frozen Amount (Sum of pending withdrawals)
    const [frozenResult] = await db.select({ 
      total: sql<number>`sum(${withdrawals.amount})`
    })
    .from(withdrawals)
    .where(and(
      eq(withdrawals.userId, userId),
      eq(withdrawals.status, 'pending')
    ));

    const frozenAmount = Number(frozenResult?.total || 0);

    return {
      balance: user.balance || 0,
      frozen_amount: frozenAmount
    };
  }

  /**
   * Get Wallet Logs with Pagination
   */
  static async getWalletLogs(userId: number, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    // 1. Count Total
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(walletLogs)
      .where(eq(walletLogs.userId, userId));

    // 2. Fetch Logs with Joins
    const list = await db.select({
      id: walletLogs.id,
      type: walletLogs.type,
      amount: walletLogs.amount,
      relatedType: walletLogs.relatedType,
      relatedId: walletLogs.relatedId,
      createdAt: walletLogs.createdAt,
      // Joined fields
      orderNumber: orders.orderNumber,
      adminNote: withdrawals.adminNote,
    })
    .from(walletLogs)
    .leftJoin(orders, and(
      eq(walletLogs.relatedId, orders.id),
      eq(walletLogs.relatedType, 'order')
    ))
    .leftJoin(withdrawals, and(
      eq(walletLogs.relatedId, withdrawals.id),
      eq(walletLogs.relatedType, 'withdrawal')
    ))
    .where(eq(walletLogs.userId, userId))
    .orderBy(desc(walletLogs.createdAt))
    .limit(limit)
    .offset(offset);

    return {
      list,
      pagination: {
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Apply for Withdrawal
   */
  static async applyWithdraw(userId: number, amount: number, userNote: string) {
    return await db.transaction(async (tx) => {
      // 1. Lock & Check User Balance
      // Note: For strict concurrency, we might need 'for update' but Drizzle/MySQL simple select is usually ok for MVP with balance check update
      // Better approach: Update where balance >= amount and check affected rows
      
      // Attempt to deduct balance
      const [result] = await tx.update(users)
        .set({ 
          balance: sql`${users.balance} - ${amount}`,
          updatedAt: new Date()
        })
        .where(and(
          eq(users.id, userId),
          sql`${users.balance} >= ${amount}` // Optimistic lock condition
        ));

      if (result.affectedRows === 0) {
        throw new ValidationError('余额不足');
      }

      // 2. Create Withdrawal Record (Pending)
      const [withdrawResult] = await tx.insert(withdrawals).values({
        userId,
        amount,
        userNote,
        status: 'pending',
        createdAt: new Date()
      });
      const withdrawalId = withdrawResult.insertId;

      // 3. Log Wallet Transaction (Freeze)
      await tx.insert(walletLogs).values({
        userId,
        type: 'withdraw_freeze',
        amount: -amount, // Negative for outflow
        relatedType: 'withdrawal',
        relatedId: withdrawalId,
        createdAt: new Date()
      });

      return {
        id: withdrawalId,
        amount,
        status: 'pending'
      };
    });
  }
}
