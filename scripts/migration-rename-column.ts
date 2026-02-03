
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('🔄 Renaming completed_at to actual_end_time...');
  try {
    // Check if column exists first (optional, but safe)
    // For simplicity, just run ALTER directly. If it fails, it might be because it's already renamed.
    await db.execute(sql`ALTER TABLE orders CHANGE completed_at actual_end_time TIMESTAMP NULL DEFAULT NULL`);
    console.log('✅ Column renamed successfully');
  } catch (error: any) {
    if (error.code === 'ER_BAD_FIELD_ERROR') {
        console.log('⚠️ Column might already be renamed or does not exist.');
    } else {
        console.error('❌ Rename failed:', error);
        process.exit(1);
    }
  }
  process.exit(0);
}

main().catch(console.error);
