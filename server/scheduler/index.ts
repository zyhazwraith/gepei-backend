import { autoCancelJob } from './auto-cancel.job.js';
import { settleJob } from './settle.job.js';

export const startScheduler = () => {
  console.log('[Scheduler] Starting all jobs...');
  
  // Start Jobs
  autoCancelJob.start();
  settleJob.start();
  
  console.log('[Scheduler] All jobs started.');
};

export const stopScheduler = () => {
  console.log('[Scheduler] Stopping all jobs...');

  autoCancelJob.stop();
  settleJob.stop();

  console.log('[Scheduler] All jobs stopped.');
};
