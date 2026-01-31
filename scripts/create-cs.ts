import dotenv from 'dotenv';
dotenv.config();

import { db } from '../server/db';
import { users } from '../server/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function createCS() {
  const phone = '19900000001';
  const password = 'CsPassword123';
  const nickname = '客服001';

  console.log('🚀 Creating CS user...');

  try {
    // Check if user exists
    const existing = await db.select().from(users).where(eq(users.phone, phone));
    
    if (existing.length > 0) {
      console.log('⚠️ User already exists. Updating role and password...');
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Update role and password
      await db.update(users)
        .set({ 
          role: 'cs',
          password: hashedPassword 
        })
        .where(eq(users.phone, phone));
        
      console.log('✅ CS updated.');
    } else {
      // Create new CS
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await db.insert(users).values({
        phone,
        password: hashedPassword,
        nickname,
        role: 'cs',
        // avatarUrl removed in V2
        createdAt: new Date(),
      });
      
      console.log('✅ CS user created successfully.');
    }
    
    console.log(`
    Login Info:
    Phone: ${phone}
    Password: ${password}
    `);
    
  } catch (error) {
    console.error('❌ Failed to create CS:', error);
  }
  
  process.exit(0);
}

createCS();
