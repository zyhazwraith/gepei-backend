import { db } from '../server/db';
import { users, guides } from '../server/db/schema';
import { eq } from 'drizzle-orm';

async function checkGuide(phone: string) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.phone, phone)
    });

    if (!user) {
      console.log(`User with phone ${phone} not found.`);
      process.exit(1);
    }

    console.log('User found:', { id: user.id, phone: user.phone, isGuide: user.isGuide });

    const guide = await db.query.guides.findFirst({
      where: eq(guides.userId, user.id)
    });

    if (!guide) {
      console.log('❌ No guide record found for this user.');
      // 检查是否有数据不一致 (isGuide=true 但无记录)
      if (user.isGuide) {
        console.error('⚠️ CRITICAL: Data Inconsistency detected! User.isGuide is TRUE but no Guide record exists.');
      }
    } else {
      console.log('✅ Guide record found:', { id: guide.id, name: guide.name, city: guide.city });
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

const phone = process.argv[2];
if (!phone) {
  console.error('Please provide a phone number');
  process.exit(1);
}

checkGuide(phone);
