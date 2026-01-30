import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import { db } from '../server/db/index.js';
import { systemConfigs } from '../server/db/schema.js';
import { eq } from 'drizzle-orm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:3000/api/v1';
const TEST_IMAGE_PATH = path.join(__dirname, 'test-qrcode.png');

// Create a dummy image if not exists
if (!fs.existsSync(TEST_IMAGE_PATH)) {
  const minimalPNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(TEST_IMAGE_PATH, minimalPNG);
}

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

async function verifySystemConfig() {
  console.log('🚀 Starting Verification for [F-3] System Config...');
  
  const token = await getAdminToken();
  const headers = { 'Authorization': `Bearer ${token}` };

  // 1. Upload QR Code (via Attachment API)
  console.log('\nStep 1: Uploading QR Code...');
  const formData = new FormData();
  formData.append('file', fs.createReadStream(TEST_IMAGE_PATH));
  formData.append('slot', 'qrcode');

  let qrUrl = '';
  try {
    const res = await axios.post(`${API_URL}/attachments/system`, formData, {
      headers: { ...headers, ...formData.getHeaders() }
    });
    console.log('✅ Upload Success:', res.data.data);
    qrUrl = res.data.data.url;
  } catch (error: any) {
    console.error('❌ Upload Failed:', error.response?.data || error.message);
    process.exit(1);
  }

  // 2. Update System Config (via Admin Config API)
  console.log('\nStep 2: Updating System Config...');
  try {
    const res = await axios.put(`${API_URL}/admin/system-configs`, {
      configs: [
        { key: 'cs_qrcode_url', value: qrUrl, description: 'Customer Service QR Code' },
        { key: 'cs_phone', value: '13800138000', description: 'CS Phone' }
      ]
    }, { headers });
    console.log('✅ Update Success:', res.data);
  } catch (error: any) {
    console.error('❌ Update Failed:', error.response?.data || error.message);
    process.exit(1);
  }

  // 3. Get System Config (via Public Config API)
  console.log('\nStep 3: Getting Public Configs...');
  try {
    const res = await axios.get(`${API_URL}/system-configs`, {
      params: { keys: 'cs_qrcode_url,cs_phone' }
    });
    console.log('✅ Get Success:', res.data.data);
    
    if (res.data.data.cs_qrcode_url !== qrUrl) {
      throw new Error(`QR URL mismatch: expected ${qrUrl}, got ${res.data.data.cs_qrcode_url}`);
    }
    if (res.data.data.cs_phone !== '13800138000') {
      throw new Error('Phone mismatch');
    }
    console.log('✅ Data Verification Passed');
  } catch (error: any) {
    console.error('❌ Get Failed:', error.response?.data || error.message);
    process.exit(1);
  }

  // 4. Test Whitelist (Try to get a non-whitelisted key if any, or verify whitelist behavior)
  // Let's manually insert a secret config and try to fetch it
  console.log('\nStep 4: Testing Whitelist...');
  try {
    // Direct DB insert
    await db.insert(systemConfigs).values({
        key: 'secret_admin_key',
        value: 'hidden_value',
        description: 'Should not be visible'
    }).onDuplicateKeyUpdate({ set: { value: 'hidden_value' } });

    // Try to fetch it
    const res = await axios.get(`${API_URL}/system-configs`, {
        params: { keys: 'secret_admin_key' }
    });
    
    // Should return empty object or null for that key, NOT the value
    if (res.data.data.secret_admin_key) {
        throw new Error('❌ Whitelist Failed: Secret key leaked!');
    }
    console.log('✅ Whitelist Verified: Secret key hidden');

  } catch (error: any) {
    console.error('❌ Whitelist Test Failed:', error.message);
  }

  console.log('\n🎉 Verification Completed!');
  process.exit(0);
}

verifySystemConfig();
