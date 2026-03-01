import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import { db } from '../server/db/index.js';
import { attachments } from '../server/db/schema.js';
import { eq } from 'drizzle-orm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:3000/api/v1';
const TEST_IMAGE_PATH = path.resolve(__dirname, '../tests/fixtures/test-image.png');

if (!fs.existsSync(TEST_IMAGE_PATH)) {
  throw new Error(`Missing test fixture: ${TEST_IMAGE_PATH}`);
}

// Helper to get admin token
async function getAdminToken() {
  try {
    const res = await axios.post(`${API_URL}/auth/login`, {
      phone: '19999999999',
      password: 'AdminPassword123'
    });
    return res.data.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function verifyAttachmentSystem() {
  console.log('🚀 Starting Verification for [F-0] Attachment System...');
  
  const token = await getAdminToken();
  const headers = { 
    'Authorization': `Bearer ${token}`,
    // FormData headers will be set automatically by axios/form-data
  };

  // Test 1: Upload Avatar (Overwrite Strategy)
  console.log('\nTesting Avatar Upload (Overwrite)...');
  const createAvatarForm = () => {
    const form = new FormData();
    form.append('file', fs.createReadStream(TEST_IMAGE_PATH));
    form.append('contextId', '1001'); // Mock user ID
    return form;
  };

  try {
    const formData1 = createAvatarForm();
    const res1 = await axios.post(`${API_URL}/attachments/avatar`, formData1, {
      headers: { ...headers, ...formData1.getHeaders() }
    });
    console.log('✅ Avatar Upload Success:', res1.data.data);
    
    // Verify DB
    const [row1] = await db.select().from(attachments).where(eq(attachments.key, 'avatars/u_1001.webp'));
    if (!row1) throw new Error('DB Record not found for avatar');
    console.log('✅ DB Record Verified:', row1.key);

    // Test 1.1: Upload Again (Should Update, not Insert)
    console.log('Testing Avatar Overwrite...');
    await new Promise(r => setTimeout(r, 1000)); // Wait for timestamp diff
    const formData1Again = createAvatarForm();
    await axios.post(`${API_URL}/attachments/avatar`, formData1Again, {
        headers: { ...headers, ...formData1Again.getHeaders() }
    });
    const [row2] = await db.select().from(attachments).where(eq(attachments.key, 'avatars/u_1001.webp'));
    if (row1.id !== row2.id) throw new Error('Overwrite failed: ID changed');
    if (row1.updatedAt.getTime() === row2.updatedAt.getTime()) throw new Error('Overwrite failed: updatedAt not changed');
    console.log('✅ Overwrite Verified: ID preserved, updatedAt updated');

  } catch (error: any) {
    console.error('❌ Avatar Test Failed:', error.response?.data || error.message);
  }

  // Test 2: Upload System Config (System Usage)
  console.log('\nTesting System Config Upload...');
  const formData2 = new FormData();
  formData2.append('file', fs.createReadStream(TEST_IMAGE_PATH));
  formData2.append('slot', 'qrcode');

  try {
    const res3 = await axios.post(`${API_URL}/attachments/system`, formData2, {
      headers: { ...headers, ...formData2.getHeaders() }
    });
    console.log('✅ System Upload Success:', res3.data.data);
    
    // Verify DB
    const [row3] = await db.select().from(attachments).where(eq(attachments.key, 'system/qrcode.png'));
    if (!row3) throw new Error('DB Record not found for system qrcode');
    console.log('✅ DB Record Verified:', row3.key);

  } catch (error: any) {
    console.error('❌ System Test Failed:', error.response?.data || error.message);
  }

  console.log('\n🎉 Verification Completed!');
  process.exit(0);
}

verifyAttachmentSystem();
