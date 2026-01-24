import { db } from '../server/db';
import { users, guides } from '../server/db/schema';
import { eq, and } from 'drizzle-orm';

async function fixDataInconsistency() {
  console.log('🔍 Scanning for data inconsistencies...');

  // 1. 查找所有 isGuide=true 的用户
  const guideUsers = await db.query.users.findMany({
    where: eq(users.isGuide, true)
  });

  console.log(`Found ${guideUsers.length} users marked as guides.`);

  let fixedCount = 0;

  for (const user of guideUsers) {
    // 2. 检查是否有对应的 guide 记录
    const guide = await db.query.guides.findFirst({
      where: eq(guides.userId, user.id)
    });

    if (!guide) {
      console.log(`⚠️ User ${user.phone} (ID: ${user.id}) is marked as guide but has no guide record.`);
      
      // 3. 修复: 重置 isGuide = false
      await db.update(users)
        .set({ isGuide: false })
        .where(eq(users.id, user.id));
        
      console.log(`   ✅ Fixed: Reset isGuide to false.`);
      fixedCount++;
    }
  }

  console.log(`\n🎉 Scan complete. Fixed ${fixedCount} inconsistencies.`);
  process.exit(0);
}

fixDataInconsistency().catch(e => {
  console.error(e);
  process.exit(1);
});
