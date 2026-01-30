import { db } from '../server/db';
import { users, guides } from '../server/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const ADMIN_PHONE = '13800000000';
const USER_PHONE = '13800138000';
const GUIDE_PHONE = '13900139000';
const PASSWORD = 'password123';

async function main() {
  console.log('🌱 Seeding T-2 Test Data...');

  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  // 1. Seed Admin
  const [existingAdmin] = await db.select().from(users).where(eq(users.phone, ADMIN_PHONE));
  if (!existingAdmin) {
    await db.insert(users).values({
      phone: ADMIN_PHONE,
      password: hashedPassword,
      nickname: 'Test Admin',
      role: 'admin',
      isGuide: false,
    });
    console.log('✅ Admin created');
  } else {
    // Ensure role is admin
    await db.update(users).set({ role: 'admin' }).where(eq(users.phone, ADMIN_PHONE));
    console.log('✅ Admin updated');
  }

  // 2. Seed User
  const [existingUser] = await db.select().from(users).where(eq(users.phone, USER_PHONE));
  if (!existingUser) {
    await db.insert(users).values({
      phone: USER_PHONE,
      password: hashedPassword,
      nickname: 'Test User',
      role: 'user',
      isGuide: false,
    });
    console.log('✅ User created');
  } else {
    console.log('✅ User already exists');
  }

  // 3. Seed Guide
  let guideUserId: number;
  const [existingGuideUser] = await db.select().from(users).where(eq(users.phone, GUIDE_PHONE));
  
  if (!existingGuideUser) {
    const [res] = await db.insert(users).values({
      phone: GUIDE_PHONE,
      password: hashedPassword,
      nickname: 'Test Guide',
      role: 'user',
      isGuide: true,
    });
    guideUserId = res.insertId;
    console.log('✅ Guide User created');
  } else {
    guideUserId = existingGuideUser.id;
    await db.update(users).set({ isGuide: true }).where(eq(users.id, guideUserId));
    console.log('✅ Guide User updated');
  }

  // Ensure Guide Profile
  const [existingGuideProfile] = await db.select().from(guides).where(eq(guides.userId, guideUserId));
  if (!existingGuideProfile) {
    await db.insert(guides).values({
      userId: guideUserId,
      name: 'Guide Alice',
      idNumber: '110101199001011234',
      city: 'Beijing',
      realPrice: 10000, // 100 Yuan
    });
    console.log('✅ Guide Profile created');
  } else {
    console.log('✅ Guide Profile already exists');
  }

  console.log('🎉 Seeding Complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seeding Failed:', err);
  process.exit(1);
});
