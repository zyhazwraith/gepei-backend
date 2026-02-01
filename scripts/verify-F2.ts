import axios from 'axios';
import { db } from '../server/db/index.js';
import { users, guides } from '../server/db/schema.js';
import { eq } from 'drizzle-orm';

const API_URL = 'http://localhost:3000/api/v1';

async function getAdminToken() {
  try {
    const res = await axios.post(`${API_URL}/auth/login`, {
      phone: '19999999999',
      password: 'AdminPassword123'
    });
    return res.data.data.token;
  } catch (error: any) {
    console.error('Admin Login failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function registerUser() {
  const phone = `18${Math.floor(Math.random() * 100000000).toString().padStart(9, '0')}`;
  const password = 'Password123';
  try {
    // Register
    await axios.post(`${API_URL}/auth/register`, {
      phone,
      password,
      nickname: 'TestGuide'
    });
    // Login
    const res = await axios.post(`${API_URL}/auth/login`, {
      phone,
      password
    });
    return { token: res.data.data.token, userId: res.data.data.userId, phone };
  } catch (error: any) {
    console.error('User Register/Login failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function verifyGuideProfile() {
  console.log('🚀 Starting Verification for [F-2] Guide Profile...');

  // 1. Prepare Users
  const guideUser = await registerUser();
  const adminToken = await getAdminToken();
  console.log(`✅ Users Created: Guide(${guideUser.userId}), Admin`);

  const guideHeaders = { 'Authorization': `Bearer ${guideUser.token}` };
  const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };

  // 2. Guide: Update Profile (LBS & Basic Info)
  console.log('\nStep 1: Guide updates profile (LBS + Price)...');
  const idNumber = `42010119900101${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  try {
    const res = await axios.put(`${API_URL}/guides/me`, {
      name: 'Test Guide Name',
      idNumber: idNumber,
      city: 'Hangzhou',
      address: 'West Lake District',
      expectedPrice: 1500, // 15.00 CNY
      latitude: 30.250000,
      longitude: 120.150000,
      intro: 'I am a test guide.'
    }, { headers: guideHeaders });

    console.log('✅ Update Response:', res.data.data);
    
    if (res.data.data.latitude !== 30.25 || res.data.data.expectedPrice !== 1500) {
      throw new Error('Response mismatch');
    }
  } catch (error: any) {
    console.error('❌ Guide Update Failed:', error.response?.data || error.message);
    process.exit(1);
  }

  // 3. Verify Status is NOT Active yet
  console.log('\nStep 2: Verifying pending status...');
  try {
    const user = await db.select().from(users).where(eq(users.id, guideUser.userId)).limit(1);
    if (user[0].isGuide) {
      throw new Error('❌ Error: Guide became active automatically!');
    }
    console.log('✅ Guide is still pending (Correct)');
  } catch (error: any) {
    console.error(error.message);
    process.exit(1);
  }

  // 4. Admin: Audit & Set Price
  console.log('\nStep 3: Admin approves guide & sets real price...');
  try {
    const res = await axios.put(`${API_URL}/admin/guides/${guideUser.userId}`, {
      is_guide: true,
      real_price: 2000 // 20.00 CNY
    }, { headers: adminHeaders });

    console.log('✅ Admin Update Response:', res.data.data);
    
    if (!res.data.data.isGuide || res.data.data.realPrice !== 2000) {
        throw new Error('Admin update mismatch');
    }
  } catch (error: any) {
    console.error('❌ Admin Update Failed:', error.response?.data || error.message);
    process.exit(1);
  }

  // 5. Final DB Verification
  console.log('\nStep 4: Final DB Check...');
  const finalGuide = await db.select().from(guides).where(eq(guides.userId, guideUser.userId)).limit(1);
  const finalUser = await db.select().from(users).where(eq(users.id, guideUser.userId)).limit(1);

  if (!finalUser[0].isGuide) console.error('❌ User isGuide is false');
  if (finalGuide[0].realPrice !== 2000) console.error('❌ Guide realPrice is wrong');
  if (!finalGuide[0].idVerifiedAt) console.error('❌ idVerifiedAt is null');

  if (finalUser[0].isGuide && finalGuide[0].realPrice === 2000 && finalGuide[0].idVerifiedAt) {
      console.log('✅ All Checks Passed!');
  } else {
      process.exit(1);
  }
  
  process.exit(0);
}

verifyGuideProfile();
