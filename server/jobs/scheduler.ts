import { autoCancelJob } from './auto-cancel.job';

export const startScheduler = () => {
  console.log('[Scheduler] Starting all jobs...');
  
  // Start Jobs
  autoCancelJob.start();
  
  console.log('[Scheduler] All jobs started.');
};
