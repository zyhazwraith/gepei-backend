import { db } from '../db/index.js';
import { users, withdrawals, walletLogs } from '../db/schema.js';
import { eq, desc, and, count, sql } from 'drizzle-orm';
import { ValidationError } from '../utils/errors.js';
import { AuditService } from './audit.service.js';
import { AuditActions, AuditTargets } from '../constants/audit.js';
import { WithdrawalStatus, WalletLogType, WithdrawalStatusType } from '../constants/wallet.js';

export class WithdrawService {

  /**
   * [Admin] Get Withdrawals List
   */
  static async getAdminWithdrawals(params: {
    page?: number;
    limit?: number;
    status?: WithdrawalStatusType;
    userId?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (params.status) conditions.push(eq(withdrawals.status, params.status));
    if (params.userId) conditions.push(eq(withdrawals.userId, params.userId));

    const whereClause = conditions.length ? and(...conditions) : undefined;

    // 1. Count
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(withdrawals)
      .where(whereClause);

    // 2. List
    const list = await db.select({
      id: withdrawals.id,
      userId: withdrawals.userId,
      userPhone: users.phone,
      amount: withdrawals.amount,
      status: withdrawals.status,
      userNote: withdrawals.userNote,
      adminNote: withdrawals.adminNote,
      createdAt: withdrawals.createdAt,
      processedAt: withdrawals.processedAt,
    })
    .from(withdrawals)
    .leftJoin(users, eq(withdrawals.userId, users.id))
    .where(whereClause)
    .orderBy(desc(withdrawals.createdAt))
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
   * [Admin] Audit Withdrawal
   */
  static async auditWithdrawal(id: number, status: 'completed' | 'rejected', adminNote: string, operatorId: number) {
    // 1. Pre-check (Read-only, no transaction needed yet)
    const [withdrawal] = await db.select()
      .from(withdrawals)
      .where(eq(withdrawals.id, id));

    if (!withdrawal) {
      throw new ValidationError('提现申请不存在');
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new ValidationError('只能审核待处理的提现申请');
    }

    // 2. Execute Transaction (Atomic State Update with Optimistic Lock)
    await db.transaction(async (tx) => {
      // Optimistic Lock: Update only if status is still PENDING
      const [result] = await tx.update(withdrawals)
        .set({
          status,
          adminNote,
          processedAt: new Date(),
          updatedAt: new Date()
        })
        .where(and(
          eq(withdrawals.id, id),
          eq(withdrawals.status, WithdrawalStatus.PENDING)
        ));

      if (result.affectedRows === 0) {
        throw new ValidationError('该提现单已被处理或状态已变更');
      }

      // Handle Logic
      if (status === WithdrawalStatus.COMPLETED) {
        // Log Success
        await tx.insert(walletLogs).values({
          userId: withdrawal.userId,
          type: WalletLogType.WITHDRAW_SUCCESS,
          amount: 0,
          relatedType: 'withdrawal',
          relatedId: id,
          createdAt: new Date()
        });
      } else if (status === WithdrawalStatus.REJECTED) {
        if (!adminNote) {
           throw new ValidationError('驳回时必须填写备注');
        }
        // Refund Balance
        await tx.update(users)
          .set({
            balance: sql`${users.balance} + ${withdrawal.amount}`,
            updatedAt: new Date()
          })
          .where(eq(users.id, withdrawal.userId));

        // Log Unfreeze
        await tx.insert(walletLogs).values({
          userId: withdrawal.userId,
          type: WalletLogType.WITHDRAW_UNFREEZE,
          amount: withdrawal.amount,
          relatedType: 'withdrawal',
          relatedId: id,
          createdAt: new Date()
        });
      }
    });

    // 3. Post-Transaction Audit Log (Non-blocking)
    // We await it here to ensure it's logged, but it's outside the DB transaction
    await AuditService.log(
      operatorId,
      AuditActions.AUDIT_WITHDRAW,
      AuditTargets.WITHDRAWAL,
      id,
      { result: status, amount: withdrawal.amount, adminNote }
    );

    return { success: true };
  }
}
