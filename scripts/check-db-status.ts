
import { db } from '../server/db/index.js';
import { orders } from '../server/db/schema.js';
import { sql } from 'drizzle-orm';

async function checkStatus() {
  console.log('🔍 Checking Distinct Order Statuses in DB...');
  
  const results = await db.execute(sql`SELECT DISTINCT status FROM orders`);
  
  console.log('--- DB Values ---');
  // @ts-ignore
  results[0].forEach((row: any) => {
      console.log(`Status: "${row.status}"`);
  });
  console.log('-----------------');
  
  process.exit(0);
}

checkStatus();
