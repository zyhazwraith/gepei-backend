import cron from 'node-cron';
import { OrderService } from '../services/order.service';

/**
 * Auto Cancel Job
 * Frequency: Every 5 minutes
 */
export const autoCancelJob = cron.schedule('*/5 * * * *', async () => {
  console.log('[Scheduler] Running Auto Cancel Job...');
  try {
    const result = await OrderService.cancelExpiredOrders();
    // result is generic from drizzle, might contain rowsAffected depending on driver
    // For now, we just log execution
    console.log('[Scheduler] Auto Cancel Job Completed.');
  } catch (error) {
    console.error('[Scheduler] Auto Cancel Job Failed:', error);
  }
}, {
  scheduled: false // Do not start immediately, wait for manual start
});
