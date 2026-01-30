import { sql } from 'drizzle-orm';
import { db } from '../server/db';

async function main() {
  console.log('💥 Resetting Database (Refactor Mode)...');

  try {
    // Disable Foreign Key Checks
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);

    // Get all tables
    const [rows] = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `);

    const tables = (rows as any[]).map((r) => r.TABLE_NAME || r.table_name);

    if (tables.length === 0) {
      console.log('✅ No tables found. Database is already clean.');
    } else {
      console.log(`🗑️ Dropping ${tables.length} tables: ${tables.join(', ')}`);
      for (const table of tables) {
        await db.execute(sql.raw(`DROP TABLE IF EXISTS \`${table}\``));
      }
      console.log('✅ All tables dropped.');
    }

  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  } finally {
    // Enable Foreign Key Checks (Just in case connection persists, though typically scoped)
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
    process.exit(0);
  }
}

main();
