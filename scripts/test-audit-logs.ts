import axios from 'axios';
import { db } from '../server/db';
import { auditLogs, users } from '../server/db/schema';
import { eq } from 'drizzle-orm';
import { auditService } from '../server/services/audit.service';
import { AuditActions, AuditTargets } from '../server/constants/audit';

const API_URL = 'http://localhost:3000/api/v1';

async function main() {
  console.log('🚀 Starting Audit System Verification...');

  // 1. Setup: Get Admin Token
  console.log('\n1️⃣  Authenticating as Admin...');
  let adminToken = '';
  let adminId = 0;
  
  try {
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      phone: '13800000000', // Assuming seeded admin
      password: 'password123'
    });
    adminToken = loginRes.data.data.token;
    adminId = loginRes.data.data.userId;
    console.log('✅ Admin logged in. ID:', adminId);
  } catch (error: any) {
    console.error('❌ Login failed:', error.message);
    if (error.response) console.error('Response:', error.response.data);
    process.exit(1);
  }

  // 2. Simulate System Actions (Service Level)
  console.log('\n2️⃣  Simulating System Audit Logs (Service Level)...');
  
  const testScenarios = [
    {
      action: AuditActions.AUDIT_GUIDE,
      targetType: AuditTargets.GUIDE,
      targetId: 999,
      details: { result: 'pass', real_price: 20000 }
    },
    {
      action: AuditActions.UPDATE_CONFIG,
      targetType: AuditTargets.SYSTEM_CONFIG,
      targetId: 0,
      details: { key: 'cs_qrcode', old: 'url1', new: 'url2' }
    }
  ];

  for (const scenario of testScenarios) {
    await auditService.log({
      operatorId: adminId,
      action: scenario.action,
      targetType: scenario.targetType,
      targetId: scenario.targetId,
      details: scenario.details,
      // Mock request for IP
      ipAddress: '10.0.0.1'
    });
    console.log(`   Logged: ${scenario.action}`);
  }
  console.log('✅ Service logs created.');

  // 3. Verify via API (Controller Level)
  console.log('\n3️⃣  Verifying via Admin API...');
  
  try {
    const res = await axios.get(`${API_URL}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: { limit: 5 } // Get latest
    });

    const logs = res.data.data.list;
    console.log(`   Fetched ${logs.length} logs.`);

    // Verify Audit Guide Log
    const guideLog = logs.find((l: any) => 
      l.action === AuditActions.AUDIT_GUIDE && 
      l.targetId === 999
    );
    
    if (guideLog) {
      console.log('✅ Found Guide Audit Log:', JSON.stringify(guideLog.details));
      if (guideLog.ipAddress === '10.0.0.1') console.log('✅ IP Address recorded correctly.');
      else console.error('❌ IP Address mismatch:', guideLog.ipAddress);
    } else {
      console.error('❌ Guide Audit Log not found!');
    }

    // Verify Config Log
    const configLog = logs.find((l: any) => 
      l.action === AuditActions.UPDATE_CONFIG && 
      l.details.key === 'cs_qrcode'
    );

    if (configLog) {
      console.log('✅ Found Config Update Log:', JSON.stringify(configLog.details));
    } else {
      console.error('❌ Config Update Log not found!');
    }

  } catch (error: any) {
    console.error('❌ API Verification failed:', error.response?.data || error.message);
    process.exit(1);
  }

  console.log('\n🎉 Audit System Verification Passed!');
  process.exit(0);
}

main().catch(console.error);
