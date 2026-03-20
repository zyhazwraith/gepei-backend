import { autoCancelJob } from './auto-cancel.job.js';
import { settleJob } from './settle.job.js';
import { paymentSyncJob } from './payment-sync.job.js';
import { refundSyncJob } from './refund-sync.job.js';

export const startScheduler = () => {
  console.log('[Scheduler] Starting all jobs...');
  
  // Start Jobs
  autoCancelJob.start();
  settleJob.start();
  paymentSyncJob.start();
  refundSyncJob.start();
  
  console.log('[Scheduler] All jobs started.');
};

export const stopScheduler = () => {
  console.log('[Scheduler] Stopping all jobs...');

  autoCancelJob.stop();
  settleJob.stop();
  paymentSyncJob.stop();
  refundSyncJob.stop();

  console.log('[Scheduler] All jobs stopped.');
};
