
import 'dotenv/config';
import { db } from '../server/db';
import { users } from '../server/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function createAdmin() { const phone = '19999999999';
  const password = 'AdminPassword123'; // In real app, hash this!
  
  console.log(`Checking if admin exists (Phone: ${phone})...`);
  
  const existing = await db.select().from(users).where(eq(users.phone, phone));
  
  if (existing.length > 0) {
    console.log('Admin user already exists.');
    
    // Always update password and role to ensure consistency for tests
    console.log('Resetting admin password and role...');
    const hashedPassword = await bcrypt.hash(password, 12);
    await db.update(users).set({ 
        role: 'admin',
        password: hashedPassword 
    }).where(eq(users.id, existing[0].id));

  } else {
    console.log('Creating new admin user...');
    const hashedPassword = await bcrypt.hash(password, 12);
    await db.insert(users).values({
      phone,
      password: hashedPassword, // Hash the password!
      nickname: 'SuperAdmin',
      role: 'admin',
      isGuide: false
    });
    console.log('Admin user created successfully.');
  }
  
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error('Failed to create admin:', err);
  process.exit(1);
});
