import { db } from '../server/db';
import { walletLogs } from '../server/db/schema';
import { eq } from 'drizzle-orm';

async function cleanup() {
  console.log('Deleting all logs with type "refund"...');
  
  // Note: Drizzle's delete doesn't support 'where' in all drivers the same way, 
  // but for MySQL/Postgres it's standard.
  const result = await db.delete(walletLogs).where(eq(walletLogs.type, 'refund'));
  
  console.log('Cleanup completed.');
  process.exit(0);
}

cleanup().catch(err => {
  console.error(err);
  process.exit(1);
});
