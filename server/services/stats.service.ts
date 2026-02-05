import { db } from '../db/index.js';
import { orders, overtimeRecords, withdrawals, users } from '../db/schema.js';
import { sql, and, eq, gte, lte, inArray, isNotNull } from 'drizzle-orm';

// Helper for coalesce since it might not be exported directly from drizzle-orm main package in older versions
// or we can use sql function directly
const coalesce = <T>(...columns: any[]) => sql<T>`COALESCE(${sql.join(columns, sql`, `)})`;
import dayjs from 'dayjs';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export class StatsService {
  
  private static getDateRange(range: string, start?: string, end?: string): DateRange {
    if (start && end) {
      return { startDate: new Date(start), endDate: new Date(end) };
    }
    
    const now = dayjs();
    let startDate = now.startOf('day');
    const endDate = now.endOf('day');

    switch (range) {
      case 'week':
        startDate = now.startOf('week');
        break;
      case 'month':
        startDate = now.startOf('month');
        break;
      case 'year':
        startDate = now.startOf('year');
        break;
      case 'all':
        startDate = dayjs('2020-01-01'); // Project start
        break;
      default: // today
        startDate = now.startOf('day');
    }

    return { startDate: startDate.toDate(), endDate: endDate.toDate() };
  }

  /**
   * Get CS Performance Stats
   * List of CS agents with their completed custom order stats
   */
  static async getCSPerformance(range: string, start?: string, end?: string) {
    const { startDate, endDate } = this.getDateRange(range, start, end);

    // Group by creatorId and Join with Users
    // Filter: Custom Orders, Created by someone (CS/Admin), Completed Status
    // Time Basis: Actual End Time (Service End)
    
    // We use COALESCE(actual_end_time, service_end_time) as the service completion time
    const completionTimeCol = coalesce(orders.actualEndTime, orders.serviceEndTime);

    const list = await db
      .select({
        csId: orders.creatorId,
        csName: users.nickname,
        orderCount: sql<number>`count(${orders.id})`,
        totalAmount: sql<number>`sum(${orders.amount})`
      })
      .from(orders)
      .leftJoin(users, eq(orders.creatorId, users.id))
      .where(and(
        eq(orders.type, 'custom'),
        isNotNull(orders.creatorId),
        eq(orders.status, 'completed'),
        gte(completionTimeCol, startDate),
        lte(completionTimeCol, endDate)
      ))
      .groupBy(orders.creatorId, users.nickname)
      .orderBy(sql`sum(${orders.amount}) DESC`);

    return {
      list: list.map(item => ({
        csId: item.csId,
        csName: item.csName || 'Unknown',
        orderCount: Number(item.orderCount),
        totalAmount: Number(item.totalAmount) || 0
      }))
    };
  }

  /**
   * Get Platform Finance Stats
   * Income vs Withdrawals
   */
  static async getPlatformFinance(range: string, start?: string, end?: string) {
    const { startDate, endDate } = this.getDateRange(range, start, end);

    // Income Logic:
    // Status: completed or service_ended (since we use end time as basis)
    // Time Basis: Actual End Time (or Service End Time)
    const completionTimeCol = coalesce(orders.actualEndTime, orders.serviceEndTime);
    const incomeStatuses = ['completed', 'service_ended'];

    // 1. Summary: Total Income (Orders + Overtime)
    // Note: Overtime usually happens during service. We can simplify and just sum up all fees associated with the order 
    // when the order is completed. Or query overtime records separately.
    // For simplicity and alignment with "Order Settlement", we count Order Amount + Overtime Fee based on ORDER completion time.
    
    // However, to be precise with existing data structure:
    // Order Amount: Based on Order Completion
    // Overtime Fee: Based on Overtime Payment Time (or Creation Time if paid immediately).
    // Let's stick to the user instruction: "Order End Time is the statistical point".
    
    const [orderIncome] = await db
      .select({ total: sql<string>`sum(${orders.amount})` })
      .from(orders)
      .where(and(
        inArray(orders.status, incomeStatuses),
        gte(completionTimeCol, startDate),
        lte(completionTimeCol, endDate)
      ));

    // For Overtime, we link it to the order's completion time effectively
    // But since we can't easily join in aggregate query without complexity, 
    // let's try to sum overtime fees for orders that "ended" in this period.
    const [overtimeIncome] = await db
      .select({ total: sql<string>`sum(${overtimeRecords.fee})` })
      .from(overtimeRecords)
      .innerJoin(orders, eq(overtimeRecords.orderId, orders.id))
      .where(and(
        eq(overtimeRecords.status, 'paid'),
        gte(completionTimeCol, startDate),
        lte(completionTimeCol, endDate)
      ));

    const totalIncome = (Number(orderIncome?.total) || 0) + (Number(overtimeIncome?.total) || 0);

    // 2. Summary: Total Withdrawals (Completed)
    // Time Basis: processed_at (Audit Approval Time)
    const [withdrawResult] = await db
      .select({ total: sql<string>`sum(${withdrawals.amount})` })
      .from(withdrawals)
      .where(and(
        eq(withdrawals.status, 'completed'),
        gte(withdrawals.processedAt, startDate),
        lte(withdrawals.processedAt, endDate)
      ));
      
    const totalWithdraw = Number(withdrawResult?.total) || 0;

    // 3. Chart Data: Group by Date
    
    // Income Trend
    const incomeTrend = await db
      .select({
        date: sql<string>`DATE_FORMAT(${completionTimeCol}, '%Y-%m-%d')`,
        amount: sql<number>`sum(${orders.amount})`
      })
      .from(orders)
      .where(and(
        inArray(orders.status, incomeStatuses),
        gte(completionTimeCol, startDate),
        lte(completionTimeCol, endDate)
      ))
      .groupBy(sql`DATE_FORMAT(${completionTimeCol}, '%Y-%m-%d')`);

    // Overtime Trend (Merged into income)
    const overtimeTrend = await db
      .select({
        date: sql<string>`DATE_FORMAT(${completionTimeCol}, '%Y-%m-%d')`,
        amount: sql<number>`sum(${overtimeRecords.fee})`
      })
      .from(overtimeRecords)
      .innerJoin(orders, eq(overtimeRecords.orderId, orders.id))
      .where(and(
        eq(overtimeRecords.status, 'paid'),
        gte(completionTimeCol, startDate),
        lte(completionTimeCol, endDate)
      ))
      .groupBy(sql`DATE_FORMAT(${completionTimeCol}, '%Y-%m-%d')`);

    // Withdraw Trend
    const withdrawTrend = await db
      .select({
        date: sql<string>`DATE_FORMAT(${withdrawals.processedAt}, '%Y-%m-%d')`,
        amount: sql<number>`sum(${withdrawals.amount})`
      })
      .from(withdrawals)
      .where(and(
        eq(withdrawals.status, 'completed'),
        gte(withdrawals.processedAt, startDate),
        lte(withdrawals.processedAt, endDate)
      ))
      .groupBy(sql`DATE_FORMAT(${withdrawals.processedAt}, '%Y-%m-%d')`);

    // Merge logic
    const trendMap = new Map<string, { income: number, withdraw: number }>();
    
    // Helper to add to map
    const addToMap = (date: string, type: 'income' | 'withdraw', amount: number) => {
      const current = trendMap.get(date) || { income: 0, withdraw: 0 };
      current[type] += Number(amount);
      trendMap.set(date, current);
    };

    incomeTrend.forEach(item => addToMap(item.date, 'income', Number(item.amount)));
    overtimeTrend.forEach(item => addToMap(item.date, 'income', Number(item.amount)));
    withdrawTrend.forEach(item => addToMap(item.date, 'withdraw', Number(item.amount)));

    const chartData = Array.from(trendMap.entries())
      .map(([date, val]) => ({ date, ...val }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      summary: {
        totalIncome,
        totalWithdraw
      },
      chartData
    };
  }
}
