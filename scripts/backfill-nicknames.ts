import { db } from '../server/db';
import { users } from '../server/db/schema';
import { isNull, eq, or } from 'drizzle-orm';

async function backfillNicknames() {
  console.log('🔍 Scanning for users without nicknames...');

  // 1. 查找 nickname 为空或 null 的用户
  const targetUsers = await db.query.users.findMany({
    where: or(isNull(users.nickname), eq(users.nickname, ''))
  });

  console.log(`Found ${targetUsers.length} users needing nickname backfill.`);

  let updatedCount = 0;

  for (const user of targetUsers) {
    // 生成默认昵称
    // 格式: 用户 + 手机尾号(4位) + _ + 随机字符(4位)
    const suffix = Math.random().toString(36).substring(2, 6);
    const defaultNickname = `用户${user.phone.slice(-4)}_${suffix}`;

    console.log(`Updating user ${user.id} (${user.phone}) -> ${defaultNickname}`);

    await db.update(users)
      .set({ nickname: defaultNickname })
      .where(eq(users.id, user.id));

    updatedCount++;
  }

  console.log(`\n🎉 Backfill complete. Updated ${updatedCount} users.`);
  process.exit(0);
}

backfillNicknames().catch(e => {
  console.error(e);
  process.exit(1);
});
