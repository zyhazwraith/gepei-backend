import dotenv from 'dotenv';
dotenv.config();

import { db } from '../server/db';
import { users } from '../server/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function createAdmin() {
  // 优先从环境变量读取，否则使用默认值
  const phone = process.env.ADMIN_PHONE || '19999999999';
  const password = process.env.ADMIN_PASSWORD || 'AdminPassword123';
  const nickname = process.env.ADMIN_NICKNAME || '超级管理员';

  console.log('🚀 Creating/Updating admin user...');
  console.log(`📝 Target Phone: ${phone}`);

  if (password === 'AdminPassword123' && !process.env.ADMIN_PASSWORD) {
    console.warn('⚠️  WARNING: Using default insecure password. Set ADMIN_PASSWORD env var in production!');
  }

  try {
    // Check if admin exists
    const existing = await db.select().from(users).where(eq(users.phone, phone));
    
    if (existing.length > 0) {
      console.log('⚠️ Admin user already exists. Updating password...');
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Update role and password
      await db.update(users)
        .set({ 
          role: 'admin',
          password: hashedPassword 
        })
        .where(eq(users.phone, phone));
        
      console.log('✅ Admin password updated.');
    } else {
      // Create new admin
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await db.insert(users).values({
        phone,
        password: hashedPassword,
        nickname,
        role: 'admin',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
        createdAt: new Date(),
      });
      
      console.log('✅ Admin user created successfully.');
    }
    
    console.log(`
    Login Info:
    Phone: ${phone}
    Password: ${password}
    `);
    
  } catch (error) {
    console.error('❌ Failed to create admin:', error);
  }
  
  process.exit(0);
}

createAdmin();
